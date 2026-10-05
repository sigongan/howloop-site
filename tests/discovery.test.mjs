import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { isIndexableRoute } from '../src/lib/search-indexing.mjs';
import { initLessonSearch, normaliseLessonQuery } from '../src/scripts/lesson-search.mjs';
import { createTimingExampleModel } from '../src/lib/cash-flow-examples.mjs';
import { calculateCashFlow } from '../src/lib/cash-flow.mjs';
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('unfinished paid concept is excluded while the working free tool stays indexable', () => {
  for (const path of ['/products/payday-planner','/products/payday-planner/','/404','/404.html','/guides/','/guides/old-guide/','/topics/home/','/desk/','/trade/catalog/']) assert.equal(isIndexableRoute(path), false, path);
  for (const path of ['/','/tools/cash-flow/','/learn/','/learn/how-compound-interest-works/','/start/','/calculators/','/languages/ko/','/products/future-finished-product/']) assert.equal(isIndexableRoute(path), true, path);
});

test('layout, sitemap and readiness share an explicit indexability policy', () => {
  assert.match(read('astro.config.mjs'), /filter:.*isIndexableRoute\(new URL\(page\)\.pathname\)/);
  assert.match(read('src/layouts/Base.astro'), /noindex = !isIndexableRoute\(Astro.url.pathname\)/);
  assert.match(read('scripts/check-readiness.mjs'), /const excluded = !isIndexableRoute\(route\)/);
  assert.match(read('src/pages/products/payday-planner.astro'), /noindex=\{true\}/);
});

test('all-tools navigation goes to the complete directory and the planner has persistent links', () => {
  const header = read('src/components/Header.astro');
  assert.match(header, /class="hl-all-tools" href="\/start\/"/);
  assert.match(header, /<a href="\/start\/">All tools/);
  assert.match(read('src/components/TaskPicker.astro'), /href:'\/tools\/cash-flow\/'/);
  assert.match(read('src/components/Footer.astro'), /href="\/tools\/cash-flow\/"/);
});

test('fixed case study exposes the pre-payday shortfall and correct 91-day totals', () => {
  const model = createTimingExampleModel();
  const result = calculateCashFlow(model);
  assert.equal(result.startDate, '2026-10-05');
  assert.equal(result.endDate, '2027-01-03');
  assert.deepEqual(result.days.slice(0,5).map(day => day.closingBalanceCents), [-25000,-25000,-43000,-52500,297500]);
  assert.deepEqual(result.minimumClosingBalance, {amountCents:-52500,date:'2026-10-08'});
  // Independently counted payment occurrences over this fixed calendar.
  assert.equal(result.totalIncomeCents, (7 * 3500 + 3 * 1400) * 100);
  assert.equal(result.totalExpenseCents, (13 * 650 + 13 * 180 + 7 * 95 + 3 * 220 + 1100) * 100);
  assert.equal(result.closingBalanceCents, 1588500);
  assert.equal(result.closingBalanceCents, result.openingBalanceCents + result.totalIncomeCents - result.totalExpenseCents);
});

test('example factories do not retain edits or depend on the date of a visit', () => {
  const one = createTimingExampleModel();
  one.income[0].amount = '999';
  one.bills.splice(0, 1);
  const two = createTimingExampleModel();
  assert.equal(two.income[0].amount, '3500.00');
  assert.equal(two.bills.length, 5);
  assert.equal(two.startDate, '2026-10-05');
});

