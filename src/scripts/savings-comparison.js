import {compareSavings} from '../lib/savings-comparison.mjs';
import {parseAmount,prepareMoneyFields} from '../lib/money-input.mjs';
import {conditionList,conditionText,feeLines,tierLines} from '../lib/product-display.mjs';
const root=document.querySelector('[data-savings-comparison]');
if(root){
 const q=s=>root.querySelector(s),form=q('form'),fields=prepareMoneyFields(form),list=q('[data-comparison-list]');
 const money=n=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:2}).format(n);
 const percent=n=>new Intl.NumberFormat('en-AU',{minimumFractionDigits:2,maximumFractionDigits:4}).format(n)+'%';
 const date=value=>new Date(value).toLocaleDateString('en-AU',{timeZone:'Australia/Brisbane',day:'numeric',month:'short',year:'numeric'});
 const el=(parent,tag,text,cls)=>{const item=document.createElement(tag);if(text!==undefined)item.textContent=text;if(cls)item.className=cls;parent.append(item);return item;};
 const safeURL=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}};
 let data=null,result=null,limit=10;
 function link(parent,text,href,external=false){const a=el(parent,'a',text);a.href=href;if(external){a.target='_blank';a.rel='noopener noreferrer';}return a;}
 function terms(parent,product){
  const details=el(parent,'details'),summary=el(details,'summary','Conditions, eligibility & fees'),content=el(details,'div',undefined,'comparison-terms');
  if(product.description)el(content,'p',product.description);
  el(content,'p','These are the bank’s published terms. We do not check whether you qualify.');
  el(content,'h4','Rates and conditions');
  const rates=el(content,'ul');
  for(const rate of product.depositRates??[]){
   const entry=el(rates,'li');el(entry,'strong',percent(Number(rate.rate)*100)+' '+String(rate.depositRateType).toLowerCase().replaceAll('_',' '));
   const text=[rate.additionalValue,rate.additionalInfo,...conditionList(rate.applicabilityConditions).map(conditionText),...(rate.tiers??[]).flatMap(tierLines)].filter(Boolean);
   for(const line of [...new Set(text)])el(entry,'p',line);
  }
  for(const [title,entries,type]of [['Eligibility',product.eligibility,'eligibilityType'],['Balance limits and other constraints',product.constraints,'constraintType']]){
   el(content,'h4',title);const ul=el(content,'ul');
   if(!entries?.length)el(ul,'li','No entries supplied. Confirm with the bank.');
   else for(const entry of entries)el(ul,'li',[entry[type]?.replaceAll('_',' '),entry.additionalValue,entry.additionalInfo].filter(Boolean).join(' · '));
  }
  el(content,'h4','Fees — not deducted from these estimates');const fees=el(content,'ul');
  if(!product.fees?.length)el(fees,'li','No fee entries supplied. This does not mean the account is free.');
  else for(const fee of product.fees)el(fees,'li',feeLines(fee).join(' '));
  const source=safeURL(product.source);if(source)link(content,'View source product data',source,true);
 }
 function render(){
  list.replaceChildren();if(!result)return;
  const normalise=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
  const aliases={cba:'commbank',commonwealth:'commbank',commonwealthbank:'commbank',nab:'nationalaustraliabank'};
  const typed=normalise(q('[name="bankSearch"]').value),query=aliases[typed]??typed;
  const rows=result.rows.filter(r=>normalise(r.bankName+' '+r.product.name).includes(query));
  q('[data-comparison-summary]').textContent=rows.length+' supported accounts · sorted by estimated '+result.months+'-month interest, highest first.';
  const baseline=q('[data-comparison-baseline]');
  baseline.hidden=result.baseline===null;
  if(result.baseline)baseline.textContent='At your current rate: '+money(result.baseline.interest)+' estimated interest over '+result.months+' months, before fees and tax.';
  const empty=q('[data-comparison-empty]');empty.hidden=rows.length!==0;
  empty.textContent=typed?'No supported accounts match this search. Try another bank or clear the search.':'No fresh, supported accounts fit this scenario. Try base rates or a different amount. You can also check the bank directory.';
  for(const row of rows.slice(0,limit)){
   const card=el(list,'article',undefined,'comparison-account'),head=el(card,'div',undefined,'comparison-account-head'),identity=el(head,'div');
   el(identity,'span',row.bankName,'comparison-bank-name');el(identity,'h3',row.product.name);
   el(identity,'p','Retrieved '+date(row.checkedAt),'comparison-retrieved');
   const values=el(card,'dl',undefined,'comparison-values');
   const metric=(label,value,cls)=>{const div=el(values,'div');el(div,'dt',label);el(div,'dd',value,cls);};
   metric('Starting rate · p.a.',percent(row.startRate));
   metric(result.months+'-month interest*',money(row.interest));
   metric('Difference vs your rate*',row.difference===null?'Add your rate':(row.difference>0?'+':'')+money(row.difference),row.difference>0?'positive':row.difference<0?'negative':'');
   const note=row.type==='INTRODUCTORY'?'Welcome rate for '+row.welcomeMonths+' months from opening, then '+percent(row.baseRate)+' base. Assumes you qualify for the full welcome period.':row.type==='BONUS'?'Bonus conditions assumed met every month. Base rate at this balance: '+percent(row.baseRate)+'.':row.hasExtra?'Base rate only. This account also has conditional offers; they are excluded here.':'Base-rate scenario. Eligibility and account conditions still apply.';
   el(card,'p',note+' *Before fees and tax.','comparison-rate-note');
   if(row.longTerm){
    const outlook=el(card,'details',undefined,'comparison-outlook');
    el(outlook,'summary','5-year rate-change example');
    const body=el(outlook,'div',undefined,'comparison-outlook-body');
    el(body,'p','What if the published base rates stay the same, or move after year one? Bonus and welcome rates are excluded. This is not a rate forecast.');
    const cases=el(body,'div',undefined,'comparison-outlook-cases');
    for(const [label,value,change] of [
     ['Base rates unchanged',row.longTerm.unchanged,null],
     ['Up to 1 percentage point lower',row.longTerm.lower,row.longTerm.lower.interest-row.longTerm.unchanged.interest],
     ['1 percentage point higher',row.longTerm.higher,row.longTerm.higher.interest-row.longTerm.unchanged.interest]
    ]){
     const item=el(cases,'div',undefined,'comparison-outlook-case');
     el(item,'span',label);el(item,'strong',money(value.interest));
     el(item,'small',change===null?'Gross interest over five years':(change>0?'+':'')+money(change)+' vs unchanged');
    }
    el(body,'p','In the unchanged example you put in '+money(row.longTerm.unchanged.deposits)+' and finish with '+money(row.longTerm.unchanged.balance)+'. Rates can move differently for each bank. Fees and tax are excluded.','comparison-outlook-footnote');
   }
   terms(card,row.product);
   const actions=el(card,'div',undefined,'comparison-account-links');
   const provider=safeURL(row.product.url);if(provider)link(actions,'Check with the bank ↗',provider,true);
   link(actions,'Explore this product →','/calculators/compound-interest/?bank='+encodeURIComponent(row.bankId)+'&product='+encodeURIComponent(row.product.id));
  }
  const more=q('[data-comparison-more]');more.hidden=rows.length<=limit;more.textContent='Show '+Math.min(10,Math.max(0,rows.length-limit))+' more accounts';
  const omitted=result.excluded;
  q('[data-comparison-coverage]').textContent='This is part of the market, not every bank or account. '+omitted.stale+' savings products excluded for old or incomplete data; '+omitted.unsupported+' excluded because their rates cannot be modelled reliably in this scenario. Fees, eligibility and account features can change your choice.';
 }
 function calculate(){
  const error=q('[data-comparison-error]');
  try{
   fields.validate();
   if(!form.checkValidity())throw Error('Check your amounts and rate. Use non-negative amounts and a rate from 0% to 30%.');
   if(!data)throw Error('Bank data is still loading. Please try again shortly.');
   const current=form.elements.currentRate.value.trim();
   const inputs={principal:parseAmount(form.elements.principal.value),contribution:parseAmount(form.elements.contribution.value),months:Number(form.elements.months.value),currentRate:current===''?null:Number(current),scenario:form.elements.scenario.value};
   result=compareSavings(data.banks,inputs);limit=10;error.hidden=true;
   const note=q('[data-scenario-note]'),conditional=inputs.scenario==='conditional';
   note.classList.toggle('is-conditional',conditional);
   note.textContent=conditional?'Scenario only: assumes you meet every bonus condition. Welcome offers expire after their stated period. Fees and tax are excluded.':'Base rates exclude bonus and welcome offers. All estimates are before fees and tax.';
   render();return true;
  }catch(e){error.textContent=e.message;error.hidden=false;result=null;list.replaceChildren();q('[data-comparison-baseline]').hidden=true;q('[data-comparison-more]').hidden=true;q('[data-comparison-empty]').hidden=true;q('[data-comparison-summary]').textContent='Check your inputs to compare.';q('[data-comparison-coverage]').textContent='';return false;}
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!calculate()){form.querySelector(':invalid')?.focus();return;}
  q('#comparison-results-title').focus({preventScroll:true});
  q('.comparison-results').scrollIntoView({behavior:'auto',block:'start'});
 });
 form.addEventListener('input',()=>{if(data)calculate();});
 q('[name="bankSearch"]').addEventListener('input',()=>{limit=10;render();});
 q('[data-comparison-more]').addEventListener('click',()=>{limit+=10;render();});
 fetch('/data/savings-comparison.json',{signal:AbortSignal.timeout(15000)}).then(response=>{if(!response.ok)throw Error();return response.json();}).then(payload=>{
  if(!Array.isArray(payload.banks))throw Error();data=payload;q('[type="submit"]').disabled=false;calculate();
 }).catch(()=>{q('[data-comparison-summary]').textContent='Bank data could not load. Reload to try again, or use the bank directory.';const notice=q('[data-comparison-empty]');notice.hidden=false;notice.textContent='You can still browse dated product information in our bank directory.';link(notice,' Browse banks →','/banks/');});
}
