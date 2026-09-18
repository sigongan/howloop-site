import test from 'node:test';
import assert from 'node:assert/strict';
import {homeDeposit} from '../src/lib/home-buying.mjs';
test('purchase deposit and lender valuation produce distinct percentages',()=>{
  const r=homeDeposit({price:800000,deposit:160000,valuation:760000});
  assert.equal(r.loan,640000);assert.equal(r.depositPercent,20);assert.ok(Math.abs(r.lvr-84.21052631578947)<1e-9);assert.equal(r.additionalFor80,32000);assert.equal(r.above80,true);
});
test('80% boundary is evaluated before rounding and financed costs count as debt',()=>{
  assert.equal(homeDeposit({price:800000,deposit:160000}).above80,false);
  const r=homeDeposit({price:800000,deposit:160000,financedCosts:10000});
  assert.equal(r.loan,650000);assert.equal(r.lvr,81.25);assert.equal(r.additionalFor80,10000);
  assert.equal(homeDeposit({price:800000,deposit:159999.99}).above80,true);
});
test('cash purchase is zero LVR; high LVR is shown rather than clipped',()=>{
  assert.equal(homeDeposit({price:500000,deposit:500000}).lvr,0);
  assert.equal(homeDeposit({price:500000,deposit:0,valuation:400000}).lvr,125);
});
test('invalid values never become a valid-looking LVR',()=>{
  for(const input of [{price:0,deposit:0},{price:100,deposit:101},{price:100,deposit:-1},{price:100,deposit:0,valuation:0},{price:100,deposit:0,financedCosts:Infinity},{price:NaN,deposit:0},{price:'100',deposit:0}]) assert.throws(()=>homeDeposit(input),RangeError);
});
