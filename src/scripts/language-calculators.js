import {FIELDS,KINDS,LANGUAGE_STATE_KEY,calculateLanguageTool,formatMoney,formatCount,readLanguageState,cleanValues,parseLocalizedNumber} from '../lib/language-calculators.mjs';
import {PAYROLL} from '../data/payroll-2026.mjs';

const root=document.querySelector('[data-language-tools]');
if(root){
 const copy=JSON.parse(document.getElementById('language-calculator-copy').textContent);
 const locale=root.dataset.locale;
 const selector=root.querySelector('[data-tool-select]');
 const forms=[...root.querySelectorAll('[data-tool-form]')];
 const interpolate=(text,data={})=>Object.entries(data).reduce((str,[key,value])=>str.replaceAll('{'+key+'}',String(value)),text);
 const values=form=>Object.fromEntries(FIELDS[form.dataset.toolForm].map(field=>[field.name,field.type==='checkbox'?form.elements.namedItem(field.name).checked:form.elements.namedItem(field.name).value]));
 function render(form,report=false){
  const kind=form.dataset.toolForm,section=form.closest('[data-tool]'),error=form.querySelector('[data-tool-error]');
  form.querySelectorAll('[aria-invalid]').forEach(input=>input.removeAttribute('aria-invalid'));
  try{
   const r=calculateLanguageTool(kind,values(form));
   section.querySelector('[data-result-label]').textContent=copy[r.label];
   section.querySelector('[data-result-total]').textContent=formatMoney(r.total,locale);
   section.querySelector('[data-result-sub]').textContent=r.sub?interpolate(copy[r.sub],r.subData):copy.aud;
   const stats=section.querySelector('[data-result-stats]');stats.replaceChildren();
   for(const [key,value,type] of r.stats){
    const row=document.createElement('div'),label=document.createElement('dt'),amount=document.createElement('dd');
    label.textContent=copy[key];amount.dir='auto';amount.textContent=value===null?copy.noContribution:type==='number'?formatCount(value,locale):formatMoney(value,locale);
    row.append(label,amount);stats.append(row);
   }
   const bar=section.querySelector('[data-money-bar]');bar.hidden=r.bar===undefined;
   section.querySelector('[data-deposit-bar]').style.width=(r.bar??0)+'%';
   error.hidden=true;
   section.querySelector('[data-result]').removeAttribute('data-invalid');
   return true;
  }catch(problem){
   error.hidden=false;
   // Clear stale money rather than showing a result for an invalid new input.
   section.querySelector('[data-result-total]').textContent='—';
   section.querySelector('[data-result-sub]').textContent=copy.error;
   section.querySelector('[data-result-stats]').replaceChildren();
   section.querySelector('[data-money-bar]').hidden=true;
   section.querySelector('[data-result]').setAttribute('data-invalid','');
   const field=form.elements.namedItem(problem.message);
   if(field){field.setAttribute('aria-invalid','true');if(report)field.focus();}
   return false;
  }
 }
 function select(kind){
  const safe=KINDS.includes(kind)?kind:KINDS[0];
  root.dataset.activeTool=safe;selector.value=safe;
  root.querySelectorAll('[data-tool]').forEach(section=>section.hidden=section.dataset.tool!==safe);
 }
 let restored;
 try{restored=readLanguageState(sessionStorage.getItem(LANGUAGE_STATE_KEY));sessionStorage.removeItem(LANGUAGE_STATE_KEY);}catch{}
 if(restored)for(const form of forms){
  const saved=restored.values[form.dataset.toolForm];if(!saved)continue;
  for(const field of FIELDS[form.dataset.toolForm]){
   const input=form.elements.namedItem(field.name);
   if(field.type==='checkbox')input.checked=saved[field.name];else input.value=String(saved[field.name]);
  }
 }
 select(KINDS.includes(location.hash.slice(1))?location.hash.slice(1):restored?.kind);
 function saveForLanguage(){
  const plans={};for(const form of forms){try{plans[form.dataset.toolForm]=cleanValues(form.dataset.toolForm,values(form));}catch{}}
  try{sessionStorage.setItem(LANGUAGE_STATE_KEY,JSON.stringify({at:Date.now(),kind:root.dataset.activeTool,values:plans}));}catch{}
 }
 document.addEventListener('howloop:save-language-inputs',saveForLanguage);
 selector.addEventListener('change',()=>{select(selector.value);history.replaceState(null,'','#'+selector.value);});
 window.addEventListener('hashchange',()=>select(location.hash.slice(1)));
 for(const form of forms){
  form.querySelector('[type="submit"]').disabled=false;
  render(form);
  form.addEventListener('input',()=>render(form));
  form.addEventListener('change',()=>render(form));
  form.addEventListener('submit',event=>{
   event.preventDefault();if(!render(form,true))return;
   const result=form.closest('[data-tool]').querySelector('[data-result]');
   result.focus({preventScroll:true});result.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
  form.querySelectorAll('input[type="text"]').forEach(input=>input.addEventListener('blur',()=>{
   const amount=parseLocalizedNumber(input.value);
   if(Number.isFinite(amount)&&!input.hasAttribute('aria-invalid'))input.value=String(amount);
  }));
 }
 root.querySelector('[data-clear-language]').addEventListener('click',()=>{
  try{sessionStorage.removeItem(LANGUAGE_STATE_KEY);}catch{}
  forms.forEach(form=>{form.reset();render(form);});
  select(KINDS[0]);history.replaceState(null,'',location.pathname);selector.focus();
 });
 const date=new Date().toLocaleDateString('en-CA',{timeZone:'Australia/Brisbane'});
 const yearWarning=root.querySelector('[data-pay-year-warning]');
 if(yearWarning)yearWarning.hidden=date>=PAYROLL.effectiveFrom&&date<=PAYROLL.effectiveTo;
}
