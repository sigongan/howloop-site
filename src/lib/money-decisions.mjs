import {savings, requiredSavings, emergencyFund} from './finance.mjs';
import {homeDeposit} from './home-buying.mjs';

const check=(value,name,max=1e7)=>{
  if(!Number.isFinite(value)||value<0||value>max)throw new RangeError(`Check ${name}. Enter a number from 0 to ${max.toLocaleString('en-AU')}.`);
  return value;
};
export const dollars=(value,decimals=0)=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(value);

// Fictional offers, not provider data. Missed bonus months are the final months
// of the year. End-of-month deposits follow the main savings calculator model.
export function savingsOfferExample({balance=20000,monthly=200,missedMonths=3}={}){
  check(balance,'starting savings');check(monthly,'monthly saving',1e6);
  if(!Number.isInteger(missedMonths)||missedMonths<0||missedMonths>12)throw new RangeError('Choose 0 to 12 missed months.');
  const project=rateForBalance=>savings({principal:balance,contribution:monthly,years:1,rateForBalance});
  const bonus=project((_balance,month)=>month>12-missedMonths ? 0.5 : 5);
  const intro=project((_balance,month)=>month<=4?5.5:3.5);
  const steady=project(()=>4.2);
  return {bonus,intro,steady};
}

// A first-year, constant-balance comparison, not a repayment schedule.
// Offset loan rate = base loan rate + premium (percentage points).
export function offsetCostExample({loan=600000,offset=40000,rate=6,premium=.2,fee=395}={}){
  check(loan,'loan balance');check(offset,'average offset balance');
  check(rate,'base rate',30);check(premium,'rate premium',10);check(fee,'additional annual fees',10000);
  const offsetRate=rate+premium,eligibleOffset=Math.min(offset,loan);
  const avoidedInterest=eligibleOffset*offsetRate/100;
  const extraRateCost=loan*premium/100,cost=extraRateCost+fee;
  return {eligibleOffset,offsetRate,avoidedInterest,extraRateCost,fee,net:avoidedInterest-cost,breakEven:offsetRate===0?(cost===0?0:null):cost/(offsetRate/100),interestBalance:Math.max(0,loan-offset)};
}

// This learning example uses a flat 12% contribution and deliberately excludes
// other package benefits, cap rules and PAYG. It is not the salary engine.
export function salaryPackageExample({quote=90000}={}){
  check(quote,'annual quote',250000);
  const includedCash=quote/1.12,includedSuper=quote-includedCash;
  return {includedCash,includedSuper,plusCash:quote,plusSuper:quote*.12,cashDifference:quote-includedCash};
}

