import test from 'node:test';
import assert from 'node:assert/strict';
import {readQuickSavings} from '../src/lib/quick-savings.mjs';
const now=1789880000000;
const draft={createdAt:now,principal:12000.25,contribution:325.50,annualRate:4.5,years:7};
test('home handoff retains decimal amounts and only allowed inputs',()=>{
 assert.deepEqual(readQuickSavings(JSON.stringify({...draft,bank:'untrusted',frequency:'weekly'}),now),{principal:12000.25,contribution:325.5,annualRate:4.5,years:7,frequency:'monthly'});
});
test('home handoff rejects expired, future, invalid and malformed data',()=>{
 for(const value of [null,'{',JSON.stringify({...draft,createdAt:now-1800001}),JSON.stringify({...draft,createdAt:now+1}),JSON.stringify({...draft,years:0}),JSON.stringify({...draft,contribution:-1}),JSON.stringify({...draft,annualRate:31}),JSON.stringify({...draft,principal:'12,000'})])assert.equal(readQuickSavings(value,now),null);
});
