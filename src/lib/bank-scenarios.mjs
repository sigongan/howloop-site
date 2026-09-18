import {baseRateModel,savings} from './finance.mjs';
import {rateSummary} from './rate-summary.mjs';

// A scenario is an explicit assumption, not a determination of customer eligibility.
// Daily welcome periods cannot be represented by this monthly approximation.
export function conditionalRateModel(product,startingBalance) {
 const base=baseRateModel(product),summary=rateSummary(product,startingBalance),c=summary.conditional;
 if(!base||!c)return null;
 let welcomeMonths=null;
 if(c.type==='INTRODUCTORY'){
  const match=/^P([1-9]\d*)([MY])$/.exec(c.duration??'');
  if(!match)return null;
  welcomeMonths=Number(match[1])*(match[2]==='Y'?12:1);
  if(welcomeMonths>600)return null;
 }
 const rateForBalance=(balance,month=1)=>{
  if(welcomeMonths!==null&&month>welcomeMonths)return base(balance);
  const current=rateSummary(product,balance).conditional;
  if(!current||current.type!==c.type||current.duration!==c.duration)throw Error('The published conditions or balance tiers cannot cover this whole plan. Check a custom scenario with the bank.');
  return current.total;
 };
 return {rateForBalance,type:c.type,welcomeMonths};
}
export function compareBankScenarios(product,inputs) {
 const base=baseRateModel(product);
 if(!base)return null;
 const basic=savings({...inputs,rateForBalance:base});
 const candidate=conditionalRateModel(product,inputs.principal);
 if(!candidate)return {base:basic,conditional:null};
 try{return {base:basic,conditional:{...candidate,result:savings({...inputs,rateForBalance:candidate.rateForBalance})}};}
 catch{return {base:basic,conditional:null};}
}
