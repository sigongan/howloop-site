import { savings } from '../lib/finance.mjs';
import { QUICK_SAVINGS_KEY } from '../lib/quick-savings.mjs';
const inputMoney = value => new Intl.NumberFormat('en-AU', {style:'currency',currency:'AUD',maximumFractionDigits:2}).format(value);
const money = value => new Intl.NumberFormat('en-AU', {style:'currency',currency:'AUD',maximumFractionDigits:0}).format(value);
export function initHomeLab(doc = document) {
 const root = doc.querySelector('[data-home-lab]');
 if (!root || root.dataset.bound) return;
 const form = root.querySelector('form');
 const input = root.querySelector('[name="deposit"]');
 const slider = root.querySelector('[data-lab-slider]');
 const buttons = [...root.querySelectorAll('[data-lab-years]')];
 let years = 5;
 function update() {
  const amount = input.valueAsNumber;
  const error = root.querySelector('[data-lab-error]');
  if (!Number.isFinite(amount) || amount < 0 || amount > 10000) {
   error.textContent = 'Enter a monthly saving from $0 to $10,000.'; error.hidden = false;
   input.setAttribute('aria-invalid','true');
   root.querySelector('[data-lab-label]').textContent = 'Previous estimate · enter a valid amount to update';
   return;
  }
  error.hidden = true; input.removeAttribute('aria-invalid');
  const result = savings({principal:1000, contribution:amount, annualRate:4, years});
  root.querySelector('[data-lab-total]').textContent = money(result.balance);
  root.querySelector('[data-lab-deposits]').textContent = money(result.deposits);
  root.querySelector('[data-lab-interest]').textContent = money(result.interest);
  root.querySelector('[data-lab-label]').textContent = `Illustrative balance after ${years} ${years===1?'year':'years'}`;
  root.querySelector('#lab-assumptions').textContent = `Example: $1,000 to start, ${inputMoney(amount)} added at each month’s end, 4% a year compounded monthly. Before tax, fees and inflation. Rates can change.`;
  slider.value = String(Math.min(1000,amount));
  const chart = root.querySelector('[data-lab-chart]');
  chart.replaceChildren(...result.rows.slice(1).map(row=>{
   const column=doc.createElement('div'), bar=doc.createElement('span'), interest=doc.createElement('i'), label=doc.createElement('small');
   bar.style.height=`${row.balance/result.balance*100}%`; interest.style.height=`${row.interest/row.balance*100}%`; label.textContent=`Y${row.year}`;
   bar.append(interest);column.append(bar,label);return column;
  }));
 }
 form.addEventListener('submit',event=>{event.preventDefault();update();});
 input.addEventListener('input',update);
 slider.addEventListener('input',()=>{input.value=slider.value;update();});
 for (const button of buttons) button.addEventListener('click',()=>{
  years=Number(button.dataset.labYears);buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));update();
 });
 root.querySelector('[data-lab-continue]')?.addEventListener('click',event=>{
  const amount=input.valueAsNumber;
  if(!Number.isFinite(amount)||amount<0||amount>10000){event.preventDefault();update();input.focus();return;}
  try{doc.defaultView.sessionStorage.setItem(QUICK_SAVINGS_KEY,JSON.stringify({createdAt:Date.now(),principal:1000,contribution:amount,annualRate:4,years}));}catch{}
 });
 root.dataset.bound='true';root.querySelector('[data-lab-controls]').hidden=false;
 update();
}
if (typeof document !== 'undefined') initHomeLab();
