import {savings,requiredSavings,mortgage,emergencyFund,baseRateModel} from '../lib/finance.mjs';
import {rateSummary,formatRate,introductoryPeriod} from '../lib/rate-summary.mjs';
import {feeLines,tierLines,conditionText,conditionList} from '../lib/product-display.mjs';
const money=n=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(n);
const precise=n=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const safeURL=url=>{try{const u=new URL(url);return u.protocol==='https:'?u.href:null;}catch{return null;}};
for(const root of document.querySelectorAll('[data-calculator]')){
const kind=root.dataset.calculator,form=root.querySelector('form'),q=s=>root.querySelector(s),output=(name,text)=>{q('[data-'+name+']').textContent=text;};
const inputs=()=>Object.fromEntries([...form.querySelectorAll('[name]')].map(el=>[el.name,el.type==='number'?Number(el.value):el.value]));
const key='howloop-plan-v1-'+kind;let rows=[],headers=[],model=null,modelLabel='',products=[],requestVersion=0;
const insight=q('.calc-insights');if(insight)insight.open=!matchMedia('(max-width:600px)').matches;
const unchangedRateNote='Custom rate unchanged - confirm or edit the annual rate before relying on this scenario.';
let rateHint=null;
if(kind==='compound-interest'){
 const rateInput=form.elements.annualRate;
 rateHint=rateInput.closest('label').querySelector('small')??document.createElement('small');
 rateHint.id='howloop-'+kind+'-annual-rate-note';rateHint.setAttribute('aria-live','polite');
 rateInput.closest('label').append(rateHint);
 rateInput.setAttribute('aria-describedby',[rateInput.getAttribute('aria-describedby'),rateHint.id].filter(Boolean).join(' '));
 setRateHint('Example rate · edit or choose a bank');
}
function setRateHint(message,attention=false){
 if(!rateHint)return;
 rateHint.textContent=message;rateHint.style.fontWeight=attention?'700':'';
 rateHint.style.color=attention?'#854a18':'';
}
function chart(points,keys,labels){
const width=520,height=175,left=48,top=15,bottom=153;
const max=Math.max(1,...points.flatMap(p=>keys.map(k=>p[k]??0)));const total=Math.max(1,points.at(-1)?.month??1);
const pt=(p,k)=>(left+(p.month/total)*(width-left-12)).toFixed(2)+','+(bottom-((p[k]??0)/max)*(bottom-top)).toFixed(2);
const grid=[0,.5,1].map(x=>{const y=bottom-x*(bottom-top);return '<line x1="'+left+'" x2="510" y1="'+y+'" y2="'+y+'" stroke="#e7ebf5"/><text x="0" y="'+(y+4)+'" fill="#718099" font-size="9">'+(max*x>=1000?'$'+Math.round(max*x/1000)+'k':money(max*x))+'</text>';}).join('');
const lines=keys.map((k,i)=>'<polyline points="'+points.map(p=>pt(p,k)).join(' ')+'" fill="none" stroke="'+(i?'#9a8be8':'#3678ed')+'" stroke-width="'+(i?2:3)+'" '+(i?'stroke-dasharray="5 5"':'')+'/>').join('');
q('[data-chart]').innerHTML='<svg class="hl-result-chart" viewBox="0 0 520 175" role="img" aria-label="'+labels.join(' compared with ')+' over time">'+grid+lines+'<text x="'+left+'" y="173" fill="#718099" font-size="9">Today</text><text x="470" y="173" fill="#718099" font-size="9">Year '+(total/12).toFixed(total%12?1:0)+'</text></svg>';
q('[data-legend]').replaceChildren(...labels.map(label=>{const s=document.createElement('span');s.textContent=label;return s;}));
}
function table(){
const table=document.querySelector('[data-results-table]');table.querySelector('thead').replaceChildren();table.querySelector('tbody').replaceChildren();
const head=document.createElement('tr');headers.forEach(h=>{const th=document.createElement('th');th.scope='col';th.textContent=h;head.append(th);});table.querySelector('thead').append(head);
rows.forEach(row=>{const tr=document.createElement('tr');row.forEach((value,i)=>{const td=document.createElement('td');td.textContent=i===0?String(value):precise(value);tr.append(td);});table.querySelector('tbody').append(tr);});
}
function invalidate(message){q('[data-error]').hidden=false;q('[data-error]').textContent=message;output('result-total','—');output('result-sub','Check your inputs to update this result.');output('stat1','—');output('stat2','—');output('scenario','');q('[data-chart]').replaceChildren();q('[data-legend]').replaceChildren();rows=[];table();if(kind==='compound-interest')renderRateSummary();}
function calculate(){
if(!form.checkValidity()){invalidate('Enter valid numbers within the limits shown in each field.');return false;}
try{
q('[data-error]').hidden=true;const data=inputs();
if(kind==='compound-interest'){
const result=savings({...data,rateForBalance:model??undefined});output('result-label','Your projected balance');output('result-total',money(result.balance));output('result-sub','After '+data.years+(data.years===1?' year':' years')+' · before tax and fees');output('stat1-label','Money you put in');output('stat1',money(result.deposits));output('stat2-label','Interest earned');output('stat2',money(result.interest));chart(result.rows,['balance','deposits'],['Projected balance','Your deposits']);
const more=savings({...data,contribution:data.contribution+50,rateForBalance:model??undefined});output('scenario','What if you saved $50 more '+data.frequency+'? Your projected balance would be '+money(more.balance)+' — '+money(more.balance-result.balance)+' more over the same period.');
headers=['Year','Your deposits (AUD)','Interest (AUD)','Balance (AUD)'];rows=result.rows.map(r=>[Number(r.year.toFixed(2)),r.deposits,r.interest,r.balance]);
if(model){const rate=model(data.principal);form.elements.annualRate.value=rate.toFixed(4);output('rate-model',modelLabel+' · base rate only, tiers recalculated as balance grows');}
renderRateSummary();
}else if(kind==='mortgage'){
const result=mortgage(data);output('result-label','Your regular monthly repayment');output('result-total',money(result.payment));output('result-sub',precise(result.payment)+' monthly, plus '+money(data.extra)+' extra');output('stat1-label','Interest with your plan');output('stat1',money(result.plan.interest));output('stat2-label','Interest saved');output('stat2',money(result.interestSaved));
const sampleMonths=[...new Set([...result.base.rows,...result.plan.rows].map(r=>r.month))].sort((a,b)=>a-b);const interpolate=(rows,m)=>{const exact=rows.find(r=>r.month===m);if(exact)return exact.balance;const before=rows.filter(r=>r.month<m).at(-1),after=rows.find(r=>r.month>m);if(!after)return 0;if(!before)return rows[0].balance;return before.balance+(after.balance-before.balance)*(m-before.month)/(after.month-before.month);};const pts=sampleMonths.map(month=>({month,baseline:interpolate(result.base.rows,month),balance:interpolate(result.plan.rows,month)}));chart(pts,['balance','baseline'],['With offset & extra','Standard loan']);
const years=Math.floor(result.plan.months/12),months=result.plan.months%12;output('scenario','Your plan could repay the loan in '+years+' years'+(months?' '+months+' months':'')+'. That is '+result.monthsSaved+' months sooner than the standard schedule. The offset balance remains your separate savings.');
output('method-note','Monthly approximation of a principal-and-interest loan. Fixed rate and constant 100% offset. Excludes fees, tax, rate changes and lender-specific rounding. Actual lenders generally calculate interest daily.');
headers=['Month','Loan balance (AUD)','Interest paid to date (AUD)','Repayments to date (AUD)'];rows=result.plan.rows.map(r=>[r.month,r.balance,r.interest,r.paid]);
}else if(kind==='savings-goal'){
const required=requiredSavings(data);const result=savings({...data,contribution:required});output('result-label','Your monthly savings target');output('result-total',precise(required));output('result-sub','To reach '+money(data.target)+' in '+data.years+' years');output('stat1-label','Your deposits');output('stat1',money(result.deposits));output('stat2-label','Interest along the way');output('stat2',money(result.interest));chart(result.rows,['balance','deposits'],['Projected balance','Your deposits']);
output('scenario',required===0?'Your current savings already reach this goal under the assumptions entered.':'Give yourself one more year: the required monthly contribution becomes '+precise(requiredSavings({...data,years:Math.min(50,data.years+1)}))+'. Try a lower rate too, to allow for uncertainty.');
headers=['Year','Your deposits (AUD)','Interest (AUD)','Balance (AUD)'];rows=result.rows.map(r=>[r.year,r.deposits,r.interest,r.balance]);
}else{
const result=emergencyFund(data);output('result-label','Your target emergency buffer');output('result-total',money(result.target));output('result-sub',data.months+' months of essential expenses');output('stat1-label','Already set aside');output('stat1',money(data.existing));output('stat2-label','Left to build');output('stat2',money(result.gap));
const progress=result.target===0?100:Math.min(100,data.existing/result.target*100);q('[data-chart]').innerHTML='<div class="hl-progress" role="progressbar" aria-label="Emergency fund progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress.toFixed(0)+'"><div style="width:'+progress+'%"></div></div><p class="hl-help">'+Math.round(progress)+'% of your chosen target is already covered.</p>';q('[data-legend]').replaceChildren();
output('scenario',result.monthsToGoal===0?'You have reached your chosen buffer. Revisit your expenses when your situation changes.':result.monthsToGoal===null?'There is no completion date at $0 monthly savings. Enter an amount you can set aside to estimate a timeframe.':'At '+money(data.contribution)+' a month, you could close the gap in about '+result.monthsToGoal+' months. Interest is excluded from this estimate.');
output('method-note','Target = monthly essentials × months covered. Gap = target less existing dedicated savings, with a minimum of zero. Time rounds up to whole months. No interest, tax or withdrawals modelled.');
headers=['Measure','Amount (AUD)'];rows=[['Monthly essentials',data.expenses],['Target buffer',result.target],['Existing savings',data.existing],['Gap',result.gap],['Monthly contribution',data.contribution]];
}
table();return true;
}catch(e){invalidate('Please check your inputs. '+e.message);return false;}
}
form.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity()&&calculate()&&window.matchMedia('(max-width: 600px)').matches){const result=q('.calc-overview')??q('.hl-results');result.focus({preventScroll:true});result.scrollIntoView({behavior:'auto',block:'start'});}});
form.addEventListener('input',e=>{if(e.target.name){if(e.target.name==='annualRate'&&kind==='compound-interest'){model=null;output('rate-model','Custom constant rate - your edit overrides any bank model');setRateHint('Your rate · fixed for the full projection');}calculate();}});
const status=message=>output('action-status',message);
q('[data-export]').addEventListener('click',()=>{if(!calculate())return;const quote=x=>'"'+String(x).replaceAll('"','""')+'"';const csv=[headers,...rows.map(r=>r.map((v,i)=>i?Number(v).toFixed(2):v))].map(r=>r.map(quote).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='howloop-'+kind+'.csv';a.hidden=true;document.body.append(a);try{a.click();status('CSV download requested. Check your browser downloads.');}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}});
try{q('[data-load]').hidden=!localStorage.getItem(key);}catch{}
q('[data-save]').addEventListener('click',()=>{if(!calculate())return;try{localStorage.setItem(key,JSON.stringify({values:inputs(),bank:q('[data-bank-select]')?.value??'',product:q('[data-product-select]')?.value??'',bankModel:!!model}));q('[data-load]').hidden=false;status('Saved in this browser. Use Restore saved plan to return to these numbers.');}catch{status('Your browser did not allow local storage. You can download a CSV instead.');}});
q('[data-load]').addEventListener('click',async()=>{try{const saved=JSON.parse(localStorage.getItem(key));if(!saved?.values)throw Error();for(const el of form.querySelectorAll('[name]'))if(saved.values[el.name]!==undefined)el.value=String(saved.values[el.name]);model=null;if(q('[data-bank-select]')){q('[data-bank-select]').value=saved.bank??'';await loadBank(saved.product,saved.bankModel);}calculate();status('Saved inputs restored. Bank projections use the currently available dated snapshot.');}catch{status('This saved plan could not be restored.');}});
const remove=document.createElement('button');remove.type='button';remove.className='hl-plain-button';remove.textContent='Clear saved plan';q('.hl-result-actions').append(remove);remove.addEventListener('click',()=>{try{localStorage.removeItem(key);q('[data-load]').hidden=true;status('Saved plan removed from this browser.');}catch{status('Storage could not be cleared. Use your browser’s site-data settings.');}});
function append(parent,tag,text,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;parent.append(el);return el;}
function renderRateSummary(){
 const container=q('[data-rate-summary]'),product=products.find(p=>p.id===q('[data-product-select]')?.value);
 if(!container||!product)return;
 const balance=form.elements.principal.checkValidity()?Number(form.elements.principal.value):NaN;
 const summary=rateSummary(product,balance);
 const used=model?summary.base:form.elements.annualRate.checkValidity()?Number(form.elements.annualRate.value):null;
 container.replaceChildren();
 const grid=append(container,'div','','bank-rate-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label','Published rate comparison');
 function card(label,value,note,cls=''){
  const c=append(grid,'div','','bank-rate-card '+cls);append(c,'span',label);append(c,'strong',value);append(c,'small','per year · '+note);
 }
 if(summary.conditional){
  card('Base rate',formatRate(summary.base),'without the bonus','is-base');
  const intro=summary.conditional.type==='INTRODUCTORY';
  card(intro?'During the welcome offer*':'With qualifying bonus*',formatRate(summary.conditional.total),intro?introductoryPeriod(summary.conditional.duration):'if all conditions are met',intro?'is-intro':'is-bonus');
  append(container,'p',formatRate(summary.base)+' base + '+formatRate(summary.conditional.extra)+(intro?' introductory bonus. ':' bonus. ')+'At your starting balance; check eligibility below.','bank-rate-explainer');
 }else{
  const labels={VARIABLE:'Base rate',BONUS:'Conditional bonus',INTRODUCTORY:'Introductory bonus',BUNDLE_BONUS:'Bundle bonus',FIXED:'Fixed rate',FLOATING:'Floating rate',MARKET_LINKED:'Market-linked rate'};
  if(!summary.components.length)card('Published rates','Not supplied','confirm with the bank');
  for(const component of summary.components){
   const appliedBase=component.type==='VARIABLE'&&summary.base!==null;
   const value=appliedBase?formatRate(summary.base):component.min===null?'Not supplied':component.min===component.max?formatRate(component.min):formatRate(component.min)+'–'+formatRate(component.max);
   card(labels[component.type]??'Other published rate',value,appliedBase?'at your starting balance':component.incomplete?'incomplete data · check terms':component.type==='VARIABLE'?'check balance tiers':'conditions apply',component.type==='VARIABLE'?'is-base':'is-bonus');
  }
  if(summary.components.some(c=>c.type!=='VARIABLE'))append(container,'p','Rates shown separately. A combined rate needs checking with the bank.','bank-rate-explainer');
 }
 const applied=append(container,'div','','bank-rate-applied');
 append(applied,'span',model?'Calculator uses the base rate':'Calculator uses your own rate');
 append(applied,'strong',formatRate(used));
 append(applied,'small',model?'Bonus and introductory interest are not included.':'No bank rate applied. Confirm or edit your rate.');
 if(Number.isFinite(balance)&&Number.isFinite(used))append(container,'p','About '+precise(balance*used/1200)+' first-month interest on '+money(balance)+', before tax and fees. Monthly estimate.','bank-rate-example');
 q('.calc-bank-done').textContent=Number.isFinite(used)?'Continue with '+formatRate(used)+(model?' base rate':' custom rate'):'Back to check my numbers';
}
function selectProduct(auto=true){
 model=null;
 const product=products.find(p=>p.id===q('[data-product-select]').value);
 const info=q('[data-product-info]');info.replaceChildren();
 if(!product){q('.calc-bank-done').textContent='Back to my calculation';output('rate-model','Custom constant rate - monthly compounding');setRateHint('Rate retained · choose a product or edit your rate');calculate();return;}
 const overview=append(info,'div','','bank-rate-overview');overview.setAttribute('data-rate-summary','');
 const modelCandidate=baseRateModel(product);
 if(modelCandidate&&auto){
  model=modelCandidate;modelLabel=product.name;form.elements.annualRate.value=model(inputs().principal).toFixed(4);
  setRateHint('Base rate only · excludes bonus and intro. Edit to override.');
 }else{
  output('rate-model',unchangedRateNote);setRateHint('Rate unchanged · confirm or edit before using',true);
 }
 const details=document.createElement('details');details.className='hl-published-rates';
 append(details,'summary','Conditions, balance tiers & fees');
 if(product.description)append(details,'p',product.description,'hl-product-description');
 append(details,'p','These are provider data components, not verified eligibility limits or a total eligible rate. A missing tier bound does not mean bonus eligibility is unlimited. Check the provider terms, including balance caps.');
 for(const rate of product.depositRates??[]){
  const item=append(details,'div','','hl-rate-item');
  append(item,'b',formatRate(rate.rate==null||String(rate.rate).trim()===''?NaN:Number(rate.rate)*100)+' p.a. - '+String(rate.depositRateType??'unspecified').toLowerCase().replaceAll('_',' '));
  append(item,'p','Published rate component - do not assume this is the total eligible rate.');
  for(const tier of rate.tiers??[])for(const line of tierLines(tier))append(item,'p',line);
  if(rate.additionalInfo)append(item,'p',rate.additionalInfo);
  if(rate.additionalValue)append(item,'p',rate.additionalValue);
  for(const condition of conditionList(rate.applicabilityConditions))append(item,'p','Rate condition: '+conditionText(condition));
 }
 for(const [title,list,type] of [['Eligibility',product.eligibility,'eligibilityType'],['Product constraints',product.constraints,'constraintType']]){
  append(details,'h3',title);
  if(!list?.length)append(details,'p','No entries returned. Confirm with the provider.');
  for(const entry of list??[])append(details,'p',[entry.name,entry[type]?.replaceAll('_',' '),entry.additionalValue,entry.additionalInfo].filter(Boolean).join(' - '));
 }
 append(details,'h3','Published fee components');
 append(details,'p','Fees below are not included in the projection and are not a total cost estimate. Charges depend on usage, eligibility, discounts and provider terms.');
 if(!product.fees?.length)append(details,'p','No fee entries returned. This does not establish that the account is fee-free.');
 for(const fee of product.fees??[]){const item=append(details,'div','','hl-rate-item');for(const line of feeLines(fee))append(item,'p',line);}
 const feeURL=safeURL(product.additionalInformation?.feesAndPricingUri);
 if(feeURL){const a=append(details,'a','Check the provider fee schedule');a.href=feeURL;a.target='_blank';a.rel='noopener noreferrer';}
 info.append(details);
 const link=safeURL(product.url);if(link){const providerLink=append(info,'a','Check rates and conditions with the bank ↗','bank-provider-link');providerLink.href=link;providerLink.target='_blank';providerLink.rel='noopener noreferrer';}
 const a=append(details,'a','View source product data');a.href=safeURL(product.source)??'#';a.target='_blank';a.rel='noopener noreferrer';
 calculate();
}
async function loadBank(productId='',auto=true){
q('.calc-bank-done').textContent='Back to my calculation';
const id=q('[data-bank-select]').value,version=++requestVersion;model=null;products=[];q('[data-product-info]').replaceChildren();q('[data-product-select]').replaceChildren(new Option('Choose a product',''));q('[data-product-field]').hidden=true;output('rate-model','Custom constant rate · monthly compounding');
if(!id){output('bank-status','Using your own rate. Bank rates have not been applied.');setRateHint('Your rate · fixed for the full projection');calculate();return;}
setRateHint('Rate unchanged · choose a product or edit your rate',true);
output('bank-status','Loading published product data…');
try{const response=await fetch('/data/banks/'+encodeURIComponent(id)+'.json',{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error();const data=await response.json();if(version!==requestVersion)return;products=data.products;
const date=new Date(data.checkedAt).toLocaleDateString('en-AU',{timeZone:'Australia/Brisbane',day:'numeric',month:'short',year:'numeric'});const stale=Date.now()-Date.parse(data.checkedAt)>7*86400000;
output('bank-status','Retrieved '+date+'. '+(stale?'Older than 7 days: verify rates with the provider before using. ':'')+(data.status==='partial'?'Some product requests were unavailable. ':'')+(products.length?products.length+' published products.': 'No deposit product data available. Enter your own confirmed rate.'));
if(products.length){q('[data-product-field]').hidden=false;products.sort((a,b)=>a.name.localeCompare(b.name)).forEach(p=>q('[data-product-select]').add(new Option(p.name,p.id)));if(productId&&products.some(p=>p.id===productId)){q('[data-product-select]').value=productId;selectProduct(auto);}}
calculate();
}catch(e){if(version!==requestVersion)return;output('bank-status','Product data could not load. You can still enter a rate confirmed with your provider.');setRateHint('Rate unchanged · confirm or edit before using',true);calculate();}
}
if(q('[data-bank-select]')){
const dialog=q('[data-bank-dialog]');q('[data-open-bank]').addEventListener('click',()=>dialog.showModal());root.querySelectorAll('[data-close-bank]').forEach(button=>button.addEventListener('click',()=>dialog.close()));dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
const select=q('[data-bank-select]');const options=[...select.options].map(o=>({value:o.value,label:o.textContent}));
q('[data-bank-search]').addEventListener('input',()=>{const query=q('[data-bank-search]').value.trim().toLowerCase(),selected=select.value;select.replaceChildren(...options.filter(o=>!o.value||o.value===selected||o.label.toLowerCase().includes(query)).map(o=>new Option(o.label,o.value)));select.value=selected;});
select.addEventListener('change',()=>loadBank());q('[data-product-select]').addEventListener('change',()=>selectProduct());
const bankParam=new URL(location.href).searchParams.get('bank');if(bankParam&&options.some(o=>o.value===bankParam)){select.value=bankParam;dialog.showModal();loadBank();}
}
calculate();
}
