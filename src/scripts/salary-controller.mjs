import {parseAmount,prepareMoneyFields,displayAmount} from '../lib/money-input.mjs';
import {salaryBreakdown,earningsBand,periodFactor} from '../lib/salary.mjs';
export function initSalaryCalculator(root,{PAYROLL,earnings}){
if(!root)return;
const form=root.querySelector('#salary-form');
const q=s=>root.querySelector(s),field=name=>form.elements.namedItem(name);
const money=n=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const set=(name,text)=>{q('[data-'+name+']').textContent=text;};
const moneyFields=prepareMoneyFields(form);
let shownPeriod='fortnightly',previousInputPeriod='annual',current=null,currentSettings=null,offerA=null;
const periodLabels={weekly:'each week',fortnightly:'every 2 weeks',monthly:'each month',annual:'per year'};
field('annualSuper').disabled=true;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Brisbane',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
q('[data-pay-year-warning]').hidden=today>=PAYROLL.effectiveFrom&&today<=PAYROLL.effectiveTo;
function compare(){
  const population=earnings.populations[q('#pay-population').value];
  const group=population.groups.find(g=>g.id===q('#pay-occupation').value);
  q('[data-earnings-result]').hidden=!current||!group;
  q('[data-earnings-empty]').hidden=!!current&&!!group;
  if(!current||!group)return;
  const band=earningsBand(current.grossAnnual,group.percentiles);
  let title,explanation;
  if(band.lower===band.upper){title=band.lower===50?'Around the middle of this group':'Near the '+band.lower+'% pay cutoff';explanation='Your weekly pay matches this published survey cutoff. This is not an exact current ranking.';}
  else if(band.lower===90){title='Top 10% pay band';explanation='Your pay is above the published 90th-percentile cutoff for this survey group.';}
  else if(band.upper===10){title='Bottom 10% pay band';explanation='Your pay is below the published 10th-percentile cutoff for this survey group.';}
  else{title='Higher than about '+band.lower+'–'+band.upper+'% of the group';explanation='This range comes from the published survey pay cutoffs. It compares gross weekly pay, not experience or the value of your work.';}
  set('earnings-band',title);set('earnings-explanation',explanation);
  set('earnings-own',money(band.weekly));set('earnings-median',money(band.median));
  set('population-note',group.name+' · '+population.label+'. '+(q('#pay-population').value==='fulltime'?'Excludes strategic managerial employees, juniors and apprentices.':'Includes full-time and part-time hours; it is not a like-for-like full-time comparison.'));
}
function render(){
  set('net-label','Estimated take-home '+periodLabels[shownPeriod]);
  set('period-note',{weekly:'52 weekly pays per year.',fortnightly:'26 fortnightly pays per year. A fortnight is 2 weeks.',monthly:'12 monthly pays per year.',annual:'Annual estimate based on 12 monthly pays.'}[shownPeriod]);
  renderOffers();
  if(!current)return;
  const r=current.periods[shownPeriod];
  set('pay-net',money(r.net));
  for(const key of ['gross','tax','help','deductions','super'])set('pay-'+key,(key==='tax'||key==='help'||key==='deductions'?'− ':'')+money(r[key]));
  q('[data-help-row]').hidden=!field('helpDebt').checked;q('[data-deductions-row]').hidden=!r.deductions;
  compare();
}
function calculate(){
  const custom=field('superMode').value==='custom';
  q('[data-custom-super]').hidden=!custom;field('annualSuper').disabled=!custom;
  moneyFields.validate();
  try{
    if(!form.checkValidity())throw Error('Check the amounts entered. Use numbers with no more than two decimal places.');
    currentSettings={amount:parseAmount(field('amount').value),inputPeriod:field('inputPeriod').value,includesSuper:field('includesSuper').value==='yes',superMode:field('superMode').value,annualSuper:custom?parseAmount(field('annualSuper').value):0,claimThreshold:field('claimThreshold').checked,helpDebt:field('helpDebt').checked,monthlyDeductions:parseAmount(field('monthlyDeductions').value)};
    current=salaryBreakdown(currentSettings);
    q('[data-pay-error]').hidden=true;
    set('super-explanation',field('includesSuper').value==='yes'?'We separate employer super from your package first, then calculate tax on the cash salary.':'Super on top goes to your super fund. It is not taken out of the salary you enter.');
    render();return true;
  }catch(error){
    current=null;q('[data-pay-error]').hidden=false;set('pay-error',error.message);
    for(const key of ['net','gross','tax','help','deductions','super'])set('pay-'+key,'—');compare();renderOffers();return false;
  }
}
form.addEventListener('input',event=>{
  q('[data-pay-example]').hidden=true;
  if(event.target.name==='inputPeriod'){
    const amount=parseAmount(field('amount').value);
    if(Number.isFinite(amount))field('amount').value=displayAmount(amount*periodFactor(previousInputPeriod)/periodFactor(field('inputPeriod').value));
    previousInputPeriod=field('inputPeriod').value;moneyFields.format();
  }
  calculate();
});
form.addEventListener('submit',event=>{event.preventDefault();if(calculate()){q('#pay-result').focus({preventScroll:true});if(matchMedia('(max-width:800px)').matches)q('#pay-result').scrollIntoView({behavior:'auto',block:'start'});}});
function settingsText(result,settings){
  const quotePeriod={annual:'a year',monthly:'a month',fortnightly:'every 2 weeks',weekly:'a week'}[settings.inputPeriod];
  return `${money(settings.amount)} ${quotePeriod}, ${settings.includesSuper?'including employer super':'plus employer super'}. Cash salary: ${money(result.grossAnnual)} a year. Employer super: ${money(result.superAnnual)} a year (${settings.superMode==='custom'?'contract amount':'standard minimum'}). ${settings.claimThreshold?'Claims':'Does not claim'} the tax-free threshold. ${settings.helpDebt?'With':'Without'} student-loan withholding. Other after-tax deductions: ${money(settings.monthlyDeductions)} a month.`;
}
function renderOffers(){
  if(!offerA)return;
  const a=offerA.result.periods[shownPeriod];
  set('offer-a-net',money(a.net));set('offer-a-period',periodLabels[shownPeriod]);
  set('offer-a-settings',settingsText(offerA.result,offerA.settings));
  set('offer-b-period',periodLabels[shownPeriod]);
  if(!current){
    set('offer-b-net','—');set('offer-b-settings','Check the pay details above to complete offer B.');
    set('offer-difference','Enter valid pay details to compare with offer A.');return;
  }
  const b=current.periods[shownPeriod],difference=Math.round((b.net-a.net)*100)/100;
  set('offer-b-net',money(b.net));set('offer-b-settings',settingsText(current,currentSettings));
  set('offer-difference',difference===0?'Both offers give the same take-home pay '+periodLabels[shownPeriod]+'.':'Offer B leaves you '+money(Math.abs(difference))+(difference>0?' more ':' less ')+periodLabels[shownPeriod]+'.');
}
q('[data-offer-toggle]').addEventListener('click',()=>{
  if(offerA){
    offerA=null;q('#offer-comparison').hidden=true;q('[data-offer-editing]').hidden=true;
    q('[data-offer-toggle]').setAttribute('aria-expanded','false');
    q('[data-offer-toggle]').textContent='Compare a pay rise or job offer +';
    set('pay-form-title','Your pay details');return;
  }
  if(!calculate())return;
  offerA={result:current,settings:{...currentSettings}};
  q('#offer-comparison').hidden=false;q('[data-offer-editing]').hidden=false;
  q('[data-offer-toggle]').setAttribute('aria-expanded','true');
  q('[data-offer-toggle]').textContent='Finish comparison ×';
  set('pay-form-title','Try offer B');renderOffers();
  field('amount').focus();field('amount').select();
});
q('.salary-submit').disabled=false;
q('[data-offer-toggle]').disabled=false;
for(const button of root.querySelectorAll('[data-pay-period]'))button.addEventListener('click',()=>{shownPeriod=button.dataset.payPeriod;root.querySelectorAll('[data-pay-period]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();});
q('#pay-occupation').addEventListener('change',compare);q('#pay-population').addEventListener('change',compare);
calculate();

}
