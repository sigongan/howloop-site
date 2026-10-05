import {hasAmbiguousRateText,guardBankRateModel,validDepositRate} from './bank-rate-safety.mjs';
const finite=(value,name,min=0,max=1e9)=>{if(!Number.isFinite(value)||value<min||value>max)throw new RangeError(name+' is out of range');return value;};
export function monthlyContribution(amount,frequency='monthly'){finite(amount,'Contribution',0,1e6);if(!['weekly','fortnightly','monthly'].includes(frequency))throw new RangeError('Invalid contribution frequency');return amount*({weekly:52,fortnightly:26,monthly:12}[frequency])/12;}
export function savings({principal,contribution=0,frequency='monthly',annualRate=0,years=10,rateForBalance}){
finite(principal,'Starting balance',0,1e8);finite(annualRate,'Interest rate',0,30);finite(years,'Years',1/12,50);
const months=Math.round(years*12),payment=monthlyContribution(contribution,frequency);let balance=principal,deposits=principal;
const rows=[{month:0,year:0,balance,deposits,interest:0}];
for(let month=1;month<=months;month++){const annual=rateForBalance?rateForBalance(balance,month):annualRate;finite(annual,'Product rate',0,30);balance+=balance*annual/1200+payment;rateForBalance?.validateBalance?.(balance);deposits+=payment;if(month%12===0||month===months)rows.push({month,year:month/12,balance,deposits,interest:balance-deposits});}
return {balance,deposits,interest:balance-deposits,rows,monthly:payment};
}
export function requiredSavings({principal,target,annualRate=0,years=5}){
finite(principal,'Starting balance',0,1e8);finite(target,'Goal',0,1e8);finite(annualRate,'Interest rate',0,30);finite(years,'Years',1/12,50);
const n=Math.round(years*12),r=annualRate/1200;
const growthMinusOne=Math.expm1(n*Math.log1p(r));
return Math.max(0,r===0?(target-principal)/n:((target-principal)-principal*growthMinusOne)*r/growthMinusOne);
}
export function mortgage({principal,annualRate,years,offset=0,extra=0}){
finite(principal,'Loan',1,1e8);finite(annualRate,'Rate',0,30);finite(years,'Term',1,40);finite(offset,'Offset',0,1e8);finite(extra,'Extra repayment',0,1e6);
const n=Math.round(years*12),r=annualRate/1200,payment=r===0?principal/n:principal*r/(-Math.expm1(-n*Math.log1p(r)));
function run(off,additional){let balance=principal,interest=0,paid=0,month=0;const rows=[{month:0,year:0,balance,interest,paid}];while(balance>0.005&&month<n+1){month++;const cost=Math.max(0,balance-off)*r;const actual=Math.min(balance+cost,payment+additional);interest+=cost;paid+=actual;balance=Math.max(0,balance+cost-actual);if(month%12===0||balance<=0.005)rows.push({month,year:month/12,balance,interest,paid});}return {balance,interest,paid,months:month,rows};}
const base=run(0,0),plan=run(offset,extra);return {payment,base,plan,interestSaved:Math.max(0,base.interest-plan.interest),monthsSaved:Math.max(0,base.months-plan.months)};
}
export function emergencyFund({expenses,months,existing=0,contribution=0}){finite(expenses,'Expenses',0,1e6);finite(months,'Buffer months',1,24);finite(existing,'Existing savings',0,1e8);finite(contribution,'Contribution',0,1e6);const target=expenses*months,gap=Math.max(0,target-existing);return {target,gap,monthsToGoal:gap===0?0:contribution===0?null:Math.ceil(gap/contribution)};}
// Conservative base-rate modelling: never infer bonus eligibility or add overlapping rate components.
const hasConditions=value=>Array.isArray(value)?value.length>0:!!value&&typeof value==='object'?Object.keys(value).length>0:!!value;
export function baseRateModel(product){
const rows=(Array.isArray(product?.depositRates)?product.depositRates:[]).filter(r=>r.depositRateType==='VARIABLE');
if(!rows.length||hasAmbiguousRateText(rows))return null;
if(rows.some(r=>hasConditions(r.applicabilityConditions)||r.additionalValue||(r.tiers??[]).some(t=>hasConditions(t.applicabilityConditions))))return null;
if(rows.some(r=>!validDepositRate(r.rate)))return null;
const flat=rows.filter(r=>!r.tiers?.length);
if(rows.length===1&&flat.length===1)return guardBankRateModel(product,()=>Number(rows[0].rate)*100);
// Some providers repeat the same rate once without tiers and again across a full balance range.
if(flat.length && rows.every(r=>r.rate===flat[0].rate) && rows.every(r=>!r.applicabilityConditions?.length))return guardBankRateModel(product,()=>Number(flat[0].rate)*100);
if(flat.length)return null;
if(rows.some(r=>r.tiers.length!==1))return null;
const tiers=rows.map(r=>({...r.tiers[0],rate:Number(r.rate)*100})).sort((a,b)=>Number(a.minimumValue)-Number(b.minimumValue));
if(tiers.some(t=>t.unitOfMeasure!=='DOLLAR'||t.applicabilityConditions?.length))return null;
const method=tiers[0].rateApplicationMethod;if(!['PER_TIER','WHOLE_BALANCE'].includes(method)||tiers.some(t=>t.rateApplicationMethod!==method))return null;
if(Number(tiers[0].minimumValue)!==0||tiers.at(-1).maximumValue!==undefined)return null;
for(let i=1;i<tiers.length;i++){const prev=Number(tiers[i-1].maximumValue),min=Number(tiers[i].minimumValue);if(!Number.isFinite(prev)||min<prev||min-prev>.011)return null;}
return guardBankRateModel(product,balance=>{if(method==='WHOLE_BALANCE'){const t=tiers.findLast(t=>balance>=Number(t.minimumValue)&&balance<=Number(t.maximumValue??Infinity));if(!t)throw new RangeError('The balance falls between supported bank rate tiers. Confirm a custom rate with the bank.');return t.rate;}if(balance===0)return tiers[0].rate;let interest=0;for(let i=0;i<tiers.length;i++){const lower=i===0?0:Number(tiers[i-1].maximumValue);const upper=Number(tiers[i].maximumValue??Infinity);interest+=Math.max(0,Math.min(balance,upper)-lower)*tiers[i].rate;}return interest/balance;});
}
