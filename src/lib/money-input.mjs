// Currency fields accept plain or correctly grouped numbers, never partial parses.
export function parseAmount(value) {
 const text=String(value??'').trim();
 if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,2})?$/.test(text))return NaN;
 const amount=Number(text.replaceAll(',',''));
 return Number.isFinite(amount)?amount:NaN;
}
export const displayAmount=value=>Number.isFinite(value)?value.toLocaleString('en-AU',{maximumFractionDigits:2}):'';
export function prepareMoneyFields(form) {
 const fields=[...form.querySelectorAll('[data-money-input]')];
 function validate(field) {
  const n=parseAmount(field.value),min=Number(field.dataset.min??0),max=Number(field.dataset.max??1e8);
  field.setCustomValidity(!field.required&&!field.value.trim()?'':!Number.isFinite(n)||n<min||n>max?'Enter an amount from '+displayAmount(min)+' to '+displayAmount(max)+', with up to two decimal places.':'');
 }
 function format(){for(const field of fields){validate(field);if(field.checkValidity()&&field.value.trim())field.value=displayAmount(parseAmount(field.value));}}
 for(const field of fields){
  field.addEventListener('input',()=>validate(field));
  field.addEventListener('blur',()=>{validate(field);if(field.checkValidity()&&field.value.trim())field.value=displayAmount(parseAmount(field.value));});
 }
 format();return {format,validate:()=>fields.forEach(validate)};
}
