import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {paygWithholding,salaryBreakdown,earningsBand} from '../src/lib/salary.mjs';
const earnings=JSON.parse(readFileSync(new URL('../src/data/earnings-may2025.json',import.meta.url)));

// Independent golden values: ATO Withholding Schedules Instrument 2026,
// schedule 1 sample data, scales 1 and 2 (not generated from our coefficients).
const samples=[
 [116,17,0],[117,18,0],[187,28,0],[188,28,0],[249,41,0],[250,41,0],
 [361,64,0],[362,65,0],[370,66,1],[371,66,1],[514,92,23],[515,92,23],
 [537,99,26],[538,100,27],[672,143,60],[673,143,60],[720,158,68],[721,159,68],
 [864,205,94],[865,205,94],[907,219,108],[908,219,108],[931,227,116],[932,227,116],
 [1134,292,181],[1135,292,181],[1281,339,229],[1282,339,229],[1844,519,409],[1845,519,409],
 [2119,607,497],[2120,607,497],[2245,647,537],[2246,647,537],[2490,743,615],[2491,743,616],
 [2595,784,649],[2596,784,649],[2652,806,671],[2653,806,672],[2736,839,704],[2737,839,704],
 [2898,902,767],[2899,902,768],[3302,1059,925],[3303,1060,925],[3652,1224,1061],[3653,1224,1062]
];
test('2026–27 weekly and fortnightly withholding matches ATO boundary examples',()=>{
 for(const [gross,scale1,scale2] of samples){
  assert.equal(paygWithholding(gross).tax,scale2,'weekly scale 2 at '+gross);
  assert.equal(paygWithholding(gross,'weekly',{claimThreshold:false}).tax,scale1,'weekly scale 1 at '+gross);
  assert.equal(paygWithholding(gross*2,'fortnightly').tax,scale2*2,'fortnightly at '+gross*2);
 }
});
test('monthly PAYG follows the ATO worked example before optional offsets',()=>{
 assert.equal(paygWithholding(5400.33,'monthly').tax,940);
});
test('student loan components match schedule 8 worked examples',()=>{
 assert.equal(paygWithholding(2608.36,'weekly',{helpDebt:true}).help,193);
 assert.equal(paygWithholding(4409.75,'fortnightly',{helpDebt:true}).help,260);
 assert.equal(paygWithholding(10627.88,'monthly',{claimThreshold:false,helpDebt:true}).help,979);
 assert.equal(paygWithholding(1336,'weekly',{helpDebt:true}).help,0);
 assert.equal(paygWithholding(900,'weekly',{claimThreshold:false,helpDebt:true}).help,0);
});
test('salary plus super and an inclusive package have the same cash result',()=>{
 const cash=salaryBreakdown({amount:80000}),pack=salaryBreakdown({amount:89600,includesSuper:true});
 assert.equal(pack.grossAnnual,80000);assert.equal(pack.superAnnual,9600);
 assert.deepEqual(pack.periods,cash.periods);
 assert.equal(cash.packageAnnual,89600);
});
test('2026–27 SG annual cap and custom contractual super separate correctly',()=>{
 const capped=salaryBreakdown({amount:400000});
 assert.equal(capped.superAnnual,32499.6);
 assert.equal(salaryBreakdown({amount:432499.6,includesSuper:true}).grossAnnual,400000);
 const contract=salaryBreakdown({amount:115000,includesSuper:true,superMode:'custom',annualSuper:15000});
 assert.equal(contract.grossAnnual,100000);assert.equal(contract.superAnnual,15000);
});
test('26 fortnights, 52 weeks and 12 months give consistent salary inputs',()=>{
 for(const [inputPeriod,amount] of [['annual',78000],['monthly',6500],['fortnightly',3000],['weekly',1500]]){
  assert.deepEqual(salaryBreakdown({amount,inputPeriod}).periods,salaryBreakdown({amount:78000}).periods);
 }
 const withDeductions=salaryBreakdown({amount:78000,monthlyDeductions:100});
 assert.equal(withDeductions.periods.monthly.net,salaryBreakdown({amount:78000}).periods.monthly.net-100);
 assert.equal(withDeductions.periods.annual.deductions,1200);
});
test('invalid inputs clear estimates instead of coercing values',()=>{
 for(const amount of [-1,NaN,Infinity,10000001])assert.throws(()=>salaryBreakdown({amount}));
 assert.throws(()=>salaryBreakdown({amount:80000,inputPeriod:'twice-monthly'}));
 assert.throws(()=>salaryBreakdown({amount:80000,includesSuper:true,superMode:'custom',annualSuper:90000}));
 assert.throws(()=>salaryBreakdown({amount:80000,monthlyDeductions:100000}));
 assert.equal(salaryBreakdown({amount:0}).periods.fortnightly.net,0);
});
test('ABS comparison uses published bands and the correct population medians',()=>{
 const all=earnings.populations.all.groups.find(g=>g.id==='all').percentiles;
 const full=earnings.populations.fulltime.groups.find(g=>g.id==='all').percentiles;
 assert.equal(earningsBand(1436*52,all).median,1436);
 assert.equal(earningsBand(1852*52,full).lower,50);
 assert.equal(earningsBand(1852*52,full).upper,50);
 const between=earningsBand((full[6][1]+full[7][1])/2*52,full);
 assert.equal(between.lower,60);assert.equal(between.upper,70);
 assert.equal(earningsBand(0,full).upper,10);
 assert.equal(earningsBand(1000000,full).lower,90);
 assert.throws(()=>earningsBand(50000,[]));
});
