import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {getJSON, bankingBrands, refreshBank, refreshDataset, assertRefreshHealth, writeDataset, registerURL} from '../scripts/update-bank-data.mjs';
import {bankFreshness} from '../src/lib/bank-freshness.mjs';

const now = '2026-09-21T00:00:00.000Z';
const checkedAt = '2026-09-18T00:00:00.000Z';
const brand = {dataHolderBrandId: 'example-bank', brandName: 'Example Bank', industries: ['banking'], publicBaseUri: 'https://bank.example'};
const product = (id = 'saver', rate = '0.045') => ({productId: id, name: id, productCategory: 'TRANS_AND_SAVINGS_ACCOUNTS', depositRates: [{depositRateType: 'VARIABLE', rate}]});
const saved = {name: brand.brandName, checkedAt, status: 'available', products: [{id: 'old', name: 'Earlier product', depositRates: [{depositRateType: 'VARIABLE', rate: '0.04'}], source: 'https://bank.example/product'}]};
const listing = products => ({data: {products}, links: {}, meta: {totalRecords: products.length}});
const failed = async () => { throw new Error('Provider timeout'); };

test('complete retrieval replaces the bank and keeps zero interest as valid data', async () => {
  const request = async url => url.includes('?') ? listing([product('zero')]) : {data: product('zero', '0.0000')};
  const result = await refreshBank(brand, saved, {request, now});
  assert.equal(result.status, 'available');
  assert.equal(result.checkedAt, now);
  assert.equal(result.lastAttempt, now);
  assert.equal(result.products[0].depositRates[0].rate, '0.0000');
  assert.equal(result.products[0].source, 'https://bank.example/cds-au/v1/banking/products/zero');
});

test('one failed product detail preserves the entire earlier snapshot and date', async () => {
  const original = structuredClone(saved);
  const request = async url => {
    if (url.includes('?')) return listing([product('one'), product('two')]);
    if (url.endsWith('/one')) return {data: product('one')};
    return failed();
  };
  const result = await refreshBank(brand, saved, {request, now});
  assert.equal(result.status, 'stale');
  assert.equal(result.checkedAt, checkedAt);
  assert.equal(result.lastAttempt, now);
  assert.deepEqual(result.products, saved.products);
  assert.deepEqual(saved, original);
});

test('provider outage with no saved data does not invent a retrieval date', async () => {
  const result = await refreshBank(brand, null, {request: failed, now});
  assert.equal(result.status, 'unavailable');
  assert.equal(result.checkedAt, null);
  assert.equal(result.lastAttempt, now);
  assert.deepEqual(result.products, []);
});

test('a complete empty response retires old products instead of treating it as an outage', async () => {
  const result = await refreshBank(brand, saved, {request: async () => listing([]), now});
  assert.equal(result.status, 'available');
  assert.equal(result.checkedAt, now);
  assert.deepEqual(result.products, []);
});

test('malformed and implausible rates cannot replace saved products', async () => {
  for (const rate of [null, undefined, '', ' ', 'NaN', 'Infinity', '0x10', '-0.03', '4.5']) {
    const request = async url => url.includes('?') ? listing([product()]) : {data: {...product(), depositRates: [{depositRateType: 'VARIABLE', rate}]}};
    const result = await refreshBank(brand, saved, {request, now});
    assert.equal(result.status, 'stale', 'Rejected rate: ' + String(rate));
    assert.deepEqual(result.products, saved.products);
  }
});

test('mismatched product IDs and wrong product categories are rejected', async () => {
  for (const detail of [product('wrong'), {...product(), productCategory: 'CRED_AND_CHRG_CARDS'}]) {
    const result = await refreshBank(brand, saved, {request: async url => url.includes('?') ? listing([product()]) : {data: detail}, now});
    assert.equal(result.status, 'stale');
    assert.equal(result.checkedAt, checkedAt);
  }
});

test('pagination must finish on the same HTTPS product endpoint', async () => {
  for (const next of ['https://other.example/products', 'http://bank.example/cds-au/v1/banking/products?page=2', 'https://bank.example/other', 123]) {
    let calls = 0;
    const request = async () => { calls++; return {data: {products: [product()]}, links: {next}}; };
    const result = await refreshBank(brand, saved, {request, now});
    assert.equal(result.status, 'stale');
    assert.equal(calls, 1);
  }
});

test('incomplete page totals, duplicate products and pagination loops retain earlier data', async () => {
  const firstURL = 'https://bank.example/cds-au/v1/banking/products?product-category=TRANS_AND_SAVINGS_ACCOUNTS&effective=CURRENT&page-size=100';
  for (const payload of [
    {data: {products: [product()]}, meta: {totalRecords: 2}},
    listing([product(), product()]),
    {data: {products: [product()]}, links: {next: firstURL}}
  ]) {
    const result = await refreshBank(brand, saved, {request: async () => payload, now});
    assert.equal(result.status, 'stale');
  }
});

test('valid multiple pages collect all products before replacing the bank', async () => {
  const request = async url => {
    if (url.includes('page=2')) return {data: {products: [product('second')]}, meta: {totalRecords: 2}};
    if (url.includes('?')) return {data: {products: [product('first')]}, links: {next: 'https://bank.example/cds-au/v1/banking/products?page=2'}, meta: {totalRecords: 2}};
    return {data: product(url.split('/').at(-1))};
  };
  const result = await refreshBank(brand, saved, {request, now});
  assert.equal(result.status, 'available');
  assert.deepEqual(result.products.map(p => p.id), ['first', 'second']);
});

