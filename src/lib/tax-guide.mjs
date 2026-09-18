import {YEARS,RECORDS,TOPICS,SOURCES} from '../data/tax-guide.mjs';
export const JOBS={retail:'Retail employee',hospitality:'Café, restaurant or hospitality employee',other:'Other employee'};
export function expenseForReview(input,year){
 if(!Object.hasOwn(YEARS,year))throw Error('Choose a supported income year first.');
 const category=TOPICS.find(t=>t.id===input.category);if(!category)throw Error('Choose an expense topic.');
 const date=String(input.date||'');const start=Number(year.slice(0,4));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<`${start}-07-01`||date>`${start+1}-06-30`)throw Error('Use a valid payment date within the selected income year.');
 const money=(value,label)=>{const text=String(value??'').trim();if(!/^\d+(\.\d{1,2})?$/.test(text)||Number(text)>1000000)throw Error(`Enter ${label} as an amount from 0 to 1,000,000, with at most two decimal places.`);return Math.round(Number(text)*100);};
 const paid=money(input.paid,'the cost');if(paid===0)throw Error('The cost must be greater than zero.');
 const percentText=String(input.workPercent??'').trim();if(!/^\d+(\.\d{1,2})?$/.test(percentText)||Number(percentText)>100)throw Error('Enter an evidence-based work-use percentage from 0 to 100.');
 const workPercent=Number(percentText),work=Math.round(paid*workPercent/100),reimbursed=money(input.reimbursed,'the work-use reimbursement');
 if(reimbursed>work)throw Error('The reimbursement for work use cannot exceed the work-use cost in this entry. Check both figures.');
 return {category:category.id,title:category.title,date,description:String(input.description||'').trim().slice(0,100),paid,workPercent,work,reimbursed,review:work-reimbursed};
}
export function expenseTotals(expenses=[]){return expenses.reduce((s,e)=>({paid:s.paid+e.paid,work:s.work+e.work,reimbursed:s.reimbursed+e.reimbursed,review:s.review+e.review}),{paid:0,work:0,reimbursed:0,review:0});}
const dollars=cents=>'$'+(cents/100).toFixed(2);
export function expenseCSV(expenses=[]){const cell=value=>'"'+String(value).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';return [['Payment date','Expense topic','Description','Cost AUD','Work use %','Work-use cost AUD','Employer reimbursement for work use AUD','Unreimbursed work-use cost to review AUD (not a tax deduction)'],...expenses.map(e=>[e.date,e.title,e.description,(e.paid/100).toFixed(2),e.workPercent,(e.work/100).toFixed(2),(e.reimbursed/100).toFixed(2),(e.review/100).toFixed(2)])].map(row=>row.map(cell).join(',')).join('\r\n');}
export function coverage(s){
 if(!s.year||!s.residency||!s.income)return {kind:'incomplete',message:'Choose an answer for each question to continue.'};
 if(s.year==='future')return {kind:'future',message:'The 2026–27 income year is still in progress. Keep records now; this guide does not prepare a current-year return for lodgment.'};
 if(!Object.hasOwn(YEARS,s.year))return {kind:'outside',message:'This version covers general preparation for 2024–25 and 2025–26. Use the ATO instructions for the year you need.'};
 if(s.residency!=='resident'||s.income!=='simple')return {kind:'outside',message:'Some of your selections need guidance beyond this employee checklist. You may still be able to lodge yourself. Use the ATO guidance for the extra parts before completing your return.'};
 return {kind:'covered',message:'The employee preparation path covers these selections. This is a guide-coverage check, not a decision about your tax residency, obligations or entitlement to deductions.'};
}
export function makeChecklist(s){
 const result=coverage(s); const lines=['HOWLOOP — SELF-LODGMENT PREPARATION CHECKLIST',`Income year: ${s.year||'Not selected'}`,`Work: ${JOBS[s.job]||'Not selected'}`,`Guide coverage: ${result.kind}`,result.message,'','RECORDS TO REVIEW'];
 for(const r of RECORDS)lines.push(`${s.records?.[r.id]?'[Reviewed]':'[To check]'} ${r.title}: ${r.detail}\n${SOURCES[r.source].url}`);
 lines.push('','EXPENSE TOPICS TO READ — NOT APPROVED CLAIMS');
 const selected=TOPICS.filter(t=>s.topics?.includes(t.id));
 lines.push(...(selected.length?selected.map(t=>`${t.title}: ${t.records}\n${SOURCES[t.source].url}`):['No topics selected. This does not establish that no deductions apply.']));
 if(s.expenses?.length){lines.push('','EXPENSE ORGANISER — NOT DEDUCTIONS APPROVED FOR MYTAX');for(const e of s.expenses)lines.push(`${e.date} | ${e.title}${e.description?' | '+e.description:''} | Paid ${dollars(e.paid)} | Work use ${e.workPercent}% | Work-use reimbursement ${dollars(e.reimbursed)} | Cost to review ${dollars(e.review)}`);lines.push(`Total unreimbursed work-use cost to review: ${dollars(expenseTotals(s.expenses).review)}`,'This is arithmetic on your entries. Eligibility, timing, depreciation and category-specific tax rules are not assessed. Do not copy this total directly into myTax.');}
 lines.push('','NEXT STEPS','Open myGov independently and select ATO online services. Select the correct return year.','Check personal details and income. Personalise the return to include every relevant section.','Read the ATO rules for the selected year and enter only amounts you can support.','Review deductions, offsets, Medicare, private health insurance, study loans and any other applicable sections.','Read the declaration, check the estimate, and submit yourself only when satisfied. Save the lodgment receipt.','','Howloop is not a registered tax agent. This is an educational preparation list, not a completed tax return, deduction approval or refund estimate. Nothing has been lodged.','https://howloop.how/tax-return');
 return lines.join('\n');
}
