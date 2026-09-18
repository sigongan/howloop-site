import {baseRateModel} from './finance.mjs';

const validRate=value=>(typeof value==='string'&&value.trim()!==''||typeof value==='number')&&Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=.3;
export const formatRate=value=>Number.isFinite(value)?value.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:4})+'%':'Not supplied';

// Display a single qualifying rate only when the balance selects one clear adjustment.
// CDR adjustment types are added to the base; conditions are never treated as satisfied.
function adjustmentAtBalance(rows,balance){
 if(!rows.length||rows.some(r=>!validRate(r.rate)))return null;
 if(rows.length===1&&!rows[0].tiers?.length)return rows[0];
 if(rows.some(r=>r.tiers?.length!==1))return null;
 if(rows.some(r=>{const t=r.tiers[0];return t.unitOfMeasure!=='DOLLAR'||t.rateApplicationMethod!=='WHOLE_BALANCE'||t.minimumValue===undefined||t.minimumValue===null||String(t.minimumValue).trim()===''||!Number.isFinite(Number(t.minimumValue))||Number(t.minimumValue)<0||(t.maximumValue!==undefined&&(t.maximumValue===null||String(t.maximumValue).trim()===''||!Number.isFinite(Number(t.maximumValue))||Number(t.maximumValue)<Number(t.minimumValue)));}))return null;
 const sorted=[...rows].sort((a,b)=>Number(a.tiers[0].minimumValue)-Number(b.tiers[0].minimumValue));
 if(sorted.some((r,i)=>i>0&&Number(r.tiers[0].minimumValue)<=Number(sorted[i-1].tiers[0].maximumValue??Infinity)))return null;
 const matching=rows.filter(r=>balance>=Number(r.tiers[0].minimumValue)&&balance<=Number(r.tiers[0].maximumValue??Infinity));
 return matching.length===1?matching[0]:null;
}
export function rateSummary(product,balance){
 const rows=Array.isArray(product?.depositRates)?product.depositRates:[];
 const components=[...new Set(rows.map(r=>r.depositRateType??'OTHER'))].map(type=>{
  const entries=rows.filter(r=>(r.depositRateType??'OTHER')===type),values=[...new Set(entries.filter(r=>validRate(r.rate)).map(r=>Number(r.rate)*100))].sort((a,b)=>a-b);
  const incomplete=entries.some(r=>!validRate(r.rate));
  return {type,min:values[0]??null,max:values.at(-1)??null,incomplete,values};
 });
 if(!Number.isFinite(balance)||balance<0||balance>1e8)return {base:null,conditional:null,components};
 // The existing model rejects conditional or ambiguous base structures.
 const baseRows=rows.filter(r=>r.depositRateType==='VARIABLE');
 const model=baseRows.length&&baseRows.every(r=>validRate(r.rate))?baseRateModel({...product,depositRates:rows}):null;
 const base=model?model(balance):null;
 const adjustmentTypes=[...new Set(rows.filter(r=>r.depositRateType!=='VARIABLE').map(r=>r.depositRateType))];
 if(base===null||adjustmentTypes.length!==1||!['BONUS','INTRODUCTORY'].includes(adjustmentTypes[0]))return {base,conditional:null,components};
 const type=adjustmentTypes[0],row=adjustmentAtBalance(rows.filter(r=>r.depositRateType===type),balance);
 if(!row)return {base,conditional:null,components};
 const total=base+Number(row.rate)*100;
 if(total>30)return {base,conditional:null,components};
 return {base,components,conditional:{type,total,extra:Number(row.rate)*100,duration:type==='INTRODUCTORY'&&/^P\d+[DMY]$/.test(row.additionalValue??'')?row.additionalValue:null}};
}
export function introductoryPeriod(duration){
 const match=/^P(\d+)([DMY])$/.exec(duration??'');
 if(!match||Number(match[1])<1)return 'Limited time only';
 const unit={D:'day',M:'month',Y:'year'}[match[2]];
 return 'First '+Number(match[1])+' '+unit+(Number(match[1])===1?'':'s')+' only';
}
