import test from 'node:test';
import assert from 'node:assert/strict';
import {savingsOfferExample,offsetCostExample,salaryPackageExample,calculatorExample} from '../src/lib/money-decisions.mjs';
import {salaryBreakdown} from '../src/lib/salary.mjs';

const near=(a,b)=>assert.ok(Math.abs(a-b)<.000001,`${a} ≠ ${b}`);
// Closed-form annuity calculation, independent of the month-by-month engine.
const fv=(principal,deposit,months,annual)=>{
  const r=annual/12,growth=(1+r)**months;
  return principal*growth+deposit*(growth-1)/r;
};
test('fictional savings offers match independent piecewise future-value formulas',()=>{
  const r=savingsOfferExample();
  near(r.bonus.balance,fv(fv(20000,200,9,.05),200,3,.005));
  near(r.intro.balance,fv(fv(20000,200,4,.055),200,8,.035));
  near(r.steady.balance,fv(20000,200,12,.042));
  assert.ok(r.steady.interest>r.intro.interest&&r.intro.interest>r.bonus.interest);
  const full=savingsOfferExample({missedMonths:0});
  near(full.bonus.balance,fv(20000,200,12,.05));
  assert.ok(full.bonus.interest>full.steady.interest);
  near(savingsOfferExample({missedMonths:12}).bonus.balance,fv(20000,200,12,.005));
  for(const v of Object.values(r))assert.equal(v.deposits,22400);
});
test('offset comparison deducts whole-loan rate premium and only additional fees',()=>{
  const r=offsetCostExample();
  assert.equal(r.avoidedInterest,2480);
  assert.equal(r.extraRateCost,1200);assert.equal(r.net,885);
  near(r.breakEven,1595/.062);assert.equal(r.interestBalance,560000);
  near(offsetCostExample({premium:0}).breakEven,395/.06);
  near(offsetCostExample({offset:r.breakEven}).net,0);
  assert.equal(offsetCostExample({loan:10000,offset:20000,premium:0,fee:0}).avoidedInterest,600);
  assert.equal(offsetCostExample({rate:0,premium:0,fee:100}).breakEven,null);
  assert.equal(offsetCostExample({rate:0,premium:0,fee:0}).breakEven,0);
  assert.ok(offsetCostExample({offset:0}).net<0);
});
test('package division reconciles the quote and agrees with the existing salary calculator',()=>{
  const r=salaryPackageExample();
  near(r.includedCash+r.includedSuper,90000);
  near(r.includedSuper,r.includedCash*.12);
  assert.equal(r.plusCash+r.plusSuper,100800);
  assert.ok(Math.abs(r.includedCash-salaryBreakdown({amount:90000,includesSuper:true}).grossAnnual)<.01);
  assert.equal(salaryPackageExample({quote:0}).cashDifference,0);
});
test('comparison inputs fail rather than publishing misleading or stale results',()=>{
  for(const missedMonths of [-1,.5,13,NaN])assert.throws(()=>savingsOfferExample({missedMonths}),RangeError);
  assert.throws(()=>offsetCostExample({loan:NaN}),RangeError);
  assert.throws(()=>offsetCostExample({fee:-1}),RangeError);
  assert.throws(()=>salaryPackageExample({quote:250001}),RangeError);
});
test('six worked examples report independently checkable values',()=>{
  assert.equal(calculatorExample('emergency-fund').cards[2][1],'18 months');
  assert.equal(calculatorExample('lvr').cards[2][1],'$32,000');
  assert.equal(calculatorExample('savings-goal').cards[0][1],'$555.56');
  for(const kind of ['compound-interest','mortgage','salary','savings-goal','emergency-fund','lvr']){
    const e=calculatorExample(kind);assert.equal(e.cards.length,3);
    assert.ok(e.cards.every(c=>!c[1].includes('undefined')&&!c[1].includes('NaN')));
  }
});
