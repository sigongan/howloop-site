import test from 'node:test';
import assert from 'node:assert/strict';
import { trackPlannerEvent } from '../src/scripts/product-events.mjs';
const record = choice => JSON.stringify({version:1,choice,recordedAt:'2026-10-04T00:00:00Z'});
function fixture(choice='accepted') {
  const events=[];
  const win={localStorage:{getItem:()=>record(choice)},document:{querySelector:()=>({dataset:{measurementId:'G-TEST123'}})},location:{origin:'https://howloop.how',pathname:'/tools/cash-flow/',search:'?balance=123456&label=private',hash:'#private'},gtag:(...args)=>events.push(args),'ga-disable-G-TEST123':false};
  return {win,events};
}
test('planner events contain only fixed identifiers and a query-free URL',()=>{
  const {win,events}=fixture();assert.equal(trackPlannerEvent('planner_demo_calculate','demo','custom',win),true);
  assert.deepEqual(events,[['event','planner_demo_calculate',{product_id:'payday_planner_v1',placement:'demo',mode:'custom',page_location:'https://howloop.how/tools/cash-flow/'}]]);
});
test('unknown, declined, malformed and blocked-storage consent never sends or queues an event',()=>{
  for (const value of [null,record('essential'),'broken',JSON.stringify({version:2,choice:'accepted'})]) {
    const {win,events}=fixture();win.localStorage.getItem=()=>value;
    assert.equal(trackPlannerEvent('planner_demo_calculate','demo','sample',win),false);assert.deepEqual(events,[]);assert.equal(win.dataLayer,undefined);
  }
  const {win,events}=fixture();win.localStorage.getItem=()=>{throw Error('denied');};
  assert.equal(trackPlannerEvent('planner_demo_open','home','sample',win),false);assert.deepEqual(events,[]);
});
test('withdrawn, unloaded or malformed measurement cannot emit events',()=>{
  for(const change of [win=>win['ga-disable-G-TEST123']=true,win=>delete win.gtag,win=>win.document.querySelector=()=>null,win=>win.document.querySelector=()=>({dataset:{measurementId:'evil'}})]){
    const {win,events}=fixture();change(win);assert.equal(trackPlannerEvent('planner_demo_calculate','demo','custom',win),false);assert.deepEqual(events,[]);
  }
});
test('arbitrary event names, placements and financial payloads are rejected',()=>{
  for(const args of [['private-bill','demo','sample'],['planner_demo_open','salary=80000','sample'],['planner_demo_calculate','demo','shortfall'],['planner_demo_calculate','demo',{balance:12345}]]){
    const {win,events}=fixture();assert.equal(trackPlannerEvent(...args,win),false);assert.deepEqual(events,[]);
  }
});
