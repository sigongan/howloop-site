import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE, SELLER_NOTE, calculate, validateProduct, dimensions, makeTitle, makeDescription, issues, reviewCsv, parseCatalog, sampleOrder, advanceOrder } from '../public/trade/engine.js';

test('sample economics account for shipping, fees, reserve and other costs', () => {
  assert.deepEqual(calculate(SAMPLE), { landed: 8, fee: 5.89, reserve: 2, profit: 23.01, margin: 57.67, total: 16.89 });
  assert.ok(calculate({ ...SAMPLE, shipping: 40 }).profit < 0);
});
test('invalid and missing monetary inputs never generate misleading profits', () => {
  for (const price of [0, '', null, -1, Infinity, 'abc', true]) assert.throws(() => calculate({ ...SAMPLE, price }));
  assert.throws(() => calculate({ ...SAMPLE, feePercent: 101 }));
  assert.throws(() => calculate({ ...SAMPLE, sourceCost: -1 }));
});
test('unknown dimensions remain unknown; verified input converts mm to inches', () => {
  assert.match(dimensions(SAMPLE), /not verified/);
  assert.match(dimensions({ ...SAMPLE, length: 25.4, diameter: 12.7 }), /1.00 in.*0.50 in/);
  assert.ok(issues({ ...SAMPLE, weight: 400, shipping: 5.5 }).some(s => s.includes('400g')));
  assert.ok(issues({ ...SAMPLE, shipping: 5.5 }).some(s => s.includes('$10')));
});
test('HTML and spreadsheet cells treat imported strings as data', () => {
  const p = { ...SAMPLE, name: '<img src=x onerror=alert(1)>', equipment: '=HYPERLINK("https://example.com")' };
  assert.doesNotMatch(makeDescription(p), /<img/);
  assert.match(makeDescription(p), /&lt;img/);
  assert.ok(reviewCsv([p]).includes("'="));
  assert.ok(reviewCsv([SAMPLE]).startsWith('\uFEFF'));
  assert.match(reviewCsv([SAMPLE]), /DRAFT_NOT_FOR_UPLOAD/);
  assert.doesNotMatch(reviewCsv([SAMPLE]).split('\r\n')[0], /Action/);
  assert.ok([...makeTitle(SAMPLE)].length <= 80);
});
test('catalog import validates shape, IDs, numeric fields and URLs before replacement', () => {
  const raw = JSON.stringify({ version: 1, catalog: [SAMPLE] });
  assert.deepEqual(parseCatalog(raw), [SAMPLE]);
  assert.throws(() => parseCatalog(JSON.stringify({ version: 1, catalog: [SAMPLE, SAMPLE] })));
  assert.throws(() => parseCatalog('{broken'));
  assert.throws(() => validateProduct({ ...SAMPLE, sourceUrl: 'javascript:alert(1)' }));
  assert.throws(() => validateProduct({ ...SAMPLE, sourceUrl: 'https://user:password@example.com' }));
  assert.throws(() => validateProduct({ ...SAMPLE, id: '<script>' }));
});
test('sample order stops for review and never produces a real tracking ID', () => {
  const first = sampleOrder(SAMPLE);
  assert.equal(first.status, 'awaiting_manual_review');
  assert.equal(first.note, SELLER_NOTE);
  assert.equal(first.tracking, null);
  const prepared = advanceOrder(first), tracked = advanceOrder(prepared);
  assert.equal(first.status, 'awaiting_manual_review');
  assert.equal(tracked.status, 'simulated_tracking_prepared');
  assert.equal(tracked.tracking, 'TEST-NOT-A-CARRIER-ID');
  assert.throws(() => advanceOrder(tracked));
  assert.throws(() => advanceOrder({ ...first, simulation: false }));
});
