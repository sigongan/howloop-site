import {savings, mortgage, requiredSavings, emergencyFund} from './finance.mjs';
import {salaryBreakdown} from './salary.mjs';

export const LANGUAGE_STATE_KEY='howloop-language-calculators-v1';
export const KINDS=['compound-interest','mortgage','savings-goal','emergency-fund','salary'];
const money=(name,label,value,max=1e8,min=0)=>({name,label,value,min,max,type:'number',money:true});
const number=(name,label,value,min,max)=>({name,label,value,min,max,type:'number'});
const select=(name,label,value,options)=>({name,label,value,options,type:'select'});
const check=(name,label,value)=>({name,label,value,type:'checkbox'});
const periods=[['weekly','weekly'],['fortnightly','fortnightly'],['monthly','monthly'],['annual','annual']];
export const FIELDS={
 'compound-interest':[money('principal','principal',10000),money('contribution','contribution',500,1e6),select('frequency','frequency','monthly',periods.slice(0,3)),number('annualRate','rate',4.5,0,30),number('years','years',10,1,50)],
 mortgage:[money('principal','loan',600000,1e8,1),number('annualRate','rate',6,0,30),number('years','term',30,1,40),money('offset','offset',30000),money('extra','extra',200,1e6)],
 'savings-goal':[money('target','goal',80000),money('principal','saved',15000),number('years','years',5,1,50),number('annualRate','rate',4.5,0,30)],
 'emergency-fund':[money('expenses','expenses',3500,1e6),number('months','months',3,1,24),money('existing','saved',2000),money('contribution','monthlySaving',400,1e6)],
 salary:[money('amount','pay',85000,1e7),select('inputPeriod','payPeriod','annual',periods),select('includesSuper','superIncluded','no',[['no','superNo'],['yes','superYes']]),check('helpDebt','helpDebt',false),check('claimThreshold','threshold',true),select('outputPeriod','resultPeriod','fortnightly',periods)],
};
export function parseLocalizedNumber(value){
 let text=String(value??'').trim().replace(/[\u0660-\u0669\u06f0-\u06f9\u0a66-\u0a6f\uff10-\uff19]/g,c=>{
  const point=c.charCodeAt(0);return String(point>=0xff10?point-0xff10:point>=0xa66&&point<=0xa6f?point-0xa66:point>=0x6f0?point-0x6f0:point-0x660);
 }).replaceAll('\u066b','.');
 // Decimal keyboards may only offer a comma. One comma with 1–2 trailing
 // digits is a decimal; 1,500 remains a grouped whole number.
 if(/^\d+,\d{1,2}$/.test(text))text=text.replace(',','.');
 // Preserve the meaning of the explicit Arabic thousands separator: a
 // malformed group such as 4\u066c5 must never become a decimal.
 text=text.replaceAll('\u066c',',');
 // Accept both Australian grouping (100,000) and Punjabi/Indian grouping (1,00,000).
 if(!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})+,\d{3})(?:\.\d{1,2})?$/.test(text))return NaN;
 return Number(text.replaceAll(',',''));
}
export function defaultValues(kind){return Object.fromEntries(FIELDS[kind].map(field=>[field.name,field.value]));}
export function cleanValues(kind,input){
 if(!Object.hasOwn(FIELDS,kind)||!input||typeof input!=='object')throw new RangeError('Invalid calculator');
 const result={};
 for(const field of FIELDS[kind]){
  const value=input[field.name];
  if(field.type==='checkbox'){
   if(typeof value!=='boolean')throw new RangeError(field.name);
   result[field.name]=value;
  }else if(field.type==='select'){
   if(!field.options.some(([option])=>option===value))throw new RangeError(field.name);
   result[field.name]=value;
  }else{
   const n=parseLocalizedNumber(value);
   if(!Number.isFinite(n)||n<field.min||n>field.max||(field.name==='months'&&!Number.isInteger(n)))throw new RangeError(field.name);
   result[field.name]=n;
  }
 }
 return result;
}
export function calculateLanguageTool(kind,raw){
 const input=cleanValues(kind,raw);
 if(kind==='compound-interest'){
  const r=savings(input);return {label:'balance',total:r.balance,sub:'afterYears',subData:{years:input.years},stats:[['deposits',r.deposits],['interest',r.interest]],bar:r.balance?Math.min(100,r.deposits/r.balance*100):0,note:'savingsNote'};
 }
 if(kind==='mortgage'){
  const r=mortgage(input);return {label:'repayment',total:r.payment,stats:[['totalPayment',r.payment+input.extra],['interestPlan',r.plan.interest],['interestSaved',r.interestSaved],['paidOff',r.plan.months,'number']],note:'mortgageNote'};
 }
 if(kind==='savings-goal')return {label:'monthlyRequired',total:requiredSavings(input),stats:[['target',input.target],['saved',input.principal]],note:'goalNote'};
 if(kind==='emergency-fund'){
  const r=emergencyFund(input);return {label:'buffer',total:r.target,stats:[['gap',r.gap],['timeToGoal',r.monthsToGoal,'number']],note:'emergencyNote'};
 }
 const r=salaryBreakdown({...input,includesSuper:input.includesSuper==='yes'}).periods[input.outputPeriod];
 return {label:'netPay',total:r.net,sub:input.outputPeriod,stats:[['gross',r.gross],['tax',r.tax],['help',r.help],['super',r.super]],note:'salaryScope'};
}
export const formatMoney=(value,locale='en-AU')=>new Intl.NumberFormat(locale,{style:'currency',currency:'AUD',currencyDisplay:'code',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
export const formatCount=(value,locale='en-AU')=>new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(value);
export function readLanguageState(raw,now=Date.now()){
 try{
  const state=JSON.parse(raw);
  if(!state||!Number.isFinite(state.at)||now-state.at<0||now-state.at>30*60*1000||!KINDS.includes(state.kind))return null;
  const values={};
  for(const kind of KINDS){if(!state.values?.[kind])continue;try{values[kind]=cleanValues(kind,state.values[kind]);}catch{}}
  return {kind:state.kind,values};
 }catch{return null;}
}