export function calculatorExample(kind){
  if(kind==='compound-interest'){
    const r=savingsOfferExample();
    return {area:'savings',title:'A bigger advertised rate can earn less.',intro:'Start with $20,000 and add $200 at the end of each month. Compare three fictional accounts over one year.',cards:[['5% bonus offer',dollars(r.bonus.interest),'0.5% in the final 3 months when conditions are missed.'],['5.5% welcome offer',dollars(r.intro.interest),'5.5% for 4 months, then 3.5% for 8 months.'],['4.2% steady rate',dollars(r.steady.interest),'Same illustrative rate for all 12 months.']],unit:'Estimated interest earned · before tax and fees',takeaway:'Compare the money earned across your whole timeframe, not just the number on an advertisement.',assumption:'Monthly compounding; no withdrawals. All rates are hypothetical and are not forecasts or bank offers.',guide:'savings-rate-reality-check',label:'Try the rate reality check'};
  }
  if(kind==='mortgage'){
    const r=offsetCostExample();
    return {area:'home',title:'Does your offset cover its extra costs?',intro:'Compare a $600,000 loan at 6% without an offset with a 6.2% offset loan. Keep an average $40,000 in a full offset and allow $395 in extra annual fees.',cards:[['Interest avoided',dollars(r.avoidedInterest),'$40,000 × 6.2%.'],['Extra costs',dollars(r.extraRateCost+r.fee),'$1,200 rate premium + $395 fees.'],['Estimated net saving',dollars(r.net),'Interest avoided, less both extra costs.']],unit:'First-year illustration · constant balances',takeaway:'The offset saves interest, but the higher loan rate and fees use up some of that saving.',assumption:'A starting comparison, not the calculator’s amortising schedule. Balances and rates stay fixed; refinancing costs and alternative savings returns are excluded.',guide:'when-an-offset-pays-for-itself',label:'Check your offset break-even'};
  }
  if(kind==='salary'){
    const r=salaryPackageExample();
    return {area:'pay',title:'“$90,000” can mean two different salaries.',intro:'Compare an annual package including 12% employer super with a cash salary plus 12% super.',cards:[['$90,000 including super',dollars(r.includedCash),'Annual cash salary before tax.'],['$90,000 plus super',dollars(r.plusCash),'Annual cash salary before tax.'],['Difference in cash salary',dollars(r.cashDifference),'Before tax; the take-home difference is smaller.']],unit:'Same quoted number · different cash salary',takeaway:'Ask whether the offer includes super before comparing jobs or planning your spending.',assumption:'Flat 12% employer super only, within the example range. No other package benefits, salary sacrifice or tax. Super contributions are separate from take-home pay.',guide:'salary-including-super-vs-plus-super',label:'Compare the two package types'};
  }
  if(kind==='savings-goal'){
    const a=requiredSavings({principal:10000,target:30000,years:3,annualRate:0}),b=requiredSavings({principal:10000,target:30000,years:3,annualRate:4});
    return {area:'savings',title:'Build a plan that still works at a lower rate.',intro:'You have $10,000 and want $30,000 in 3 years. Change only the rate to see how much the monthly saving changes.',cards:[['At 0% interest',dollars(a,2),'Needed each month.'],['At 4% interest',dollars(b,2),'Needed each month.'],['Monthly difference',dollars(a-b,2),'Extra saving needed if no interest is earned.']],unit:'End-of-month contributions · 36 months',takeaway:'Use the lower-rate result as a stress test. Interest helps, but regular saving does most of the work.',assumption:'Constant rate, monthly compounding, no tax or fees. A home deposit target also needs an allowance for buying costs.',guide:'planning-a-home-deposit',label:'Build a realistic home deposit plan'};
  }
  if(kind==='emergency-fund'){
    const a=emergencyFund({expenses:3000,months:3,existing:2000,contribution:400});
    return {area:'savings',title:'A buffer you can build one payday at a time.',intro:'Essential bills cost $3,000 a month. You choose a 3-month buffer, already have $2,000 set aside and can add $400 a month.',cards:[['Your chosen target',dollars(a.target),'$3,000 × 3 months.'],['Still to save',dollars(a.gap),'Target less your dedicated savings.'],['Time to close the gap',`${a.monthsToGoal} months`,'Rounded up at $400 a month.']],unit:'No interest assumed · no withdrawals',takeaway:'This is a target you choose, not a universal rule. Keep the buffer accessible and separate from money already needed for bills.',assumption:'Constant essential expenses and contributions. Irregular income or an emergency withdrawal can change the timeline.',guide:'building-an-emergency-fund',label:'Choose the right expenses for your buffer'};
  }
  if(kind==='lvr'){
    const a=homeDeposit({price:800000,deposit:160000}),b=homeDeposit({price:800000,deposit:160000,valuation:760000});
    return {area:'home',title:'A 20% deposit does not always mean 80% LVR.',intro:'You pay $800,000 and put in $160,000. The $640,000 loan stays the same, but the lender may value the home differently.',cards:[['Valued at $800,000',`${a.lvr.toFixed(1)}%`,'$640,000 ÷ $800,000.'],['Valued at $760,000',`${b.lvr.toFixed(1)}%`,'$640,000 ÷ $760,000.'],['Extra deposit for 80%',dollars(b.additionalFor80),'On the lower valuation, before added loan costs.']],unit:'LVR = loan ÷ lender valuation × 100',takeaway:'Use the lender’s valuation when checking LVR. The sale price alone may give you a different answer.',assumption:'Buying costs are excluded. An 80% LVR does not guarantee approval or an LMI waiver; lender and scheme conditions differ.',guide:'lvr-and-lmi',label:'Understand LVR and mortgage insurance'};
  }
  throw new RangeError('Unknown example.');
}
