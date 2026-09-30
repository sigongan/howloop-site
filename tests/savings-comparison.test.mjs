import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSavings,fiveYearBaseOutlook,isSavingsCandidate} from '../src/lib/savings-comparison.mjs';
const now=Date.parse('2026-09-21T00:00:00Z');
const product=(id,rate,extra=[])=>({id,name:id+' Saver',depositRates:[{depositRateType:'VARIABLE',rate},...extra]});
const bank=products=>({id:'bank-1',name:'Example Bank',status:'available',checkedAt:'2026-09-20T00:00:00Z',products});
const opts={principal:100,contribution:0,months:12,currentRate:null,scenario:'base'};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,a+' != '+b);
test('compares interest with an independent closed-form result, not principal',()=>{
 const r=compareSavings([bank([product('A','.12'),product('B','.06')])],{...opts,currentRate:0},now);
 near(r.rows[0].interest,100*(1.01**12-1));near(r.rows[1].interest,100*(1.005**12-1));
 near(r.rows[0].difference,r.rows[0].interest);assert.equal(r.rows[0].product.id,'A');
});
test('end-of-month deposits use the same amount in the baseline and every account',()=>{
 const r=compareSavings([bank([product('A','.12')])],{...opts,contribution:50,currentRate:6},now);
 const future=(monthly)=>100*(1+monthly)**12+50*((1+monthly)**12-1)/monthly;
 near(r.rows[0].balance,future(.01));near(r.rows[0].difference,future(.01)-future(.005));
});
test('introductory rate expires within the comparison period',()=>{
 const p=product('Welcome','.06',[{depositRateType:'INTRODUCTORY',rate:'.06',additionalValue:'P2M'}]);
 const r=compareSavings([bank([p])],{...opts,scenario:'conditional'},now).rows[0];
 near(r.interest,100*(1.01**2*1.005**10-1));assert.equal(r.welcomeMonths,2);
});
test('blank baseline stays absent; explicit zero is a valid comparison',()=>{
 const b=[bank([product('A','.05')])];
 assert.equal(compareSavings(b,opts,now).rows[0].difference,null);
 assert.equal(compareSavings(b,{...opts,currentRate:0},now).baseline.interest,0);
 for(const currentRate of ['',NaN,-1,31,Infinity])assert.throws(()=>compareSavings(b,{...opts,currentRate},now));
});
test('stale, failed, partial and future-dated data never enter the ranking',()=>{
 for(const overrides of [{checkedAt:'2026-09-10'},{checkedAt:null},{checkedAt:'2026-09-22'},{status:'stale'},{status:'partial'},{status:'unavailable'}]){
  const r=compareSavings([{...bank([product('A','.05')]),...overrides}],opts,now);
  assert.equal(r.rows.length,0);assert.equal(r.excluded.stale,1);
 }
});
test('ambiguous and unknown-duration conditional offers are excluded, not treated as base-only',()=>{
 const products=[product('Multiple','.01',[{depositRateType:'BONUS',rate:'.04'},{depositRateType:'BONUS',rate:'.03'}]),product('Unknown','.01',[{depositRateType:'INTRODUCTORY',rate:'.04'}])];
 assert.equal(compareSavings([bank(products)],opts,now).rows.length,2);
 const r=compareSavings([bank(products)],{...opts,scenario:'conditional'},now);
 assert.equal(r.rows.length,0);assert.equal(r.excluded.unsupported,2);
});
test('bonus caps are rechecked as the balance grows',()=>{
 const p=product('Capped','.01',[{depositRateType:'BONUS',rate:'.04',tiers:[{unitOfMeasure:'DOLLAR',rateApplicationMethod:'WHOLE_BALANCE',minimumValue:'0',maximumValue:'150'}]}]);
 const r=compareSavings([bank([p])],{...opts,contribution:100,scenario:'conditional'},now);
 assert.equal(r.rows.length,0);assert.equal(r.excluded.unsupported,1);
});
test('missing rates, duplicate products and restricted products are handled explicitly',()=>{
 const p=product('A','.05');
 assert.equal(compareSavings([bank([p,p])],opts,now).rows.length,1);
 assert.equal(compareSavings([bank([product('Missing','')])],opts,now).rows.length,0);
 for(const name of ['Junior Saver','Business Savings','Home Loan Offset','Pension Saver','USD Savings'])assert.equal(isSavingsCandidate({...p,name}),false);
 assert.equal(isSavingsCandidate({...p,eligibility:[{eligibilityType:'MAX_AGE',additionalValue:'30'}]}),false);
});
test('a lower earning account yields a negative difference',()=>{
 const r=compareSavings([bank([product('A','.01')])],{...opts,currentRate:6},now);
 assert.ok(r.rows[0].difference<0);
});
test('a published bonus that already includes base interest is never added to the base',()=>{
 const p=product('Total','.0001',[{depositRateType:'BONUS',rate:'.0575',additionalValue:'Bonus Rate quoted includes Base Rate.'}]);
 assert.equal(compareSavings([bank([p])],opts,now).rows.length,1);
 const result=compareSavings([bank([p])],{...opts,scenario:'conditional'},now);
 assert.equal(result.rows.length,0);assert.equal(result.excluded.unsupported,1);
});
test('a text-only bonus cap cannot be ignored even when the tier is open-ended',()=>{
 const p=product('Prose cap','.0001',[{depositRateType:'BONUS',rate:'.0549',additionalInfo:'Available on one account for balances up to $100,000.',tiers:[{unitOfMeasure:'DOLLAR',rateApplicationMethod:'WHOLE_BALANCE',minimumValue:'1000'}]}]);
 for(const principal of [10000,150000]){
  assert.equal(compareSavings([bank([p])],{...opts,principal,scenario:'conditional'},now).rows.length,0);
  assert.equal(compareSavings([bank([p])],{...opts,principal},now).rows.length,1);
 }
});
test('account limits are checked at opening and after growth, with no guessing missing values',()=>{
 const p=product('Limited','.12');
 for(const constraints of [
  [{constraintType:'MIN_BALANCE',additionalValue:'101'}],
  [{constraintType:'OPENING_BALANCE',additionalValue:'101'}],
  [{constraintType:'MAX_BALANCE',additionalValue:'110'}],
  [{constraintType:'MAX_BALANCE',additionalInfo:'Deposits up to $1 million'}],
  [{constraintType:'MIN_BALANCE',additionalValue:''}],
  [{constraintType:'MAX_BALANCE',additionalValue:'not a number'}]
 ])assert.equal(compareSavings([bank([{...p,constraints}])],opts,now).rows.length,0);
 assert.equal(compareSavings([bank([{...p,constraints:[{constraintType:'OPENING_BALANCE',additionalValue:'100'},{constraintType:'MAX_BALANCE',additionalValue:'200'}]}])],opts,now).rows.length,1);
});
test('a deposit condition is an explicit assumption, not mistaken for an interest cap',()=>{
 const p=product('Monthly','.01',[{depositRateType:'BONUS',rate:'.04',additionalInfo:'Bonus is in addition to the base rate when you deposit at least $200 per month.'}]);
 assert.equal(compareSavings([bank([p])],{...opts,contribution:200,scenario:'conditional'},now).rows.length,1);
});

