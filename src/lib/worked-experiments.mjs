import {calculateCashFlow} from './cash-flow.mjs';
import {savings} from './finance.mjs';
import {salaryBreakdown} from './salary.mjs';

export const experimentDate = '2026-10-17';
export function timingExperiment() {
 const input = {startDate:'2026-10-12',openingBalance:'400.00',buffer:'0.00',income:[{label:'Pay',amount:'2200.00',anchorDate:'2026-10-14',frequency:'fortnightly'}],bills:[{label:'Rent',amount:'1300.00',anchorDate:'2026-10-12',frequency:'fortnightly'},{label:'Living costs',amount:'300.00',anchorDate:'2026-10-16',frequency:'weekly'}]};
 const original = calculateCashFlow(input);
 const changedInput = {...input,bills:input.bills.map((bill,i)=>i===0?{...bill,anchorDate:'2026-10-14'}:bill)};
 const changed = calculateCashFlow(changedInput);
 return {input,changedInput,original,changed};
}
export function offerExperiment() {
 return {packageOffer:salaryBreakdown({amount:100000,includesSuper:true}),plusOffer:salaryBreakdown({amount:95000,includesSuper:false})};
}
// Each missed month is modelled explicitly; no real product or eligibility is implied.
export function bonusExperiment(missedMonths=3) {
 if(!Number.isInteger(missedMonths)||missedMonths<0||missedMonths>12)throw new RangeError('Choose 0 to 12 missed months.');
 const input={principal:10000,contribution:200,years:1};
 const scenarios=[{label:'Steady 4%',rate:()=>4},{label:'5% bonus, missed months first',rate:(_,m)=>m<=missedMonths?1:5},{label:'5% bonus, missed months last',rate:(_,m)=>m>12-missedMonths?1:5}];
 return {input,missedMonths,scenarios:scenarios.map(s=>({...s,rate:undefined,...savings({...input,rateForBalance:s.rate}),months:Array.from({length:12},(_,i)=>({month:i+1,rate:s.rate(0,i+1)}))}))};
}
export function experimentEvidence(){return {created:experimentDate,currency:'AUD',status:'Constructed educational scenarios, not customer records or bank offers',timing:timingExperiment(),offers:offerExperiment(),bonus:bonusExperiment()};}
