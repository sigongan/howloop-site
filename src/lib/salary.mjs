import {PAYROLL} from '../data/payroll-2026.mjs';
export const PAY_PERIODS = {weekly:52,fortnightly:26,monthly:12,annual:1};
const cents=n=>Math.round((n+Number.EPSILON)*100)/100;
const valid=(n,label,max=1e7)=>{if(!Number.isFinite(n)||n<0||n>max)throw new RangeError('Check '+label+'. Enter a number from 0 to '+max.toLocaleString('en-AU')+'.');return n;};
export function periodFactor(period){if(!Object.hasOwn(PAY_PERIODS,period))throw new RangeError('Choose a supported pay period.');return PAY_PERIODS[period];}

export function paygWithholding(gross,period='weekly',{claimThreshold=true,helpDebt=false}={}){
  valid(gross,'gross pay');
  if(!['weekly','fortnightly','monthly'].includes(period))throw new RangeError('PAYG needs a weekly, fortnightly or monthly pay period.');
  // ATO monthly .33 adjustment happens before conversion to whole weekly dollars.
  const monthlyGross=period==='monthly'&&Math.round(gross*100)%100===33?gross+.01:gross;
  const weekly=period==='weekly'?gross:period==='fortnightly'?gross/2:monthlyGross*3/13;
  const x=Math.floor(weekly)+.99;
  const toPeriod=weeklyTax=>period==='weekly'?weeklyTax:period==='fortnightly'?weeklyTax*2:Math.round(weeklyTax*13/3);
  const fromScale=scale=>{const [,a,b]=scale.find(([limit])=>x<limit);return toPeriod(Math.max(0,Math.round(a*x-b)));};
  const tax=fromScale(claimThreshold?PAYROLL.threshold:PAYROLL.noThreshold);
  const help=helpDebt?fromScale(claimThreshold?PAYROLL.help:PAYROLL.helpNoThreshold):0;
  return {tax,help,total:tax+help};
}

export function salaryBreakdown({amount,inputPeriod='annual',includesSuper=false,superMode='standard',annualSuper=0,claimThreshold=true,helpDebt=false,monthlyDeductions=0}){
  const quotedAnnual=valid(amount,'salary')*periodFactor(inputPeriod);
  valid(quotedAnnual,'annual salary',1e7);valid(monthlyDeductions,'monthly deductions',1e6);
  if(!['standard','custom'].includes(superMode))throw new RangeError('Choose a super contribution method.');
  let grossAnnual,superAnnual;
  if(superMode==='custom'){
    superAnnual=valid(annualSuper,'annual employer super',1e7);
    grossAnnual=includesSuper?quotedAnnual-superAnnual:quotedAnnual;
    if(grossAnnual<0)throw new RangeError('Employer super cannot exceed the total package.');
  }else{
    const cappedSuper=PAYROLL.superEarningsCap*PAYROLL.superRate;
    grossAnnual=includesSuper?(quotedAnnual<=PAYROLL.superEarningsCap+cappedSuper?quotedAnnual/(1+PAYROLL.superRate):quotedAnnual-cappedSuper):quotedAnnual;
    superAnnual=Math.min(grossAnnual,PAYROLL.superEarningsCap)*PAYROLL.superRate;
  }
  grossAnnual=cents(grossAnnual);superAnnual=cents(superAnnual);
  const annualDeductions=cents(monthlyDeductions*12),periods={};
  for(const period of ['weekly','fortnightly','monthly']){
    const gross=cents(grossAnnual/PAY_PERIODS[period]);
    const withheld=paygWithholding(gross,period,{claimThreshold,helpDebt});
    const deductions=cents(annualDeductions/PAY_PERIODS[period]);
    if(deductions>gross-withheld.total)throw new RangeError('Other deductions are more than the estimated pay left after tax.');
    periods[period]={gross,...withheld,deductions,net:cents(gross-withheld.total-deductions),super:cents(superAnnual/PAY_PERIODS[period])};
  }
  // A year is an estimate based on twelve monthly pays, not an annual PAYG table.
  const monthly=periods.monthly;
  periods.annual={gross:grossAnnual,tax:monthly.tax*12,help:monthly.help*12,total:monthly.total*12,deductions:annualDeductions,net:cents(grossAnnual-monthly.total*12-annualDeductions),super:superAnnual};
  return {grossAnnual,superAnnual,quotedAnnual,packageAnnual:cents(grossAnnual+superAnnual),periods};
}

export function earningsBand(annualCash,points){
  valid(annualCash,'annual cash salary');
  if(!Array.isArray(points)||points.length<3||points.some(([p,v],i)=>!Number.isFinite(p)||!Number.isFinite(v)||v<=0||(i&&v<=points[i-1][1])))throw new RangeError('Earnings comparison data is unavailable.');
  const weekly=annualCash/52;
  const exact=points.find(([,value])=>Math.abs(weekly-value)<.005);
  const upper=points.find(([p,value])=>weekly<value);
  const lower=[...points].reverse().find(([p,value])=>weekly>value);
  return {weekly,lower:exact?.[0]??lower?.[0]??0,upper:exact?.[0]??upper?.[0]??100,median:points.find(([p])=>p===50)?.[1]};
}
