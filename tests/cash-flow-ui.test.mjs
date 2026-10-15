import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseSavedCashFlow} from '../src/scripts/cash-flow.mjs';
import {createSampleModel} from '../src/lib/cash-flow.mjs';
const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8');
test('saved plans require version, bounded data and a valid engine model',()=>{
  const model=createSampleModel();assert.deepEqual(parseSavedCashFlow(JSON.stringify({version:1,model})),model);
  for(const value of [null,'broken','x'.repeat(30001),'{}',JSON.stringify({version:2,model}),JSON.stringify({version:1,model:{...model,openingBalance:'Infinity'}})])assert.throws(()=>parseSavedCashFlow(value));
});
test('controller does not upload financial inputs or use raw HTML',async()=>{
  const source=await read('src/scripts/cash-flow.mjs');
  assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|\.innerHTML\s*=|location\.(search|hash)|new URLSearchParams/);
  assert.equal((source.match(/trackPlannerEvent\(/g)||[]).length,1);
  assert.match(source,/trackPlannerEvent\('planner_demo_calculate','demo',mode,win\)/);
  assert.match(source,/if\(track\)/);assert.match(source,/addEventListener\('submit'.*calculate\(true,true\)/);
  assert.match(source,/setItem\(CASH_FLOW_STORAGE_KEY/);assert.match(source,/removeItem\(CASH_FLOW_STORAGE_KEY/);
});
test('product page discloses checkout and planned-feature status without purchase claims',async()=>{
  const page=await read('src/pages/_products/payday-planner.astro');
  assert.match(page,/NOT AVAILABLE TO BUY/);assert.match(page,/planned, not delivered/);assert.match(page,/no checkout, preorder or payment/);
  assert.doesNotMatch(page,/application\/ld\+json|schema.org\/Offer|buy.stripe|checkout.stripe|gumroad.com/);
});
test('demo provides no-JS content and explicit manual-save and cash-order limitations',async()=>{
  const page=await read('src/pages/tools/cash-flow.astro');
  assert.match(page,/<noscript>/);assert.match(page,/sample\.weeks\.map/);assert.match(page,/sample\.days\.map/);
  assert.match(page,/Nothing saves automatically/);assert.match(page,/without encryption/);assert.match(page,/Weekends and public holidays do not shift payments/);
  assert.match(page,/data-cash-inputs hidden/);assert.match(page,/data-cash-exports hidden/);assert.match(page,/novalidate autocomplete="off"/);
});


test('shared invitation CSS keeps legacy-page print chrome outside planner scope',async()=>{
  const css=await read('src/styles/cash-flow.css');
  assert.match(css,/body:has\(\[data-cash-flow\]\) header\.hl-header/);
  assert.match(css,/body:has\(\[data-cash-flow\]\) footer/);
  assert.doesNotMatch(css,/@media print\{header\.hl-header,footer/);
});
