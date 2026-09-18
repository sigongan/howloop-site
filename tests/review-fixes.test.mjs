import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAmount,displayAmount} from '../src/lib/money-input.mjs';
import {compareBankScenarios} from '../src/lib/bank-scenarios.mjs';
import {readTaxDraft} from '../src/lib/tax-draft.mjs';
test('currency grouping preserves cents and rejects ambiguous input',()=>{
 assert.equal(parseAmount('600,000.25'),600000.25);assert.equal(displayAmount(600000.25),'600,000.25');
 for(const s of ['', '1,00','1e6','Infinity','-10','1.001','2,34,000'])assert.ok(Number.isNaN(parseAmount(s)),s);
});
const input={principal:1000,contribution:0,annualRate:0,years:1};
const product={depositRates:[{depositRateType:'VARIABLE',rate:'0.01'},{depositRateType:'INTRODUCTORY',rate:'0.04',additionalValue:'P4M'}]};
test('welcome projection stops after the stated number of months',()=>{
 const c=compareBankScenarios(product,input);
 assert.ok(Math.abs(c.conditional.result.balance-1000*(1+.05/12)**4*(1+.01/12)**8)<1e-8);
 assert.ok(Math.abs(c.base.balance-1000*(1+.01/12)**12)<1e-8);
 assert.equal(c.conditional.welcomeMonths,4);
});
test('unsupported welcome periods and stacking never receive a combined projection',()=>{
 assert.equal(compareBankScenarios({...product,depositRates:[product.depositRates[0],{...product.depositRates[1],additionalValue:'P90D'}]},input).conditional,null);
 assert.equal(compareBankScenarios({...product,depositRates:[...product.depositRates,{depositRateType:'BONUS',rate:'.02'}]},input).conditional,null);
});
test('a bonus tier that ends before the plan does cannot be projected indefinitely',()=>{
 const limited={depositRates:[product.depositRates[0],{depositRateType:'BONUS',rate:'.04',tiers:[{minimumValue:0,maximumValue:1050,unitOfMeasure:'DOLLAR',rateApplicationMethod:'WHOLE_BALANCE'}]}]};
 assert.equal(compareBankScenarios(limited,{...input,contribution:100}).conditional,null);
});
test('tax draft restores unfinished work and recomputes money instead of trusting stored totals',()=>{
 const d={version:1,step:2,state:{year:'2025-26',job:'retail',residency:'resident',income:'simple',topics:['phone','not-real'],records:{income:true},expenses:[{category:'phone',date:'2026-05-10',description:'Example',paid:12000,workPercent:50,reimbursed:2000,review:999999}]},pending:{description:'Still typing',paid:'25'}};
 const actual=readTaxDraft(JSON.stringify(d));assert.equal(actual.state.expenses[0].review,4000);assert.equal(actual.pending.paid,'25');assert.equal(actual.step,2);assert.ok(!actual.state.topics.includes('not-real'));
 assert.throws(()=>readTaxDraft(JSON.stringify({...d,state:{...d.state,expenses:[{...d.state.expenses[0],date:'2024-01-01'}]}})));
 assert.equal(readTaxDraft(JSON.stringify({...d,state:{...d.state,residency:'unsure'}})).step,0);
});
