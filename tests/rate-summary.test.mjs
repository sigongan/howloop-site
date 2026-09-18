import test from 'node:test';
import assert from 'node:assert/strict';
import {rateSummary,formatRate,introductoryPeriod} from '../src/lib/rate-summary.mjs';
const base={depositRateType:'VARIABLE',rate:'.001'};
const bonus=(rate,min,max)=>({depositRateType:'BONUS',rate,tiers:[{unitOfMeasure:'DOLLAR',rateApplicationMethod:'WHOLE_BALANCE',minimumValue:min,...(max===undefined?{}:{maximumValue:max})}],applicabilityConditions:[{rateApplicabilityType:'DEPOSIT_BALANCE_INCREASED'}]});
test('base and qualifying total are separate; repeated tiers are not summed',()=>{
 const r=rateSummary({depositRates:[base,bonus('.049','0','49999.99'),bonus('.049','50000')]},10000);
 assert.equal(r.base,.1);assert.equal(r.conditional.total,5);assert.equal(r.conditional.extra,4.9);
 assert.equal(r.components.find(c=>c.type==='BONUS').values.length,1);
});
test('a balance-specific rate is selected without advertising a higher tier',()=>{
 const p={depositRates:[base,bonus('.04','0','49999.99'),bonus('.02','50000')]};
 assert.equal(rateSummary(p,49999.99).conditional.total,4.1);
 assert.equal(rateSummary(p,50000).conditional.total,2.1);
 assert.equal(rateSummary(p,49999.995).conditional,null);
});
test('overlap, missing bounds, per-tier adjustments and stacked bonuses require checking',()=>{
 const cases=[
 [base,bonus('.04','0'),bonus('.02','50000')],
 [base,bonus('.04',undefined)],
 [base,{...bonus('.04','0'),tiers:[{unitOfMeasure:'DOLLAR',rateApplicationMethod:'PER_TIER',minimumValue:'0'}]}],
 [base,{depositRateType:'BONUS',rate:'.04'},{depositRateType:'INTRODUCTORY',rate:'.01'}],
 [base,{depositRateType:'BONUS',rate:'.04'},{depositRateType:'BONUS',rate:'.03'}],
 ];
 for(const depositRates of cases)assert.equal(rateSummary({depositRates},10000).conditional,null);
});
test('missing or invalid rates cannot turn into zero or a qualifying total',()=>{
 for(const value of ['',null,undefined,'bad',Infinity,'-.1']){
  const r=rateSummary({depositRates:[{...base,rate:value},{depositRateType:'BONUS',rate:'.04'}]},1000);
  assert.equal(r.base,null);assert.equal(r.conditional,null);
  assert.equal(r.components[0].min,null);
 }
 assert.equal(rateSummary({depositRates:[{...base,rate:'0'}]},1000).base,0);
 assert.equal(formatRate(null),'Not supplied');assert.equal(formatRate(.1),'0.10%');
});
test('introductory total retains its expiry and is not a full-term model',()=>{
 const r=rateSummary({depositRates:[{...base,rate:'.021'},{depositRateType:'INTRODUCTORY',rate:'.031',additionalValue:'P5M'}]},10000);
 assert.equal(r.conditional.total,5.2);assert.equal(r.conditional.duration,'P5M');
 assert.equal(introductoryPeriod(r.conditional.duration),'First 5 months only');
});
test('unsupported conditional base and invalid balances never get a total',()=>{
 const p={depositRates:[{...base,applicabilityConditions:[{rateApplicabilityType:'OTHER'}]},bonus('.049','0')]};
 assert.equal(rateSummary(p,10000).conditional,null);
 for(const value of [NaN,-1,Infinity,'10000'])assert.equal(rateSummary({depositRates:[base]},value).base,null);
});