test('worked-example content and input provenance render server-side without personal data', () => {
  const component = read('src/components/CashFlowWalkthrough.astro');
  assert.match(component, /firstPayments.map/);
  assert.match(component, /model.income,...model.bills/);
  assert.match(component, /example stays fixed when you edit/);
  assert.match(component, /not a typical household budget/);
  assert.match(component, /no financial-adviser review/);
  assert.doesNotMatch(component, /fetch\(|localStorage|location.search|location.hash/);
  assert.match(read('src/pages/tools/cash-flow.astro'), /data-cash-timing hidden/);
});

function fixture() {
  const dom = new JSDOM(`<label data-lesson-controls hidden><input type="search"></label><p data-lesson-status role="status"></p><div class="lesson-group"><a data-lesson-search="salary including super">Salary</a><a data-lesson-search="compound interest savings">Savings</a></div><div class="lesson-group"><a data-lesson-search="home deposit loan">Home deposit</a></div><p data-lesson-empty hidden>No matching guides</p>`);
  const doc = dom.window.document;
  const input = doc.querySelector('input');
  const query = value => { input.value = value; input.dispatchEvent(new dom.window.Event('input')); };
  return {dom,doc,input,query,visible:()=>[...doc.querySelectorAll('[data-lesson-search]')].filter(card=>!card.hidden).map(card=>card.textContent)};
}

test('search is not exposed until enhanced; all guide links exist without JavaScript', () => {
  const f = fixture();
  assert.equal(f.doc.querySelector('[data-lesson-controls]').hidden,true);
  assert.equal(f.visible().length,3);
  initLessonSearch(f.doc);
  assert.equal(f.doc.querySelector('[data-lesson-controls]').hidden,false);
  assert.equal(f.doc.querySelector('[data-lesson-status]').textContent,'3 guides to explore.');
  assert.match(read('src/pages/learn/index.astro'), /data-lesson-controls hidden/);
  f.dom.window.close();
});

test('multiple terms match regardless of order, casing or accent marks', () => {
  const f = fixture();initLessonSearch(f.doc);
  f.query('  SUPER   sálary  ');
  assert.deepEqual(f.visible(),['Salary']);
  assert.equal(f.doc.querySelector('[data-lesson-status]').textContent,'1 guide found.');
  assert.equal(f.doc.querySelectorAll('.lesson-group')[1].hidden,true);
  assert.equal(normaliseLessonQuery(' SÁlary '),'salary');
  f.dom.window.close();
});

test('no-results is announced and Escape restores all groups without moving focus', () => {
  const f = fixture();initLessonSearch(f.doc);f.input.focus();f.query('no matching phrase');
  assert.deepEqual(f.visible(),[]);
  assert.equal(f.doc.querySelector('[data-lesson-empty]').hidden,false);
  assert.equal(f.doc.querySelector('[data-lesson-status]').textContent,'0 guides found.');
  f.input.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'Escape'}));
  assert.equal(f.input.value,'');assert.equal(f.visible().length,3);
  assert.equal(f.doc.querySelector('[data-lesson-empty]').hidden,true);
  assert.equal(f.doc.activeElement,f.input);
  assert.ok([...f.doc.querySelectorAll('.lesson-group')].every(group=>!group.hidden));
  f.dom.window.close();
});

test('repeated initialization and pages without the search controls are safe', () => {
  const f = fixture();initLessonSearch(f.doc);initLessonSearch(f.doc);f.query('home');
  assert.deepEqual(f.visible(),['Home deposit']);
  f.doc.querySelector('[data-lesson-controls]').remove();
  assert.doesNotThrow(()=>initLessonSearch(f.doc));
  f.dom.window.close();
});


test('publisher description has no unsupported qualification and correction is public', () => {
  const about = read('src/pages/about.astro');
  assert.doesNotMatch(about, /finance graduate|financial[- ]adviser registration.{0,10}(?:held|qualified)/i);
  assert.match(about, /does not claim financial-adviser or tax-agent registration/);
  assert.match(read('src/pages/updates.astro'), /removing an unsupported educational-qualification claim/);
  assert.match(read('src/pages/updates.astro'), /do not advance the financial-rule source-check dates/);
});


test('archived TFN corrections narrow lawful sharing and Services Australia eligibility', () => {
  const text = read('src/content/guides/apply-for-an-australian-tfn.mdx');
  assert.doesNotMatch(text, /ever need your TFN/);
  assert.match(text, /recipient is legally allowed to collect it/);
  assert.match(text, /Services Australia — eligible customers only/);
  assert.match(text, /do not mean every step in this archived guide was reviewed again/);
  assert.match(text, /www.oaic.gov.au/);
});