test('register guards reject suspicious coverage and duplicate IDs', () => {
  const brands = Array.from({length: 20}, (_, index) => ({...brand, dataHolderBrandId: 'bank-' + index}));
  assert.equal(bankingBrands({data: brands}).length, 20);
  assert.throws(() => bankingBrands({data: brands.slice(1)}), /small/);
  assert.throws(() => bankingBrands({data: brands}, 30), /small/);
  assert.throws(() => bankingBrands({data: [...brands, brands[0]]}), /duplicate/);
  assert.throws(() => bankingBrands({data: {...brands}}), /Invalid/);
  assert.throws(() => bankingBrands({data: [{...brand, dataHolderBrandId: '../unsafe'}]}, 0, 1), /Invalid/);
});

test('transient HTTP errors retry, while permanent errors stop immediately', async () => {
  let calls = 0;
  const delays = [];
  const result = await getJSON('https://bank.example', 5, 3, {
    fetcher: async () => (++calls < 3 ? new Response('', {status: calls === 1 ? 429 : 503}) : Response.json({ok: true})),
    wait: async ms => { delays.push(ms); }
  });
  assert.deepEqual(result, {ok: true});
  assert.equal(calls, 3);
  assert.deepEqual(delays, [1000, 2000]);
  calls = 0;
  await assert.rejects(getJSON('https://bank.example', 5, 3, {fetcher: async () => { calls++; return new Response('', {status: 404}); }, wait: async () => {}}), /404/);
  assert.equal(calls, 1);
});

test('network failures have a bounded retry count', async () => {
  let calls = 0;
  await assert.rejects(getJSON('https://bank.example', 5, 3, {fetcher: async () => { calls++; throw new Error('offline'); }, wait: async () => {}}), /offline/);
  assert.equal(calls, 3);
});

test('health gates stop broad provider outages and unexpected product loss', () => {
  const previous = Array.from({length: 10}, (_, id) => ({id: String(id), productCount: 10}));
  const banks = previous.map(b => ({id: b.id, status: 'available', products: Array(10).fill({})}));
  assert.doesNotThrow(() => assertRefreshHealth(banks, previous));
  assert.throws(() => assertRefreshHealth(banks.map((b, i) => ({...b, status: i < 6 ? 'available' : 'stale'})), previous), /Too many/);
  assert.throws(() => assertRefreshHealth(banks.map(b => ({...b, products: [{}]})), previous), /loss/);
  assert.throws(() => assertRefreshHealth([]), /Too many/);
});

test('dataset refresh preserves failed banks and writes matching source/public manifests', async t => {
  const brands = Array.from({length: 4}, (_, index) => ({...brand, dataHolderBrandId: 'bank-' + index, brandName: 'Bank ' + index, publicBaseUri: 'https://bank' + index + '.example'}));
  const request = async url => {
    if (url === registerURL) return {data: brands};
    if (url.includes('bank3.example')) return failed();
    return url.includes('?') ? listing([product()]) : {data: product()};
  };
  const previousManifest = {banks: brands.map(b => ({id: b.dataHolderBrandId, productCount: 1}))};
  const result = await refreshDataset({previousManifest, previousSnapshots: new Map(brands.map(b => [b.dataHolderBrandId, saved])), request, now, minimumBrands: 4});
  assert.deepEqual(result.metadata.refresh, {freshBanks: 3, retainedBanks: 1, unavailableBanks: 0});
  assert.equal(result.metadata.banks[3].checkedAt, checkedAt);
  assert.equal(result.metadata.banks[3].lastAttempt, now);
  const testRoot = path.resolve(process.env.HOWLOOP_TEST_TMP ?? os.tmpdir());
  const dir = await fs.mkdtemp(path.join(testRoot, 'howloop-bank-test-'));
  assert.equal(path.dirname(dir), testRoot);
  t.after(() => fs.rm(dir, {recursive: true, force: true}));
  await writeDataset(dir, result);
  const source = await fs.readFile(path.join(dir, 'src/data/banks.json'), 'utf8');
  assert.equal(source, await fs.readFile(path.join(dir, 'public/data/banks.json'), 'utf8'));
  const snapshot = JSON.parse(await fs.readFile(path.join(dir, 'public/data/banks/bank-3.json'), 'utf8'));
  assert.deepEqual(snapshot.products, saved.products);
  assert.equal(snapshot.status, 'stale');
  assert.equal(snapshot.checkedAt, checkedAt);
});

test('failed overall refresh returns no publishable dataset', async () => {
  const brands = Array.from({length: 4}, (_, id) => ({...brand, dataHolderBrandId: 'bank-' + id}));
  await assert.rejects(refreshDataset({request: async url => url === registerURL ? {data: brands} : failed(), minimumBrands: 4, now}), /Too many/);
});

test('rate application requires successful, dated data within seven days', () => {
  const time = Date.parse(now);
  assert.equal(bankFreshness(saved, time).usable, true);
  for (const snapshot of [
    {...saved, status: 'stale'}, {...saved, status: 'partial'}, {...saved, status: 'unavailable'},
    {...saved, checkedAt: null}, {...saved, checkedAt: 'invalid'}, {...saved, checkedAt: '2026-09-22T00:00:00Z'},
    {...saved, checkedAt: '2026-09-13T00:00:00Z'}
  ]) assert.equal(bankFreshness(snapshot, time).usable, false);
  assert.equal(bankFreshness({...saved, checkedAt: '2026-09-14T00:00:00Z'}, time).usable, true);
  assert.match(bankFreshness({...saved, status: 'stale'}, time).note, /Latest refresh failed/);
  assert.equal(bankFreshness({...saved, checkedAt: null}, time).date, null);
  assert.doesNotMatch(bankFreshness({...saved, checkedAt: null}, time).note, /1970|Invalid Date/);
});
