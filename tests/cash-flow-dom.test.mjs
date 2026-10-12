import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { initCashFlow, CASH_FLOW_STORAGE_KEY } from '../src/scripts/cash-flow.mjs';
import { ANALYTICS_CHOICE_KEY } from '../src/scripts/analytics-consent.mjs';

// Exercise the real controller against the page's static control structure.
// Astro rendering and the emitted client bundle are checked separately by build.
const template = (await fs.readFile(new URL('../src/pages/tools/cash-flow.astro',import.meta.url),'utf8')).split('---').slice(2).join('---');
function setup() {
  const dom=new JSDOM(template,{url:'https://howloop.how/tools/cash-flow/'});
  const win=dom.window;const doc=win.document;
  win.confirm=()=>true;win.print=()=>{};
  const events=[];win.gtag=(...event)=>events.push(event);win['ga-disable-G-TEST123']=false;
  const consent=doc.createElement('div');consent.dataset.analyticsConsent='';consent.dataset.measurementId='G-TEST123';doc.body.append(consent);
  win.localStorage.setItem(ANALYTICS_CHOICE_KEY,JSON.stringify({version:1,choice:'accepted',recordedAt:'2026-10-04T00:00:00Z'}));
  initCashFlow(doc,win);
  const el=suffix=>doc.querySelector(`[data-cash-${suffix}]`);
  const fill=(name,value)=>{const input=doc.querySelector(`[name="${name}"]`);input.value=value;input.dispatchEvent(new win.Event('input',{bubbles:true}));};
  const submit=()=>el('form').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
  return {dom,win,doc,events,el,fill,submit};
}
test('initial example renders 91 days and 13 weeks without counting an activation or saving a plan',()=>{
  const f=setup();assert.equal(f.el('inputs').hidden,false);assert.equal(f.el('weeks').children.length,13);assert.equal(f.el('days').children.length,91);
  assert.equal(f.win.localStorage.getItem(CASH_FLOW_STORAGE_KEY),null);assert.deepEqual(f.events,[]);assert.equal(f.el('export').disabled,false);
  f.dom.window.close();
});
test('editing marks results stale; invalid and then corrected amount updates are safe',()=>{
  const f=setup();const before=f.el('closing').textContent;
  f.fill('openingBalance','1e9');assert.equal(f.el('export').disabled,true);assert.match(f.el('status').textContent,/Inputs changed/);
  f.submit();assert.equal(f.el('closing').textContent,before);assert.equal(f.el('error').hidden,false);assert.equal(f.doc.activeElement.name,'openingBalance');assert.deepEqual(f.events,[]);
  f.fill('openingBalance','1234.56');f.submit();assert.equal(f.el('error').hidden,true);assert.equal(f.el('export').disabled,false);assert.equal(f.events.length,1);assert.equal(f.events[0][2].mode,'sample');assert.equal(f.win.localStorage.getItem(CASH_FLOW_STORAGE_KEY),null);
  assert.equal(f.doc.activeElement.id,'cash-result-title');f.dom.window.close();
});
test('manual save, reload, restore, cancellation, delete and corrupted data preserve intended working state',()=>{
  const f=setup();f.fill('openingBalance','777.77');f.el('save').click();const saved=f.win.localStorage.getItem(CASH_FLOW_STORAGE_KEY);assert.ok(saved.includes('777.77'));assert.deepEqual(f.events,[]);
  f.fill('openingBalance','888.88');f.win.confirm=()=>false;f.el('restore').click();assert.equal(f.doc.querySelector('[name=openingBalance]').value,'888.88');
  f.win.confirm=()=>true;f.el('restore').click();assert.equal(f.doc.querySelector('[name=openingBalance]').value,'777.77');
  f.win.localStorage.setItem(CASH_FLOW_STORAGE_KEY,'broken');f.el('restore').click();assert.match(f.el('storage').textContent,/could not be read/);assert.equal(f.doc.querySelector('[name=openingBalance]').value,'777.77');
  f.el('delete').click();assert.equal(f.win.localStorage.getItem(CASH_FLOW_STORAGE_KEY),null);assert.equal(f.doc.querySelector('[name=openingBalance]').value,'777.77');f.dom.window.close();
});
test('storage failures do not claim success or disable calculations',()=>{
  const f=setup();Object.defineProperty(f.win,'localStorage',{value:{getItem(){throw Error('blocked');},setItem(){throw Error('full');},removeItem(){throw Error('blocked');}}});
  f.el('save').click();assert.match(f.el('storage').textContent,/could not save/);f.el('restore').click();assert.match(f.el('storage').textContent,/could not be read/);f.el('delete').click();assert.match(f.el('storage').textContent,/could not delete/);
  f.fill('openingBalance','0');f.submit();assert.equal(f.el('error').hidden,true);assert.deepEqual(f.events,[]);f.dom.window.close();
});
test('new plan, add/remove controls, row cap and harmless label rendering',()=>{
  const f=setup();f.el('blank').click();assert.equal(f.doc.querySelectorAll('[data-cash-row]').length,0);assert.match(f.el('status').textContent,/Add your pay and bills/);
  const add=f.doc.querySelector('[data-cash-add=income]');add.click();f.fill('income.0.label','<img src=x onerror=alert(1)>');f.fill('income.0.amount','1.01');f.submit();
  assert.equal(f.el('days').querySelectorAll('img').length,0);assert.match(f.el('days').textContent,/<img src=x onerror=alert\(1\)>/);
  for(let i=1;i<40;i++)add.click();assert.equal(f.doc.querySelectorAll('[data-cash-row]').length,40);assert.equal(add.disabled,true);
  f.doc.querySelector('.planner-remove').click();assert.equal(f.doc.querySelectorAll('[data-cash-row]').length,39);assert.equal(add.disabled,false);assert.equal(f.doc.activeElement,add);f.dom.window.close();
});
test('blank/example replacement cancellation retains current data and initialization is idempotent',()=>{
  const f=setup();f.fill('openingBalance','999');f.win.confirm=()=>false;f.el('example').click();f.el('blank').click();assert.equal(f.doc.querySelector('[name=openingBalance]').value,'999');
  initCashFlow(f.doc,f.win);f.submit();assert.equal(f.events.length,1);f.dom.window.close();
});

