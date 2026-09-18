import test from 'node:test';
import assert from 'node:assert/strict';
import {coverage,makeChecklist,expenseForReview,expenseTotals,expenseCSV} from '../src/lib/tax-guide.mjs';
import {onRequest} from '../functions/api/tax-explain.js';
const simple={year:'2025-26',residency:'resident',income:'simple',job:'retail',records:{income:true},topics:['uniform']};
const expense={category:'phone',date:'2026-03-01',description:'Example bill',paid:'100',workPercent:'40',reimbursed:'10'};
test('expense arithmetic excludes private use and work reimbursements without claiming deductibility',()=>{
 const e=expenseForReview(expense,'2025-26');assert.equal(e.paid,10000);assert.equal(e.work,4000);assert.equal(e.reimbursed,1000);assert.equal(e.review,3000);
 const second=expenseForReview({...expense,paid:'19.99',workPercent:'33.33',reimbursed:'0'},'2025-26');assert.equal(second.review,666);
 assert.equal(expenseTotals([e,second]).review,3666);assert.equal(expenseTotals([]).review,0);
 assert.match(makeChecklist({...simple,expenses:[e]}),/Do not copy this total directly into myTax/);
});
test('expense organiser rejects unsupported dates, invalid amounts and reimbursements exceeding work cost',()=>{
 for(const overrides of [{date:'2024-07-01'},{date:'2026-02-30'},{paid:'-1'},{paid:''},{paid:'1.001'},{paid:'Infinity'},{workPercent:'101'},{workPercent:''},{reimbursed:'41'},{category:'unknown'}])assert.throws(()=>expenseForReview({...expense,...overrides},'2025-26'));
 assert.equal(expenseForReview({...expense,workPercent:'0',reimbursed:'0'},'2025-26').review,0);
});
test('CSV separates cost from review amount and neutralises spreadsheet formulas',()=>{
 const e=expenseForReview({...expense,description:'=1+1'},'2025-26');const csv=expenseCSV([e]);assert.match(csv,/not a tax deduction/);assert.match(csv,/"'=1\+1"/);assert.match(csv,/"100.00","40","40.00","10.00","30.00"/);
});
test('unanswered, unsupported, future and residency-uncertain paths never reach covered',()=>{
 assert.equal(coverage({}).kind,'incomplete');
 for(const year of ['other','constructor','toString'])assert.equal(coverage({...simple,year}).kind,'outside');
 assert.equal(coverage({...simple,year:'future'}).kind,'future');
 assert.equal(coverage({...simple,residency:'unsure'}).kind,'outside');
 assert.equal(coverage({...simple,income:'complex'}).kind,'outside');
 assert.equal(coverage(simple).kind,'covered');
});
test('download distinguishes reviewed records, pending records and topics from approved deductions',()=>{
 const text=makeChecklist(simple);assert.match(text,/\[Reviewed\] Income/);assert.match(text,/\[To check\] Bank interest/);assert.match(text,/NOT APPROVED CLAIMS/);assert.match(text,/Uniforms/);assert.doesNotMatch(text,/Phone & internet:/);assert.match(text,/Nothing has been lodged/);
 const reset=makeChecklist({...simple,records:{},topics:[]});assert.doesNotMatch(reset,/\[Reviewed\]/);assert.match(reset,/No topics selected/);
});
test('AI is off by default and never contacts an external API without configuration',async()=>{
 const config=await onRequest({request:new Request('https://howloop.how/api/tax-explain'),env:{}});assert.deepEqual(await config.json(),{enabled:false});
 const r=await onRequest({request:new Request('https://howloop.how/api/tax-explain',{method:'POST'}),env:{}});assert.equal(r.status,503);
});
const env={TAX_AI_ENABLED:'true',OPENAI_API_KEY:'test-not-a-real-key',OPENAI_MODEL:'configured-model',TURNSTILE_SITE_KEY:'test',TURNSTILE_SECRET_KEY:'test'};
const post=body=>new Request('https://howloop.how/api/tax-explain',{method:'POST',headers:{Origin:'https://howloop.how','Content-Type':'application/json'},body:JSON.stringify(body)});
test('AI refuses cross-origin requests, missing consent and sensitive-number input before any external call',async()=>{
 const bad=new Request('https://howloop.how/api/tax-explain',{method:'POST',headers:{Origin:'https://example.org'}});assert.equal((await onRequest({request:bad,env})).status,403);
 for(const body of [{topic:'uniform',question:'Explain uniform',token:'test'},{topic:'uniform',question:'My TFN is 123 456 789',consent:true,token:'test'}])assert.equal((await onRequest({request:post(body),env})).status,400);
 for(const body of [null,[],false])assert.equal((await onRequest({request:post(body),env})).status,400);
});
test('AI validates verification hostname and does not send unverified questions to OpenAI',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({success:true,hostname:'wrong.example',action:'tax-explain'});});
 const r=await onRequest({request:post({topic:'uniform',question:'What is a uniform?',consent:true,token:'x'}),env});assert.equal(r.status,403);assert.equal(calls,1);
});
test('AI forwards only a general question plus curated topic, disables storage and returns a fixed source',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async(url,options)=>{calls++;if(calls===1)return Response.json({success:true,hostname:'howloop.how',action:'tax-explain'});const sent=JSON.parse(options.body);assert.equal(sent.store,false);assert.equal(sent.max_output_tokens,500);assert.match(sent.input,/REFERENCE NOTES/);assert.doesNotMatch(sent.input,/private-checklist/);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'A dress code and a distinctive uniform are different.'}]}]});});
 const response=await onRequest({request:post({topic:'uniform',question:'What is a uniform?',consent:true,token:'x',checklist:'private-checklist'}),env});const result=await response.json();assert.equal(response.status,200);assert.match(result.source.url,/ato\.gov\.au/);assert.equal(calls,2);
});
