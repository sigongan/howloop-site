import {baseRateModel,savings} from './finance.mjs';
import {rateSummary} from './rate-summary.mjs';
import {compareBankScenarios} from './bank-scenarios.mjs';
import {bankFreshness} from './bank-freshness.mjs';
import {withinAccountLimits,hasAmbiguousRateText} from './bank-rate-safety.mjs';

const restricted = /business|trust|smsf|superannuation|corporate|community|charity|commercial|farm|statutory|solicitor|body corporate|offset|loan|pension|retire|junior|youth|kid|child|student|teen|christmas|settlement|foreign|\b(?:USD|GBP|EUR)\b/i;
export function isSavingsCandidate(product) {
 if(!product || !/sav|optimiser|growth|stash/i.test(product.name??'') || restricted.test(product.name))return false;
 const eligibility=Array.isArray(product.eligibility)?product.eligibility:[];
 if(eligibility.some(e=>e.eligibilityType==='MAX_AGE'||e.eligibilityType==='MIN_AGE'&&Number(e.additionalValue)>18))return false;
 const types=new Set(eligibility.map(e=>e.eligibilityType));
 if(types.has('BUSINESS')&&!types.has('NATURAL_PERSON'))return false;
 if(types.has('PENSION_RECIPIENT'))return false;
 const eligibilityText=eligibility.map(e=>[e.additionalInfo,e.additionalValue].filter(Boolean).join(' ')).join(' ');
 if(/\bonly\b.{0,40}\b(?:self[ -]managed super(?:annuation)? funds?|SMSFs?)\b|\b(?:self[ -]managed super(?:annuation)? funds?|SMSFs?)\b.{0,30}\bonly\b/i.test(eligibilityText))return false;
 return Array.isArray(product.depositRates)&&product.depositRates.length>0;
}
// Five-year figures test possible rate paths; they do not predict a bank's variable rates.
export function fiveYearBaseOutlook(product,{principal,contribution=0}) {
 const base=baseRateModel(product);
 if(!base)return null;
 const inputs={principal,contribution,frequency:'monthly',years:5};
 const project=shift=>savings({...inputs,rateForBalance:(balance,month)=>Math.max(0,base(balance)+(month>12?shift:0))});
 try{
  const unchanged=project(0),lower=project(-1),higher=project(1);
  if(![unchanged,lower,higher].every(result=>withinAccountLimits(product,principal,result.balance)))return null;
  return {unchanged,lower,higher};
 }catch{return null;}
}
export function compareSavings(banks, {principal,contribution=0,months=12,currentRate=null,scenario='base'}, now=Date.now()) {
 if(!Array.isArray(banks))throw Error('Bank data is unavailable.');
 if(![3,6,12].includes(months))throw Error('Choose 3, 6 or 12 months.');
 if(!['base','conditional'].includes(scenario))throw Error('Choose a rate scenario.');
 if(currentRate!==null && (typeof currentRate!=='number'||!Number.isFinite(currentRate)||currentRate<0||currentRate>30))throw Error('Enter a current rate from 0% to 30%, or leave it blank.');
 const inputs={principal,contribution,frequency:'monthly',years:months/12};
 // Validate amounts even when no banks can be compared.
 const baseline=savings({...inputs,annualRate:currentRate??0});
 const rows=[], excluded={stale:0,unsupported:0},seen=new Set();
 for(const bank of banks){
  const fresh=bankFreshness(bank,now);
  for(const product of bank.products??[]){
   if(!isSavingsCandidate(product))continue;
   const key=bank.id+':'+product.id;
   if(seen.has(key))continue;
   seen.add(key);
   if(!fresh.usable){excluded.stale++;continue;}
   try{
    const summary=rateSummary(product,principal);
    const baseRows=product.depositRates.filter(r=>r.depositRateType==='VARIABLE');
    if(summary.base===null||hasAmbiguousRateText(baseRows)||!withinAccountLimits(product,principal,principal)){excluded.unsupported++;continue;}
    const scenarios=compareBankScenarios(product,inputs);
    if(!scenarios){excluded.unsupported++;continue;}
    const hasExtra=product.depositRates.some(r=>r.depositRateType!=='VARIABLE');
    // Never silently substitute base-only interest for an unsupported bonus scenario.
    const conditionalAvailable=!!scenarios.conditional&&!hasAmbiguousRateText(product.depositRates.filter(r=>r.depositRateType!=='VARIABLE'));
    if(scenario==='conditional'&&hasExtra&&!conditionalAvailable){excluded.unsupported++;continue;}
    const conditional=scenario==='conditional'?scenarios.conditional:null;
    const result=conditional?.result??scenarios.base;
    if(!withinAccountLimits(product,principal,result.balance)){excluded.unsupported++;continue;}
    rows.push({key,bankId:bank.id,bankName:bank.name,checkedAt:bank.checkedAt,product,
     baseRate:summary.base,startRate:conditional?conditional.rateForBalance(principal,1):summary.base,
     type:conditional?.type??'BASE',welcomeMonths:conditional?.welcomeMonths??null,
     interest:result.interest,balance:result.balance,baseInterest:scenarios.base.interest,
     difference:currentRate===null?null:result.interest-baseline.interest,
     hasExtra,conditionalAvailable,longTerm:fiveYearBaseOutlook(product,inputs)});
   }catch{excluded.unsupported++;}
  }
 }
 rows.sort((a,b)=>b.interest-a.interest||a.bankName.localeCompare(b.bankName)||a.product.name.localeCompare(b.product.name));
 return {rows,excluded,baseline:currentRate===null?null:baseline,months};
}
