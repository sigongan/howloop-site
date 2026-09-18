import {expenseForReview,coverage,JOBS} from './tax-guide.mjs';
import {RECORDS,TOPICS} from '../data/tax-guide.mjs';
export const TAX_DRAFT_KEY='howloop-tax-draft-v1';
export function readTaxDraft(raw) {
 if(typeof raw!=='string'||raw.length>150000)throw Error('This saved checklist could not be read.');
 const d=JSON.parse(raw);
 if(d?.version!==1||!d.state||!Array.isArray(d.state.expenses)||d.state.expenses.length>100)throw Error('This saved checklist is not supported.');
 const s=d.state;
 const choices={year:['','2024-25','2025-26','future','other'],job:['',...Object.keys(JOBS)],residency:['','resident','other','unsure'],income:['','simple','complex','unsure']};
 for(const [key,values] of Object.entries(choices))if(!values.includes(s[key]))throw Error('Saved answers need to be entered again.');
 const expenses=s.expenses.map(e=>expenseForReview({category:e.category,date:e.date,description:e.description,paid:(e.paid/100).toFixed(2),workPercent:e.workPercent,reimbursed:(e.reimbursed/100).toFixed(2)},s.year));
 const topics=TOPICS.filter(t=>Array.isArray(s.topics)&&s.topics.includes(t.id)).map(t=>t.id);
 const records=Object.fromEntries(RECORDS.map(r=>[r.id,s.records?.[r.id]===true]));
 const pending={};
 for(const key of ['category','date','description','paid','work','reimbursed']){
  const v=d.pending?.[key]??'';
  if(typeof v!=='string'||v.length>(key==='description'?100:40))throw Error('An unfinished expense could not be restored.');
  pending[key]=v;
 }
 if(pending.category&&!TOPICS.some(t=>t.id===pending.category))pending.category='';
 const step=coverage(s).kind==='covered'&&s.job&&Number.isInteger(d.step)?Math.max(0,Math.min(2,d.step)):0;
 return {state:{year:s.year,job:s.job,residency:s.residency,income:s.income,expenses,topics,records},pending,step};
}
