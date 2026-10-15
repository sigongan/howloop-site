import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initSalaryCalculator} from '../src/scripts/salary-controller.mjs';
import {salaryBreakdown} from '../src/lib/salary.mjs';
import {PAYROLL} from '../src/data/payroll-2026.mjs';
const earnings=JSON.parse(readFileSync(new URL('../src/data/earnings-may2025.json',import.meta.url)));
const money=n=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
function fixture(){
 const spans=['pay-form-title','pay-year-warning','super-explanation','pay-error','pay-example','net-label','pay-net','period-note','pay-gross','pay-tax','pay-help','pay-deductions','pay-super','earnings-band','earnings-explanation','earnings-own','earnings-median','population-note','offer-difference','offer-a-net','offer-a-period','offer-b-net','offer-b-period','offer-a-settings','offer-b-settings'];
 const dom=new JSDOM(`<div class="salary-page"><form id="salary-form">
 <input name="amount" value="85000" data-money-input data-min="0" data-max="10000000" required>
 <select name="inputPeriod"><option value="annual">Year</option><option value="monthly">Month</option><option value="fortnightly">Fortnight</option><option value="weekly">Week</option></select>
 <select name="includesSuper"><option value="no">No</option><option value="yes">Yes</option></select>
 <input name="helpDebt" type="checkbox"><input name="claimThreshold" type="checkbox" checked>
 <input name="monthlyDeductions" value="0" data-money-input data-max="1000000" required>
 <select name="superMode"><option value="standard">Standard</option><option value="custom">Custom</option></select>
 <div data-custom-super><input name="annualSuper" value="0" data-money-input data-max="10000000" required></div>
 <button class="salary-submit" type="submit" disabled>Calculate</button></form>
 <div id="pay-result" tabindex="-1"></div><div data-help-row></div><div data-deductions-row></div>
 ${spans.map(name=>`<span data-${name}></span>`).join('')}
 ${['weekly','fortnightly','monthly','annual'].map(period=>`<button data-pay-period="${period}" aria-pressed="${period==='fortnightly'}">${period}</button>`).join('')}
 <select id="pay-population"><option value="fulltime">Full-time</option><option value="all">All</option></select>
 <select id="pay-occupation"><option value="">Choose</option><option value="${earnings.populations.fulltime.groups[0].id}">Group</option></select>
 <div data-earnings-result></div><div data-earnings-empty></div>
 <button data-offer-toggle aria-expanded="false" disabled>Compare</button><section id="offer-comparison" hidden></section><p data-offer-editing hidden></p></div>`,{url:'https://howloop.how/calculators/salary/'});
 const root=dom.window.document.querySelector('.salary-page');
 initSalaryCalculator(root,{PAYROLL,earnings});
 const q=selector=>root.querySelector(selector),field=name=>q('#salary-form').elements.namedItem(name);
 const edit=(name,value)=>{const f=field(name);if(f.type==='checkbox')f.checked=value;else f.value=value;f.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
 return {dom,q,field,edit,text:name=>q('[data-'+name+']').textContent,click:name=>q('[data-'+name+']').click()};
}

test('an offer comparison freezes the original salary and payroll settings while the next offer changes',()=>{
 const f=fixture();
 f.edit('helpDebt',true);f.edit('monthlyDeductions','100');
 const original=salaryBreakdown({amount:85000,helpDebt:true,monthlyDeductions:100});
 f.click('offer-toggle');
 assert.equal(f.q('#offer-comparison').hidden,false);
 assert.equal(f.q('[data-offer-toggle]').getAttribute('aria-expanded'),'true');
 assert.equal(f.dom.window.document.activeElement,f.field('amount'));
 f.edit('amount','95000');f.edit('helpDebt',false);f.edit('monthlyDeductions','0');
 const changed=salaryBreakdown({amount:95000});
 assert.equal(f.text('offer-a-net'),money(original.periods.fortnightly.net));
 assert.equal(f.text('offer-b-net'),money(changed.periods.fortnightly.net));
 assert.match(f.text('offer-a-settings'),/With student-loan withholding/);
 assert.match(f.text('offer-a-settings'),/\$100\.00 a month/);
 assert.match(f.text('offer-b-settings'),/Without student-loan withholding/);
 assert.match(f.text('offer-difference'),/more every 2 weeks/);
 assert.equal(f.dom.window.location.href,'https://howloop.how/calculators/salary/');
 assert.equal(f.dom.window.localStorage.length,0);assert.equal(f.dom.window.sessionStorage.length,0);
 f.dom.window.close();
});

test('a total package and custom super stay attached to their offer, and periods switch together',()=>{
 const f=fixture();
 f.edit('amount','115000');f.edit('includesSuper','yes');f.edit('superMode','custom');f.edit('annualSuper','15000');
 f.edit('claimThreshold',false);f.click('offer-toggle');
 const a=salaryBreakdown({amount:115000,includesSuper:true,superMode:'custom',annualSuper:15000,claimThreshold:false});
 f.edit('includesSuper','no');f.edit('superMode','standard');f.edit('claimThreshold',true);
 const b=salaryBreakdown({amount:115000});
 for(const period of ['weekly','monthly','annual']){
  f.q(`[data-pay-period="${period}"]`).click();
  assert.equal(f.text('offer-a-net'),money(a.periods[period].net));
  assert.equal(f.text('offer-b-net'),money(b.periods[period].net));
  assert.equal(f.text('offer-a-period'),f.text('offer-b-period'));
 }
 assert.match(f.text('offer-a-settings'),/including employer super/);
 assert.match(f.text('offer-a-settings'),/contract amount/);
 assert.match(f.text('offer-a-settings'),/Does not claim the tax-free threshold/);
 assert.match(f.text('offer-b-settings'),/standard minimum/);
 f.dom.window.close();
});

test('invalid input clears the edited comparison rather than presenting a stale pay difference',()=>{
 const f=fixture();f.click('offer-toggle');const original=f.text('offer-a-net');
 f.edit('amount','invalid');
 assert.equal(f.text('offer-b-net'),'—');assert.equal(f.text('pay-net'),'—');
 assert.equal(f.text('offer-a-net'),original);
 assert.match(f.text('offer-difference'),/Enter valid pay details/);
 f.edit('amount','70000');
 assert.match(f.text('offer-difference'),/less every 2 weeks/);
 f.click('offer-toggle');
 assert.equal(f.q('#offer-comparison').hidden,true);
 assert.equal(f.q('[data-offer-editing]').hidden,true);
 assert.equal(f.q('[data-offer-toggle]').getAttribute('aria-expanded'),'false');
 f.click('offer-toggle');assert.equal(f.text('offer-a-net'),f.text('offer-b-net'));
 assert.match(f.text('offer-difference'),/same take-home pay/);
 f.dom.window.close();
});

test('comparison cannot start from invalid pay and reloading has no kept offer',()=>{
 const f=fixture();f.edit('amount','');f.click('offer-toggle');
 assert.equal(f.q('#offer-comparison').hidden,true);
 assert.equal(f.q('[data-offer-toggle]').getAttribute('aria-expanded'),'false');
 f.dom.window.close();
 const fresh=fixture();assert.equal(fresh.q('#offer-comparison').hidden,true);fresh.dom.window.close();
});


test('changing the result period updates a kept offer even when the edited offer is invalid',()=>{
 const f=fixture();f.click('offer-toggle');f.edit('amount','invalid');
 const kept=salaryBreakdown({amount:85000});
 for(const [period,label] of [['monthly','each month'],['annual','per year'],['weekly','each week']]){
  f.q(`[data-pay-period="${period}"]`).click();
  assert.equal(f.q(`[data-pay-period="${period}"]`).getAttribute('aria-pressed'),'true');
  assert.equal(f.text('offer-a-net'),money(kept.periods[period].net));
  assert.equal(f.text('offer-a-period'),label);
  assert.equal(f.text('offer-b-period'),label);
  assert.equal(f.text('offer-b-net'),'—');assert.equal(f.text('pay-net'),'—');
  assert.equal(f.text('net-label'),'Estimated take-home '+label);
  assert.match(f.text('offer-difference'),/Enter valid pay details/);
 }
 f.edit('amount','95000');
 assert.equal(f.text('offer-b-net'),money(salaryBreakdown({amount:95000}).periods.weekly.net));
 assert.match(f.text('offer-difference'),/more each week/);
 f.dom.window.close();
});
