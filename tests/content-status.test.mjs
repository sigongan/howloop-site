import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewStatus,policyLabel,brisbaneDate} from '../src/lib/content-status.mjs';
test('a review becomes due on its stated day, not a rebuild date',()=>{
 assert.deepEqual(reviewStatus('2026-09-18',14,'2026-10-01'),{needsReview:false,due:'2026-10-02'});
 assert.deepEqual(reviewStatus('2026-09-18',14,'2026-10-02'),{needsReview:true,due:'2026-10-02'});
});
test('invalid or future checks never establish freshness',()=>{
 for(const d of ['2026-02-30','invalid','2027-01-01'])assert.equal(reviewStatus(d,14,'2026-09-18').needsReview,true);
 assert.equal(reviewStatus('2026-09-18',0,'2026-09-18').needsReview,true);
});
test('passing a scheduled legal start never silently verifies commencement',()=>{
 const p={stage:'law-future',effectiveDate:'2027-07-01'};
 assert.match(policyLabel(p,'2027-06-30'),/^Law passed/);
 assert.match(policyLabel(p,'2027-07-01'),/check current rules/);
 assert.equal(policyLabel({...p,stage:'proposal'},'2028-07-01'),'Proposal · not in effect');
 assert.match(policyLabel({stage:'in-effect',endsAt:'2029-06-30'},'2029-07-01'),/recheck/);
});
test('review calendar follows Brisbane even before UTC midnight',()=>{
 assert.equal(brisbaneDate(new Date('2026-09-17T15:00:00Z')),'2026-09-18');
});