test('fixed walkthrough loads its exact calendar, confirms replacements and records no activation',()=>{
  const f=setup();
  assert.equal(f.el('timing').hidden,false);
  f.el('timing').click();
  assert.equal(f.doc.querySelector('[name=startDate]').value,'2026-10-05');
  assert.equal(f.doc.querySelector('[name=openingBalance]').value,'400.00');
  assert.equal(f.el('low').textContent,'-$525.00');
  assert.equal(f.el('closing').textContent,'$15,885.00');
  assert.equal(f.doc.activeElement.id,'cash-result-title');
  assert.deepEqual(f.events,[]);
  f.fill('openingBalance','999.99');f.win.confirm=()=>false;f.el('timing').click();
  assert.equal(f.doc.querySelector('[name=openingBalance]').value,'999.99');
  f.win.confirm=()=>true;f.el('timing').click();
  assert.equal(f.doc.querySelector('[name=openingBalance]').value,'400.00');
  assert.equal(f.win.localStorage.getItem(CASH_FLOW_STORAGE_KEY),null);
  f.dom.window.close();
});

test('empty plan and one-sided scenarios never claim that omitted bills are covered',()=>{
 const f=setup();f.el('blank').click();
 assert.match(f.el('status').textContent,/Add your pay and bills/);assert.equal(f.el('output').hidden,true);assert.equal(f.el('export').disabled,true);assert.equal(f.el('daily').hidden,true);
 f.fill('openingBalance','400');f.submit();assert.equal(f.el('output').hidden,true);assert.doesNotMatch(f.el('status').textContent,/No negative/);
 f.doc.querySelector('[data-cash-add=income]').click();f.fill('income.0.amount','2200');f.submit();
 assert.match(f.el('status').textContent,/Income-only scenario/);assert.equal(f.el('output').hidden,false);
 f.doc.querySelector('[data-cash-add=bills]').click();f.fill('bills.0.amount','650');f.submit();
 assert.equal(f.el('closing').textContent,'$1,950.00');assert.doesNotMatch(f.el('status').textContent,/Income-only|Expenses-only/);
 f.doc.querySelector('[data-cash-income] .planner-remove').click();f.submit();assert.match(f.el('status').textContent,/Expenses-only scenario/);
 f.doc.querySelector('[data-cash-bills] .planner-remove').click();f.submit();assert.equal(f.el('output').hidden,true);assert.match(f.el('status').textContent,/Add your pay and bills/);
 f.dom.window.close();
});
test('editing a sample retains explicit example provenance until a blank plan is chosen',()=>{
 const f=setup();f.fill('openingBalance','400');f.submit();
 assert.equal(f.el('mode').textContent,'EDITED EXAMPLE');assert.equal(f.el('result-mode').textContent,'EDITED EXAMPLE');assert.match(f.el('status').textContent,/Other sample amounts and dates may remain/);
 assert.equal(f.doc.querySelectorAll('[data-cash-row]').length,7);
 f.el('blank').click();assert.equal(f.doc.querySelectorAll('[data-cash-row]').length,0);assert.equal(f.el('mode').textContent,'YOUR ENTRIES');
 f.doc.querySelector('[data-cash-add=income]').click();f.fill('income.0.amount','100');f.submit();assert.equal(f.el('result-mode').textContent,'YOUR CALCULATED PLAN');
 f.el('example').click();assert.equal(f.el('result-mode').textContent,'WORKED EXAMPLE');
 f.dom.window.close();
});

test('successful calculation moves keyboard focus and scrolls the result heading into view',()=>{
 const f=setup();let scrollOptions;
 f.doc.querySelector('#cash-result-title').scrollIntoView=options=>{scrollOptions=options;};
 f.submit();assert.equal(f.doc.activeElement.id,'cash-result-title');assert.deepEqual(scrollOptions,{block:'start'});
 f.dom.window.close();
});
test('saved edited examples retain their example warning when restored',()=>{
 const f=setup();f.fill('openingBalance','400');f.el('save').click();
 assert.equal(JSON.parse(f.win.localStorage.getItem(CASH_FLOW_STORAGE_KEY)).exampleBased,true);
 f.el('blank').click();f.el('restore').click();assert.equal(f.el('result-mode').textContent,'EDITED EXAMPLE');assert.match(f.el('status').textContent,/Other sample amounts and dates may remain/);
 f.dom.window.close();
});
