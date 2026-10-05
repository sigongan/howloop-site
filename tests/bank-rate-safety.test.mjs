import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseRateModel, savings } from '../src/lib/finance.mjs';
import { requiredSavings, mortgage } from '../src/lib/finance.mjs';
import { rateSummary } from '../src/lib/rate-summary.mjs';
import { compareBankScenarios, conditionalRateModel } from '../src/lib/bank-scenarios.mjs';
import { compareSavings, isSavingsCandidate } from '../src/lib/savings-comparison.mjs';
import { hasAmbiguousRateText, withinAccountLimits } from '../src/lib/bank-rate-safety.mjs';

// Fixed excerpts of 4 October 2026 provider snapshots. A refresh must not erase
// the counterexamples that previously overestimated customers' interest.
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/bank-rate-regressions.json',import.meta.url),'utf8'));
const inputs={principal:200000,contribution:100,years:1,frequency:'monthly'};
const simple={id:'simple',name:'Ordinary Saver',depositRates:[{depositRateType:'VARIABLE',rate:'.01'}]};
const now=Date.parse('2026-10-05T22:00:00Z');

test('ING prose bonus cap is never ignored by any automatic model or combined-rate preview',()=>{
  const product=fixtures.ing.products[0];
  for(const principal of [10000,100000,200000]){
    assert.equal(rateSummary(product,principal).conditional,null);
    assert.equal(conditionalRateModel(product,principal),null);
    const scenarios=compareBankScenarios(product,{...inputs,principal});
    assert.equal(scenarios.conditional,null);
    assert.ok(Math.abs(scenarios.base.interest-savings({...inputs,principal,annualRate:.01}).interest)<1e-8);
    const comparison=compareSavings([fixtures.ing],{...inputs,principal,months:12,scenario:'conditional'},now);
    assert.equal(comparison.rows.length,0);
  }
});

test('Defence total-rate and prose-only duration cannot produce 9.25 percent or a permanent bonus',()=>{
  const product=fixtures.defence.products[0];
  assert.equal(baseRateModel(product),null);
  assert.equal(rateSummary(product,50000).base,null);
  assert.equal(rateSummary(product,50000).conditional,null);
  assert.equal(compareBankScenarios(product,{...inputs,principal:50000,years:2}),null);
});

test('RACQ total including base is displayed as source rows without double-counting',()=>{
  const product=fixtures.racq.products[0];
  const result=rateSummary(product,50000);
  assert.equal(result.conditional,null);
  assert.ok(result.components.some(row=>row.type==='BONUS'));
  const scenario=compareBankScenarios(product,{...inputs,principal:50000});
  assert.equal(scenario.conditional,null);
});

test('contradictory prose and structured base tiers cannot auto-import a headline rate',()=>{
  const product=fixtures.teachers.products[0];
  assert.equal(baseRateModel(product),null);
  assert.equal(rateSummary(product,30000).base,null);
  assert.equal(compareBankScenarios(product,{...inputs,principal:30000}),null);
});

test('shared text guard rejects total wording and unknown duration but preserves simple recurring conditions',()=>{
  for(const additionalInfo of ['Bonus rate is the total rate payable.','A combined interest rate applies.','Bonus includes the standard rate.','Bonus applies for 12 months.','Rate expires after the initial 6 months.','Available on balances up to $100,000.','Available up to A$100,000.','Maximum balance of AUD 100000.','For the first 12-month period.']){
    assert.equal(hasAmbiguousRateText([{depositRateType:'BONUS',rate:'.04',additionalInfo}]),true,additionalInfo);
    assert.equal(rateSummary({...simple,depositRates:[...simple.depositRates,{depositRateType:'BONUS',rate:'.04',additionalInfo}]},1000).conditional,null);
  }
  assert.equal(hasAmbiguousRateText([{depositRateType:'BONUS',rate:'.04',additionalInfo:'Bonus is in addition to the base rate when you deposit at least $200 per month.'}]),false);
});

test('account caps apply through the final contribution, not just the month opening balance',()=>{
  const product={...simple,constraints:[{constraintType:'MAX_BALANCE',additionalValue:'1000'}]};
  const rate=baseRateModel(product);
  assert.throws(()=>rate(1001),/account limits/);
  assert.equal(rateSummary(product,1001).base,null);
  assert.throws(()=>savings({principal:990,contribution:20,years:1/12,rateForBalance:rate}),/account limits/);
  assert.equal(compareBankScenarios(product,{principal:990,contribution:20,years:1/12}),null);
  assert.ok(compareBankScenarios(product,{principal:100,contribution:0,years:1}));
});

