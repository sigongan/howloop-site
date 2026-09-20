import {savings} from './finance.mjs';
export const QUICK_SAVINGS_KEY='howloop-quick-savings-v1';
export function readQuickSavings(raw,now=Date.now()){
 try{
  const value=JSON.parse(raw);
  if(!value||!Number.isFinite(value.createdAt)||now-value.createdAt<0||now-value.createdAt>30*60*1000)return null;
  const data={principal:value.principal,contribution:value.contribution,years:value.years,annualRate:value.annualRate,frequency:'monthly'};
  if(!Number.isInteger(data.years)||data.years<1)return null;
  savings(data);return data;
 }catch{return null;}
}
