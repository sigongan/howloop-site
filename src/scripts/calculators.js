import {bankFreshness} from '../lib/bank-freshness.mjs';
import {searchBanks} from '../lib/bank-search.mjs';
import {parseAmount,prepareMoneyFields} from '../lib/money-input.mjs';
import {QUICK_SAVINGS_KEY,readQuickSavings} from '../lib/quick-savings.mjs';
import {compareBankScenarios} from '../lib/bank-scenarios.mjs';
import {savings,requiredSavings,mortgage,emergencyFund,baseRateModel} from '../lib/finance.mjs';
import {rateSummary,formatRate,introductoryPeriod} from '../lib/rate-summary.mjs';
import {feeLines,tierLines,conditionText,conditionList} from '../lib/product-display.mjs';
const money=n=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(n);
const precise=n=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const safeURL=url=>{try{const u=new URL(url);return u.protocol==='https:'?u.href:null;}catch{return null;}};
for(const root of document.querySelectorAll('[data-calculator]')){
const kind=root.dataset.calculator,form=root.querySelector('form'),q=s=>root.querySelector(s),output=(name,text)=>{q('[data-'+name+']').textContent=text;};
const moneyFields=prepareMoneyFields(form);
const inputs=()=>Object.fromEntries([...form.querySelectorAll('[name]')].map(el=>[el.name,el.hasAttribute('data-money-input')?parseAmount(el.value):el.type==='number'?Number(el.value):el.value]));
const key='howloop-plan-v1-'+kind;let rows=[],headers=[],model=null,modelLabel='',products=[],requestVersion=0,bankMode='base',conditionsConfirmed=false,snapshotUsable=false,restoredBankRatePending=false;
const markEdited=()=>{q('[data-example-note]').hidden=true;};
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
if(kind==='compound-interest'&&restoredBankRatePending&&!model){invalidate('The saved or previously selected bank rate has not been restored. Choose a fresh supported account or enter a rate you have confirmed with the bank.');return false;}
moneyFields.validate();
if(!form.checkValidity()){invalidate('Enter valid numbers within the limits shown in each field.');return false;}
try{
q('[data-error]').hidden=true;const data=inputs();
if(kind==='compound-interest'){
const result=savings({...data,rateForBalance:model??undefined});output('result-label','Your projected balance');output('result-total',money(result.balance));output('result-sub','After '+data.years+(data.years===1?' year':' years')+' · before tax and fees');output('stat1-label','Money you put in');output('stat1',money(result.deposits));output('stat2-label','Interest earned');output('stat2',money(result.interest));chart(result.rows,['balance','deposits'],['Projected balance','Your deposits']);
try{const more=savings({...data,contribution:data.contribution+50,rateForBalance:model??undefined});output('scenario','What if you saved $50 more '+data.frequency+'? Your projected balance would be '+money(more.balance)+' — '+money(more.balance-result.balance)+' more over the same period.');}catch{output('scenario','The extra-$50 comparison crosses a rate limit we cannot model reliably. Your main plan is shown above.');}
headers=['Year','Your deposits (AUD)','Interest (AUD)','Balance (AUD)'];rows=result.rows.map(r=>[Number(r.year.toFixed(2)),r.deposits,r.interest,r.balance]);
if(model){const rate=model(data.principal,1);form.elements.annualRate.value=rate.toFixed(4);output('rate-model',modelLabel+(bankMode==='conditional'?' · conditions assumed met; welcome periods end as shown':' · base rate only; supported tiers update as your balance grows'));}
renderRateSummary();
}else if(kind==='mortgage'){
const result=mortgage(data);output('result-label','Your total monthly payment');output('result-total',precise(result.payment+data.extra));output('result-sub','Regular '+precise(result.payment)+' + extra '+precise(data.extra)+' each month');output('stat1-label','Interest with your plan');output('stat1',money(result.plan.interest));output('stat2-label','Interest saved');output('stat2',money(result.interestSaved));
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
form.querySelector('[type="submit"]').disabled=false;
form.addEventListener('input',e=>{if(e.target.name){markEdited();if(e.target.name==='annualRate'&&kind==='compound-interest'){restoredBankRatePending=false;model=null;bankMode='custom';conditionsConfirmed=false;output('rate-model','Your custom rate · unchanged for this example');setRateHint('Your rate · fixed for the full projection');}calculate();}});
const status=message=>output('action-status',message);
q('[data-export]').addEventListener('click',()=>{if(!calculate())return;const quote=x=>'"'+String(x).replaceAll('"','""')+'"';const csv=[headers,...rows.map(r=>r.map((v,i)=>i?Number(v).toFixed(2):v))].map(r=>r.map(quote).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='howloop-'+kind+'.csv';a.hidden=true;document.body.append(a);try{a.click();status('CSV download requested. Check your browser downloads.');}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}});
try{q('[data-load]').hidden=!localStorage.getItem(key);}catch{}
q('[data-save]').addEventListener('click',()=>{if(!calculate())return;try{localStorage.setItem(key,JSON.stringify({values:inputs(),bank:q('[data-bank-select]')?.value??'',product:q('[data-product-select]')?.value??'',bankModel:!!model}));q('[data-load]').hidden=false;status('Saved in this browser. Use Restore saved plan to return to these numbers.');}catch{status('Your browser did not allow local storage. You can download a CSV instead.');}});
q('[data-load]').addEventListener('click',async()=>{try{
 const saved=JSON.parse(localStorage.getItem(key));if(!saved?.values)throw Error();
 for(const el of form.querySelectorAll('[name]'))if(saved.values[el.name]!==undefined)el.value=String(saved.values[el.name]);
 moneyFields.format();markEdited();model=null;
 restoredBankRatePending=kind==='compound-interest'&&saved.bankModel===true;
 if(restoredBankRatePending)form.elements.annualRate.value='';
 if(q('[data-bank-select]')){q('[data-bank-select]').value=saved.bank??'';await loadBank(saved.product,saved.bankModel);}
 calculate();
 status(restoredBankRatePending?'Saved amounts restored, but the bank rate could not be restored. Enter a confirmed custom rate or choose a fresh supported account.':model?'Saved inputs restored using the supported base rate. Recheck conditions to use a bonus or welcome scenario.':'Saved inputs and your custom rate restored.');
}catch{status('This saved plan could not be restored.');}});
const remove=document.createElement('button');remove.type='button';remove.className='hl-plain-button';remove.textContent='Clear saved plan';q('.hl-result-actions').append(remove);remove.addEventListener('click',()=>{try{localStorage.removeItem(key);q('[data-load]').hidden=true;status('Saved plan removed from this browser.');}catch{status('Storage could not be cleared. Use your browser’s site-data settings.');}});
function append(parent,tag,text,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;parent.append(el);return el;}
function renderRateSummary(){
 const container=q('[data-rate-summary]'),product=products.find(p=>p.id===q('[data-product-select]')?.value);
 if(!container||!product)return;
 const balance=form.elements.principal.checkValidity()?parseAmount(form.elements.principal.value):NaN;
 const summary=rateSummary(product,snapshotUsable?balance:NaN);
 let used=null;try{used=restoredBankRatePending?null:model?model(balance,1):form.elements.annualRate.checkValidity()?Number(form.elements.annualRate.value):null;}catch{}
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
  const labels={VARIABLE:'Published base-rate row',BONUS:'Published BONUS row',INTRODUCTORY:'Published INTRODUCTORY row',BUNDLE_BONUS:'Bundle bonus',FIXED:'Fixed rate',FLOATING:'Floating rate',MARKET_LINKED:'Market-linked rate'};
  if(!summary.components.length)card('Published rates','Not supplied','confirm with the bank');
  for(const component of summary.components){
   const appliedBase=component.type==='VARIABLE'&&summary.base!==null;
   const value=appliedBase?formatRate(summary.base):component.min===null?'Not supplied':component.min===component.max?formatRate(component.min):formatRate(component.min)+'–'+formatRate(component.max);
   card(appliedBase?'Base rate':labels[component.type]??'Other published rate',value,appliedBase?'at your starting balance':component.incomplete?'incomplete data · check terms':component.type==='VARIABLE'?'check balance tiers':'conditions apply',component.type==='VARIABLE'?'is-base':'is-bonus');
  }
  if(summary.components.some(c=>c.type!=='VARIABLE'))append(container,'p','Provider rate rows shown separately. A BONUS row may already include the base rate. A combined rate needs checking with the bank.','bank-rate-explainer');
 }
 let comparison=null;
 try{if(snapshotUsable&&form.checkValidity())comparison=compareBankScenarios(product,inputs());}catch{}
 if(comparison){
  const panel=append(container,'section','','bank-scenarios');append(panel,'h3','Your balance after '+inputs().years+(inputs().years===1?' year':' years'));
  const line=(label,value)=>{const row=append(panel,'div','','bank-scenario-row');append(row,'span',label);append(row,'strong',money(value));};
  line('Base rate only',comparison.base.balance);
  if(comparison.conditional&&snapshotUsable){
   const c=comparison.conditional;line(c.welcomeMonths?'Welcome offer, then base rate':'Bonus conditions met each month',c.result.balance);
   append(panel,'p',c.welcomeMonths?'Welcome period: '+c.welcomeMonths+' months from the start of this plan, then the base rate. Use only if the full offer period is still available to you.':'Assumes the bonus conditions are met in every month. This does not check your eligibility.');
   const label=append(panel,'label','','bank-confirm');const check=document.createElement('input');check.type='checkbox';check.checked=conditionsConfirmed;label.append(check);append(label,'span','I checked the bank’s conditions and balance limits. Use them as assumptions for this example.');
   const actions=append(panel,'div','','bank-scenario-actions');const baseButton=append(actions,'button','Use base rate','hl-plain-button');baseButton.type='button';baseButton.setAttribute('aria-pressed',String(!!model&&bankMode==='base'));
   const bonusButton=append(actions,'button','Use conditional scenario','hl-plain-button');bonusButton.type='button';bonusButton.disabled=!conditionsConfirmed;bonusButton.setAttribute('aria-pressed',String(!!model&&bankMode==='conditional'));
   const use=(conditional)=>{bankMode=conditional?'conditional':'base';restoredBankRatePending=false;model=conditional?c.rateForBalance:baseRateModel(product);modelLabel=product.name;form.elements.annualRate.value=model(inputs().principal,1).toFixed(4);markEdited();setRateHint(conditional?'Conditional example · eligibility is not assessed':'Base rate only · excludes bonus and intro');calculate();};
   check.addEventListener('change',()=>{conditionsConfirmed=check.checked;bonusButton.disabled=!conditionsConfirmed;if(!conditionsConfirmed&&bankMode==='conditional')use(false);});
   baseButton.addEventListener('click',()=>use(false));bonusButton.addEventListener('click',()=>{if(conditionsConfirmed)use(true);});
   append(panel,'p','Same deposits and timeframe in both examples. Before tax and fees. Published rates are held unchanged; actual rates and eligibility can change.','hl-help');
  }else if(summary.components.some(c=>c.type!=='VARIABLE'))append(panel,'p',snapshotUsable?'This offer cannot be combined reliably for your whole plan. Check its conditions and enter a confirmed custom scenario.':'Check a fresh snapshot and the bank’s current terms before modelling a conditional offer.');
 }
 const applied=append(container,'div','','bank-rate-applied');
 append(applied,'span',restoredBankRatePending?'Bank rate needs confirmation':model?(bankMode==='conditional'?'Calculator uses your conditional scenario':'Calculator uses the base rate'):'Calculator uses your own rate');
 append(applied,'strong',formatRate(used));
 append(applied,'small',restoredBankRatePending?'No bank projection is shown until a supported rate is selected or you enter a confirmed custom rate.':model?(bankMode==='conditional'?'An illustration with conditions assumed met. Rates may change.':'Bonus and introductory interest are not included.'):'No bank rate applied. Confirm or edit your rate.');
 if(Number.isFinite(balance)&&Number.isFinite(used))append(container,'p','About '+precise(balance*used/1200)+' first-month interest on '+money(balance)+', before tax and fees. Monthly estimate.','bank-rate-example');
 q('.calc-bank-done').textContent=Number.isFinite(used)?'Continue with '+formatRate(used)+(model?(bankMode==='conditional'?' scenario':' base rate'):' custom rate'):'Back to check my numbers';
}
function selectProduct(auto=true){
 if(model){restoredBankRatePending=true;form.elements.annualRate.value='';}
 model=null;bankMode='base';conditionsConfirmed=false;markEdited();
 const product=products.find(p=>p.id===q('[data-product-select]').value);
 const info=q('[data-product-info]');info.replaceChildren();
 if(!product){q('.calc-bank-done').textContent='Back to my calculation';output('rate-model','Custom constant rate - monthly compounding');setRateHint('Rate retained · choose a product or edit your rate');calculate();return;}
 const overview=append(info,'div','','bank-rate-overview');overview.setAttribute('data-rate-summary','');
 const modelCandidate=baseRateModel(product);
 let supportedPlan=null;try{if(snapshotUsable)supportedPlan=compareBankScenarios(product,{...inputs(),annualRate:0});}catch{}
 if(modelCandidate&&supportedPlan&&auto&&snapshotUsable){
  model=modelCandidate;restoredBankRatePending=false;modelLabel=product.name;form.elements.annualRate.value=model(inputs().principal).toFixed(4);
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
if(model){restoredBankRatePending=true;form.elements.annualRate.value='';}
q('.calc-bank-done').textContent='Back to my calculation';
const id=q('[data-bank-select]').value,version=++requestVersion;model=null;bankMode='base';conditionsConfirmed=false;snapshotUsable=false;markEdited();products=[];q('[data-product-info]').replaceChildren();q('[data-product-select]').replaceChildren(new Option('Choose a product',''));q('[data-product-field]').hidden=true;output('rate-model','Custom constant rate · monthly compounding');
if(!id){output('bank-status','Using your own rate. Bank rates have not been applied.');setRateHint('Your rate · fixed for the full projection');calculate();return;}
setRateHint('Rate unchanged · choose a product or edit your rate',true);
output('bank-status','Loading published product data…');
try{const response=await fetch('/data/banks/'+encodeURIComponent(id)+'.json',{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error();const data=await response.json();if(version!==requestVersion)return;products=data.products;
const freshness=bankFreshness(data);snapshotUsable=freshness.usable;
output('bank-status',freshness.note+' '+(products.length?products.length+' published products.':'No deposit product data available. Enter your own confirmed rate.')+(!snapshotUsable&&products.length?' Saved rates are for reference; enter a rate confirmed with the bank.':''));
if(products.length){q('[data-product-field]').hidden=false;products.sort((a,b)=>a.name.localeCompare(b.name)).forEach(p=>q('[data-product-select]').add(new Option(p.name,p.id)));if(productId&&products.some(p=>p.id===productId)){q('[data-product-select]').value=productId;selectProduct(auto);}}
calculate();
}catch(e){if(version!==requestVersion)return;output('bank-status','Product data could not load. You can still enter a rate confirmed with your provider.');setRateHint('Rate unchanged · confirm or edit before using',true);calculate();}
}
if(q('[data-bank-select]')){
const dialog=q('[data-bank-dialog]'),select=q('[data-bank-select]'),search=q('[data-bank-search]'),results=q('[data-bank-results]'),searchStatus=q('[data-bank-search-status]');
const options=[...select.options].filter(option=>option.value).map(option=>({value:option.value,name:option.dataset.bankName??option.textContent,productCount:Number(option.dataset.productCount??0)}));
const clearResults=()=>{results.replaceChildren();results.hidden=true;searchStatus.hidden=true;};
function chooseBank(bank){
 select.value=bank.value;search.value=bank.name;clearResults();search.blur();loadBank();
}
function showResults(){
 const query=search.value.trim();clearResults();if(!query)return;
 const matches=searchBanks(options,query),shown=matches.slice(0,6);
 searchStatus.hidden=false;
 searchStatus.textContent=matches.length?(matches.length>shown.length?'Showing '+shown.length+' of '+matches.length+' banks. Type more to narrow the list.':matches.length+' '+(matches.length===1?'bank':'banks')+' found. Select one below.'):'No bank found. Try another spelling or browse all banks.';
 for(const bank of shown){
  const button=document.createElement('button');button.type='button';button.className='bank-search-result';
  const name=document.createElement('strong');name.textContent=bank.name;button.append(name);
  const detail=document.createElement('span');detail.textContent=bank.productCount?bank.productCount+' published '+(bank.productCount===1?'product':'products'):'No product data';button.append(detail);
  button.addEventListener('click',()=>chooseBank(bank));results.append(button);
 }
 results.hidden=shown.length===0;
}
q('[data-open-bank]').addEventListener('click',()=>{search.value=options.find(option=>option.value===select.value)?.name??'';clearResults();dialog.showModal();});
root.querySelectorAll('[data-close-bank]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
dialog.addEventListener('close',clearResults);
search.addEventListener('input',showResults);
search.addEventListener('keydown',event=>{
 const first=results.querySelector('button');
 if(event.key==='Enter'){event.preventDefault();first?.click();}
 else if(event.key==='ArrowDown'&&first){event.preventDefault();first.focus();}
 else if(event.key==='Escape'&&!results.hidden){event.preventDefault();clearResults();}
});
results.addEventListener('keydown',event=>{
 if(event.key==='Escape'){event.preventDefault();clearResults();search.focus();return;}
 if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
 const buttons=[...results.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
 if(index<0)return;
 event.preventDefault();
 const next=index+(event.key==='ArrowDown'?1:-1);
 if(next<0)search.focus();else buttons[Math.min(next,buttons.length-1)].focus();
});
select.addEventListener('change',()=>{search.value=options.find(option=>option.value===select.value)?.name??'';clearResults();loadBank();});
q('[data-product-select]').addEventListener('change',()=>selectProduct());
const bankParam=new URL(location.href).searchParams.get('bank');
if(bankParam&&options.some(option=>option.value===bankParam)){
 select.value=bankParam;search.value=options.find(option=>option.value===bankParam).name;dialog.showModal();
 loadBank(new URL(location.href).searchParams.get('product')??'');
}
}
if(kind==='compound-interest'){
 try{
  const draft=readQuickSavings(sessionStorage.getItem(QUICK_SAVINGS_KEY));
  sessionStorage.removeItem(QUICK_SAVINGS_KEY);
  if(draft){
   for(const [name,value] of Object.entries(draft))form.elements[name].value=String(value);
   moneyFields.format();markEdited();setRateHint('Your example rate from the home page — edit or choose a bank');
  }
 }catch{}
}
calculate();
}