test('invalid or contradictory account bounds fail closed, and valid lower bounds are enforced',()=>{
  for(const constraints of [[{constraintType:'MAX_BALANCE',additionalInfo:'Ask provider'}],[{constraintType:'MAX_BALANCE',additionalValue:''}],[{constraintType:'MIN_BALANCE',additionalValue:'500'},{constraintType:'MAX_BALANCE',additionalValue:'100'}]]){
    const product={...simple,constraints};
    assert.equal(baseRateModel(product),null);
    assert.equal(withinAccountLimits(product,100,200),false);
  }
  const minimum={...simple,constraints:[{constraintType:'OPENING_BALANCE',additionalValue:'500'}]};
  assert.throws(()=>baseRateModel(minimum)(499),/account limits/);
  assert.equal(rateSummary(minimum,499).base,null);
  assert.equal(baseRateModel(minimum)(500),1);
});

test('missing rates cannot be silently interpreted as zero by the direct bank picker model',()=>{
  for(const rate of [undefined,null,'',' ',NaN,Infinity])assert.equal(baseRateModel({...simple,depositRates:[{depositRateType:'VARIABLE',rate}]}),null);
  assert.equal(baseRateModel({...simple,depositRates:[{depositRateType:'VARIABLE',rate:'0'}]})(100),0);
});

test('supported structured welcome periods still expire, while manual rates remain user-controlled',()=>{
  const product={...simple,depositRates:[...simple.depositRates,{depositRateType:'INTRODUCTORY',rate:'.04',additionalValue:'P2M'}]};
  const result=compareBankScenarios(product,{principal:1000,contribution:0,years:1});
  assert.ok(Math.abs(result.conditional.result.balance-1000*(1+.05/12)**2*(1+.01/12)**10)<1e-8);
  assert.ok(Math.abs(savings({principal:1000,contribution:0,years:1,annualRate:5}).balance-1000*(1+.05/12)**12)<1e-8);
});

test('personal comparator excludes explicit business-only and SMSF-only fixtures without hiding ordinary dual eligibility',()=>{
  for(const key of ['business','gst','smsf'])assert.equal(isSavingsCandidate(fixtures[key].products[0]),false,key);
  assert.equal(isSavingsCandidate({...simple,eligibility:[{eligibilityType:'BUSINESS'},{eligibilityType:'NATURAL_PERSON'}]}),true);
  assert.equal(isSavingsCandidate({...simple,eligibility:[{eligibilityType:'OTHER',additionalInfo:'Available to personal customers, businesses and trusts.'}]}),true);
  assert.equal(isSavingsCandidate({...simple,eligibility:[{eligibilityType:'PENSION_RECIPIENT'}]}),false);
});

test('shared whole-balance boundaries choose the upper tier and fractional-cent gaps fail closed',()=>{
  const tier=(minimumValue,maximumValue)=>({unitOfMeasure:'DOLLAR',rateApplicationMethod:'WHOLE_BALANCE',minimumValue,...(maximumValue===undefined?{}:{maximumValue})});
  const product={depositRates:[{depositRateType:'VARIABLE',rate:'.01',tiers:[tier(0,5000)]},{depositRateType:'VARIABLE',rate:'.05',tiers:[tier(5000)]}]};
  assert.equal(baseRateModel(product)(4999.99),1);
  assert.equal(baseRateModel(product)(5000),5);
  assert.equal(baseRateModel(product)(5000.01),5);
  const gap={depositRates:[product.depositRates[0],{...product.depositRates[1],tiers:[tier(5000.01)]}]};
  assert.throws(()=>baseRateModel(gap)(5000.005),/between supported bank rate tiers/);
  assert.equal(rateSummary(gap,5000.005).base,null);
});

test('near-zero positive interest remains finite and continuous with the zero-rate limit',()=>{
  for(const annualRate of [0,1e-13,1e-11,1e-9]){
    const needed=requiredSavings({principal:10000,target:30000,years:3,annualRate});
    assert.ok(Number.isFinite(needed));assert.ok(Math.abs(needed-20000/36)<.00001);
    const loan=mortgage({principal:600000,years:30,annualRate});
    assert.ok(Number.isFinite(loan.payment));assert.ok(Math.abs(loan.payment-600000/360)<.00001);
    assert.equal(loan.plan.months,360);assert.ok(loan.plan.balance<.005);
  }
});
