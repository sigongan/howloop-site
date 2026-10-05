import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import * as freshness from '../src/lib/bank-freshness.mjs';
import * as search from '../src/lib/bank-search.mjs';
import * as money from '../src/lib/money-input.mjs';
import * as quick from '../src/lib/quick-savings.mjs';
import * as scenarios from '../src/lib/bank-scenarios.mjs';
import * as finance from '../src/lib/finance.mjs';
import * as summary from '../src/lib/rate-summary.mjs';
import * as display from '../src/lib/product-display.mjs';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=read('./fixtures/compound-calculator.html');
const samples=JSON.parse(read('./fixtures/bank-rate-regressions.json'));
const source=read('../src/scripts/calculators.js').replace(/^import .*;\n/gm,'');
const now=Date.parse('2026-10-05T22:00:00Z');
const key='howloop-plan-v1-compound-interest';
const savedPlan=(bankModel=true)=>({values:{principal:200000,contribution:100,years:1,annualRate:5.5,frequency:'monthly'},bank:samples.ing.id,product:samples.ing.products[0].id,bankModel});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function setup(bank=samples.ing,{saved=null,fail=false}={}){
  const dom=new JSDOM(fixture,{url:'https://howloop.how/calculators/compound-interest/',runScripts:'outside-only'});
  const win=dom.window,doc=win.document;
  let data=bank;
  Object.assign(win,search,money,quick,scenarios,finance,summary,display,{
    bankFreshness:snapshot=>freshness.bankFreshness(snapshot,now),
    fetch:async()=>{if(fail)throw Error('offline');return {ok:true,json:async()=>data};},
    AbortSignal:globalThis.AbortSignal,matchMedia:()=>({matches:false}),
  });
  win.HTMLElement.prototype.scrollIntoView=()=>{};
  if(saved)win.localStorage.setItem(key,JSON.stringify(saved));
  win.eval(source);
  const q=selector=>doc.querySelector(selector);
  const fill=(name,value)=>{const field=q(`[name="${name}"]`);field.value=value;field.dispatchEvent(new win.Event('input',{bubbles:true}));};
  const select=async(next=bank)=>{
    data=next;q('[data-bank-select]').value=samples.ing.id;q('[data-bank-select]').dispatchEvent(new win.Event('change'));await tick();
    q('[data-product-select]').value=next.products[0].id;q('[data-product-select]').dispatchEvent(new win.Event('change'));await tick();
  };
  return {dom,win,q,fill,select};
}

test('real picker never offers the ING capped bonus as an uncapped automatic projection',async()=>{
  const f=setup();f.fill('principal','200000');f.fill('contribution','100');f.fill('years','1');await f.select();
  assert.equal(f.q('[name=annualRate]').value,'0.0100');
  assert.equal(f.q('.bank-confirm'),null);
  assert.doesNotMatch(f.q('[data-product-info]').textContent,/With qualifying bonus|Use conditional scenario/);
  assert.match(f.q('[data-product-info]').textContent,/BONUS row may already include/);
  assert.equal(f.q('[data-error]').hidden,true);
  f.dom.window.close();
});

test('unsupported base account cannot replace a genuinely user-entered custom rate',async()=>{
  const f=setup(samples.defence);f.fill('annualRate','2.3');await f.select(samples.defence);
  assert.equal(f.q('[name=annualRate]').value,'2.3');
  assert.match(f.q('[data-rate-model]').textContent,/Custom rate unchanged/);
  assert.doesNotMatch(f.q('[data-product-info]').textContent,/9\.25%/);
  assert.equal(f.q('.bank-scenarios'),null);
  f.dom.window.close();
});

test('fresh supported bank-origin restore restarts at base and saves provenance',async()=>{
  const f=setup(samples.ing,{saved:savedPlan()});f.q('[data-load]').click();await tick();
  assert.equal(f.q('[name=annualRate]').value,'0.0100');
  assert.match(f.q('[data-action-status]').textContent,/using the supported base rate/);
  assert.equal(f.q('[data-error]').hidden,true);
  f.q('[data-save]').click();assert.equal(JSON.parse(f.win.localStorage.getItem(key)).bankModel,true);
  f.dom.window.close();
});

test('stale, partial, future and failed bank restores block results until an explicit custom rate',async()=>{
  for(const override of [{status:'stale'},{status:'partial'},{checkedAt:'2026-09-01T00:00:00Z'},{checkedAt:'2026-10-06T00:00:00Z'}]){
    const f=setup({...samples.ing,...override},{saved:savedPlan()});f.q('[data-load]').click();await tick();
    assert.equal(f.q('[name=annualRate]').value,'');
    assert.equal(f.q('[data-result-total]').textContent,'—');
    assert.equal(f.q('[data-error]').hidden,false);
    assert.match(f.q('[data-action-status]').textContent,/bank rate could not be restored/);
    assert.equal(f.q('.bank-scenarios'),null);
    f.fill('annualRate','3.2');assert.equal(f.q('[data-error]').hidden,true);
    assert.notEqual(f.q('[data-result-total]').textContent,'—');
    f.q('[data-save]').click();assert.equal(JSON.parse(f.win.localStorage.getItem(key)).bankModel,false);
    f.dom.window.close();
  }
  const offline=setup(samples.ing,{saved:savedPlan(),fail:true});offline.q('[data-load]').click();await tick();
  assert.equal(offline.q('[data-result-total]').textContent,'—');
  assert.equal(offline.q('[name=annualRate]').value,'');offline.dom.window.close();
});

test('custom-only restore preserves its chosen rate even when bank information is stale',async()=>{
  const f=setup({...samples.ing,status:'stale'},{saved:savedPlan(false)});f.q('[data-load]').click();await tick();
  assert.equal(f.q('[name=annualRate]').value,'5.5');
  assert.equal(f.q('[data-error]').hidden,true);
  assert.match(f.q('[data-action-status]').textContent,/your custom rate restored/);
  f.dom.window.close();
});

test('switching from an imported bank rate to an unsupported account never promotes it to custom',async()=>{
  const f=setup();await f.select();assert.equal(f.q('[name=annualRate]').value,'0.0100');
  await f.select(samples.defence);
  assert.equal(f.q('[name=annualRate]').value,'');
  assert.equal(f.q('[data-result-total]').textContent,'—');
  assert.match(f.q('[data-product-info]').textContent,/Bank rate needs confirmation/);
  f.fill('annualRate','1.25');assert.equal(f.q('[data-error]').hidden,true);
  f.dom.window.close();
});

test('a bank plan crossing its account cap cannot auto-import or retain a plotted result',async()=>{
  const capped={...samples.ing,products:[{id:'capped',name:'Capped account',depositRates:[{depositRateType:'VARIABLE',rate:'.01'}],constraints:[{constraintType:'MAX_BALANCE',additionalValue:'1000'}]}]};
  const f=setup(capped);f.fill('principal','2000');f.fill('annualRate','2');await f.select(capped);
  assert.equal(f.q('[name=annualRate]').value,'2');assert.equal(f.q('.bank-scenarios'),null);
  f.fill('principal','100');f.fill('contribution','0');f.fill('years','1');await f.select(capped);
  assert.equal(f.q('[name=annualRate]').value,'1.0000');
  f.fill('contribution','2000');assert.equal(f.q('[data-result-total]').textContent,'—');
  assert.equal(f.q('[data-chart]').children.length,0);assert.match(f.q('[data-error]').textContent,/account limits/);
  f.dom.window.close();
});
