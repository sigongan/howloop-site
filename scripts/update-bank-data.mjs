import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const registerURL = 'https://api.cdr.gov.au/cdr-register/v1/all/data-holders/brands/summary';
const businessName = /business|trust|smsf|superannuation|corporate|community|charity|commercial|farm|statutory|solicitor|real estate|body corporate/i;
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

export async function getJSON(url, version, minVersion = 3, {fetcher = fetch, wait = sleep} = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetcher(url, {
        headers: {accept: 'application/json', 'x-v': String(version), 'x-min-v': String(minVersion)},
        signal: AbortSignal.timeout(15000), redirect: 'error'
      });
    } catch (error) {
      if (attempt === 2) throw error;
      await wait(1000 * 2 ** attempt);
      continue;
    }
    if (response.ok) return response.json();
    if (attempt < 2 && (response.status === 429 || response.status >= 500)) {
      await response.body?.cancel();
      await wait(1000 * 2 ** attempt);
      continue;
    }
    throw new Error('HTTP ' + response.status);
  }
}

export function bankingBrands(register, previousCount = 0, minimumCount = 20) {
  if (!Array.isArray(register?.data)) throw new Error('Invalid CDR register response');
  const brands = register.data.filter(b => b.industries?.includes('banking')).map(b => ({
    ...b, dataHolderBrandId: b.dataHolderBrandId ?? (b.interimId ? 'interim-' + b.interimId : null)
  }));
  const ids = new Set();
  for (const b of brands) {
    if (typeof b.dataHolderBrandId !== 'string' || !/^[a-zA-Z0-9-]+$/.test(b.dataHolderBrandId) || ids.has(b.dataHolderBrandId) || typeof b.brandName !== 'string' || !b.brandName.trim()) {
      throw new Error('Invalid or duplicate banking brand in the register');
    }
    ids.add(b.dataHolderBrandId);
  }
  if (brands.length < Math.max(minimumCount, Math.ceil(previousCount * 0.8))) {
    throw new Error('Unexpectedly small CDR register response');
  }
  return brands.sort((a, b) => a.brandName.localeCompare(b.brandName));
}

function productSnapshot(data, expectedId, source) {
  if (data?.productId !== expectedId || typeof data.name !== 'string' || !data.name.trim() || data.productCategory !== 'TRANS_AND_SAVINGS_ACCOUNTS') {
    throw new Error('Invalid product details');
  }
  for (const key of ['depositRates', 'fees', 'eligibility', 'constraints', 'features']) {
    if (data[key] !== undefined && !Array.isArray(data[key])) throw new Error('Invalid product ' + key);
  }
  for (const rate of data.depositRates ?? []) {
    // CDR rates are decimal fractions. Reject missing values and implausible
    // savings rates instead of treating malformed data as zero.
    if (!rate || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(rate.rate)) || !Number.isFinite(Number(rate.rate)) || Number(rate.rate) > 1 || typeof rate.depositRateType !== 'string') {
      throw new Error('Invalid deposit rate');
    }
  }
  if (!data.depositRates?.length) return null;
  return {
    id: data.productId, name: data.name, description: data.description,
    url: data.additionalInformation?.overviewUri ?? data.additionalInformation?.termsUri ?? null,
    lastUpdated: data.lastUpdated, source, depositRates: data.depositRates,
    fees: data.fees ?? [], eligibility: data.eligibility ?? [], constraints: data.constraints ?? [],
    features: data.features ?? [], additionalInformation: data.additionalInformation
  };
}

export async function refreshBank(brand, previous, {request = getJSON, now = new Date().toISOString()} = {}) {
  const bank = {
    id: brand.dataHolderBrandId, name: brand.brandName, baseUri: brand.publicBaseUri,
    checkedAt: null, lastAttempt: now, status: 'unavailable', products: []
  };
  try {
    const base = new URL(brand.publicBaseUri);
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('Unsupported provider URL');
    const endpoint = base.href.replace(/\/$/, '') + '/cds-au/v1/banking/products';
    let url = endpoint + '?product-category=TRANS_AND_SAVINGS_ACCOUNTS&effective=CURRENT&page-size=100';
    const pages = new Set(), listed = new Map();
    while (url) {
      const next = new URL(url, base);
      if (next.origin !== base.origin || next.pathname !== new URL(endpoint).pathname || next.username || next.password || next.hash) throw new Error('Unexpected pagination URL');
      if (pages.has(next.href) || pages.size >= 20) throw new Error('Invalid product pagination');
      pages.add(next.href);
      const payload = await request(next.href, 5);
      if (!Array.isArray(payload?.data?.products)) throw new Error('Invalid products payload');
      for (const product of payload.data.products) {
        if (typeof product?.productId !== 'string' || !product.productId || typeof product.name !== 'string') throw new Error('Invalid listed product');
        if (listed.has(product.productId)) throw new Error('Duplicate product across pages');
        listed.set(product.productId, product);
      }
      if (payload.links?.next !== undefined && payload.links.next !== null && typeof payload.links.next !== 'string') throw new Error('Invalid next page');
      url = payload.links?.next || null;
      if (!url && payload.meta?.totalRecords !== undefined && payload.meta.totalRecords !== listed.size) throw new Error('Incomplete product pagination');
    }
    const candidates = [...listed.values()].filter(p => p.isTailored !== true && !businessName.test(p.name));
    const products = [];
    for (const product of candidates) {
      const source = endpoint + '/' + encodeURIComponent(product.productId);
      const detail = await request(source, 7);
      const snapshot = productSnapshot(detail?.data, product.productId, source);
      if (snapshot) products.push(snapshot);
    }
    // One failed detail must not erase the other saved products for this bank.
    bank.products = products.sort((a, b) => a.id.localeCompare(b.id));
    bank.status = 'available';
    bank.checkedAt = now;
  } catch (error) {
    bank.error = error instanceof Error ? error.message : 'Provider request failed';
    if (Array.isArray(previous?.products) && previous.products.length && validDate(previous.checkedAt)) {
      bank.products = previous.products;
      bank.checkedAt = previous.checkedAt;
      bank.status = 'stale';
    }
  }
  return bank;
}