test('five-year base-rate scenarios follow independently calculated rate paths',()=>{
 const p=product('Long view','.12');
 const outlook=fiveYearBaseOutlook(p,{principal:100,contribution:0});
 const firstYear=100*1.01**12;
 near(outlook.unchanged.balance,100*1.01**60);
 near(outlook.lower.balance,firstYear*(1+.11/12)**48);
 near(outlook.higher.balance,firstYear*(1+.13/12)**48);
 assert.ok(outlook.lower.interest<outlook.unchanged.interest);
 assert.ok(outlook.higher.interest>outlook.unchanged.interest);
});
test('five-year illustration omits accounts whose balance cap is crossed',()=>{
 const p={...product('Capped','.12'),constraints:[{constraintType:'MAX_BALANCE',additionalValue:'120'}]};
 const r=compareSavings([bank([p])],opts,now);
 assert.equal(r.rows.length,1);
 assert.equal(r.rows[0].longTerm,null);
});
test('rate decreases cannot create negative deposit interest',()=>{
 const outlook=fiveYearBaseOutlook(product('Small base','.005'),{principal:100,contribution:0});
 assert.ok(outlook);
 near(outlook.lower.balance,100*(1+.005/12)**12);
});


test('a bonus estimate retains a separate independently computed base-only outcome',()=>{
 const p=product('Bonus contrast','.001',[{depositRateType:'BONUS',rate:'.0555',applicabilityConditions:[{rateApplicabilityType:'MIN_DEPOSIT_AMOUNT',additionalValue:'200'}]}]);
 const row=compareSavings([bank([p])],{...opts,principal:10000,contribution:0,scenario:'conditional'},now).rows[0];
 const base=10000*((1+.001/12)**12-1),bonus=10000*((1+.0565/12)**12-1);
 near(row.baseInterest,base);near(row.interest,bonus);assert.equal(row.type,'BONUS');
 assert.ok(row.interest>row.baseInterest);
 // Zero planned additions remain an explicit assumed scenario, never proof of eligibility.
 assert.equal(row.product.depositRates[1].applicabilityConditions[0].additionalValue,'200');
});
test('base mode retains its base outcome without labelling it as earned bonus interest',()=>{
 const row=compareSavings([bank([product('Only base','.06')])],opts,now).rows[0];
 near(row.baseInterest,100*((1+.06/12)**12-1));near(row.interest,row.baseInterest);assert.equal(row.type,'BASE');
});