export function assertRefreshHealth(banks, previousBanks = []) {
  const fresh = banks.filter(b => b.status === 'available');
  const previousWithProducts = previousBanks.filter(b => b.productCount > 0 && banks.some(next => next.id === b.id));
  const refreshedExisting = previousWithProducts.filter(b => fresh.some(next => next.id === b.id));
  if (fresh.length < Math.ceil(banks.length * 0.5) || !fresh.length || refreshedExisting.length < Math.ceil(previousWithProducts.length * 0.7)) {
    throw new Error('Too many provider refreshes failed; no snapshots will be published');
  }
  const before = previousBanks.reduce((sum, b) => sum + b.productCount, 0);
  const after = banks.reduce((sum, b) => sum + b.products.length, 0);
  if (!after || after < before * 0.7) throw new Error('Unexpected loss of deposit products; no snapshots will be published');
}

export async function refreshDataset({previousManifest = {banks: []}, previousSnapshots = new Map(), request = getJSON, now = new Date().toISOString(), minimumBrands = 20, log = () => {}} = {}) {
  const brands = bankingBrands(await request(registerURL, 2, 1), previousManifest.banks.length, minimumBrands);
  const banks = new Array(brands.length);
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(5, brands.length)}, async () => {
    while (cursor < brands.length) {
      const index = cursor++, brand = brands[index];
      const bank = await refreshBank(brand, previousSnapshots.get(brand.dataHolderBrandId), {request, now});
      banks[index] = bank;
      log(bank.name + ': ' + bank.status + ' (' + bank.products.length + ' products)' + (bank.error ? ' - ' + bank.error : ''));
    }
  }));
  assertRefreshHealth(banks, previousManifest.banks);
  return {
    banks,
    metadata: {
      fetchedAt: now, source: registerURL,
      refresh: {
        freshBanks: banks.filter(b => b.status === 'available').length,
        retainedBanks: banks.filter(b => b.status === 'stale').length,
        unavailableBanks: banks.filter(b => b.status === 'unavailable').length
      },
      banks: banks.map(({products, ...bank}) => ({...bank, productCount: products.length}))
    }
  };
}

async function readJSON(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function writeDataset(directory, {banks, metadata}) {
  const files = banks.map(({id, name, checkedAt, lastAttempt, status, products}) => [
    path.join(directory, 'public/data/banks', id + '.json'), {name, checkedAt, lastAttempt, status, products}
  ]);
  files.push([path.join(directory, 'src/data/banks.json'), metadata], [path.join(directory, 'public/data/banks.json'), metadata]);
  // Stage all JSON files before replacing file names. CI commits only after
  // the complete refresh and site validation pass.
  for (const [file, value] of files) {
    await fs.mkdir(path.dirname(file), {recursive: true});
    await fs.writeFile(file + '.tmp', JSON.stringify(value, null, 2) + '\n');
  }
  for (const [file] of files) await fs.rename(file + '.tmp', file);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--output-dir')) throw new Error('Usage: npm run refresh:rates -- [--output-dir DIRECTORY]');
  const directory = args[1] ? path.resolve(args[1]) : root;
  const previousManifest = await readJSON(path.join(root, 'src/data/banks.json')) ?? {banks: []};
  const previousSnapshots = new Map();
  for (const bank of previousManifest.banks) {
    if (!/^[a-zA-Z0-9-]+$/.test(bank.id)) throw new Error('Invalid saved bank ID');
    previousSnapshots.set(bank.id, await readJSON(path.join(root, 'public/data/banks', bank.id + '.json')));
  }
  const result = await refreshDataset({previousManifest, previousSnapshots, log: console.log});
  await writeDataset(directory, result);
  const counts = result.metadata.refresh;
  const summary = 'Bank product refresh: ' + counts.freshBanks + ' retrieved, ' + counts.retainedBanks + ' using earlier data, ' + counts.unavailableBanks + ' unavailable.\n\nAttempt: ' + result.metadata.fetchedAt + '. Per-bank retrieval dates are preserved on failure.\n';
  console.log(summary);
  if (counts.retainedBanks) console.log('::warning::Some bank feeds failed. Earlier snapshots retain their original dates and cannot be automatically applied in the calculator.');
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(async error => {
    console.error('Bank refresh failed:', error.message);
    if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, 'Bank refresh failed. No data commit was published. Inspect the failed step and retry after resolving the cause.\n');
    process.exitCode = 1;
  });
}
