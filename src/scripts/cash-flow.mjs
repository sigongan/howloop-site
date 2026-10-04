import { calculateCashFlow, createSampleModel, exportCashFlowCsv, formatMoney, MAX_SCHEDULE_ROWS } from '../lib/cash-flow.mjs';
import { trackPlannerEvent } from './product-events.mjs';

export const CASH_FLOW_STORAGE_KEY = 'howloop-cash-flow-v1';
export function parseSavedCashFlow(raw) {
  if (typeof raw !== 'string' || raw.length > 30000) throw new Error('This saved plan cannot be read.');
  const record = JSON.parse(raw);
  if (!record || record.version !== 1 || !record.model) throw new Error('This saved plan uses an unsupported format.');
  calculateCashFlow(record.model);
  return record.model;
}
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
const dateLabel = date => new Intl.DateTimeFormat('en-AU', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
const frequencies = [['once','One-off'],['weekly','Weekly'],['fortnightly','Fortnightly'],['monthly','Monthly']];

export function initCashFlow(doc = document, win = window) {
  const root = doc.querySelector('[data-cash-flow]');
  if (!root || root.dataset.bound) return;
  root.dataset.bound = 'true';
  const find = suffix => root.querySelector(`[data-cash-${suffix}]`);
  const form = find('form');
  const error = find('error');
  const storageStatus = find('storage');
  const status = find('status');
  let mode = 'sample';
  let dirty = false;
  let result = null;
  let validModel = null;
  const setText = (suffix, text) => { find(suffix).textContent = text; };
  const create = (tag, text, className) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const input = (name, type, value) => {
    const node = doc.createElement('input');
    node.type = type; node.name = name; node.id = `cash-${name.replaceAll('.','-')}`; node.value = value;
    if (type === 'date') { node.min = '2000-01-01'; node.max = '2099-12-31'; }
    else if (name.endsWith('.amount')) node.inputMode = 'decimal';
    else node.maxLength = 80;
    return node;
  };
  function field(caption, control, wide = false) {
    const label = create('label', caption, `planner-field${wide?' planner-field--wide':''}`);
    label.htmlFor = control.id; label.append(control); return label;
  }
  function getModel() {
    const model = {startDate:form.elements.namedItem('startDate').value,openingBalance:form.elements.namedItem('openingBalance').value,buffer:form.elements.namedItem('buffer').value,income:[],bills:[]};
    for (const kind of ['income','bills']) {
      find(kind).querySelectorAll('[data-cash-row]').forEach(row => {
        const get = key => row.querySelector(`[data-field="${key}"]`).value;
        model[kind].push({label:get('label'),amount:get('amount'),anchorDate:get('anchorDate'),frequency:get('frequency')});
      });
    }
    return model;
  }
  function renderRows(kind, entries) {
    const nodes = entries.map((entry, index) => {
      const row = create('div', undefined, 'planner-row'); row.dataset.cashRow = kind;
      const grid = create('div', undefined, 'planner-fields');
      for (const [key,caption,type] of [['label','Label','text'],['amount','Amount (A$)','text'],['anchorDate',kind==='income'?'Known payday':'Known payment date','date']]) {
        const control = input(`${kind}.${index}.${key}`,type,entry[key]); control.dataset.field = key;
        grid.append(field(caption,control,key==='label'));
      }
      const select = doc.createElement('select'); select.name = `${kind}.${index}.frequency`; select.id = `cash-${kind}-${index}-frequency`; select.dataset.field = 'frequency';
      for (const [value,caption] of frequencies) { const option = create('option',caption); option.value=value; select.append(option); }
      select.value = entry.frequency;
      grid.append(field('Repeats', select));
      const remove = create('button', `Remove ${kind==='income'?'income':'expense'} ${index+1}`, 'planner-remove'); remove.type = 'button';
      remove.addEventListener('click', () => {
        const model = getModel(); model[kind].splice(index,1); renderRows(kind,model[kind]); refreshCount(); markDirty();
        root.querySelector(`[data-cash-add="${kind}"]`).focus();
      });
      row.append(grid,remove); return row;
    });
    find(kind).replaceChildren(...nodes);
  }
  function refreshCount() {
    const count = root.querySelectorAll('[data-cash-row]').length;
    setText('row-count',`${count} of ${MAX_SCHEDULE_ROWS} schedule entries used. Repeating payments are expanded automatically.`);
    root.querySelectorAll('[data-cash-add]').forEach(button => { button.disabled=count>=MAX_SCHEDULE_ROWS; });
  }
  function displayModel(model, nextMode) {
    for (const key of ['startDate','openingBalance','buffer']) form.elements.namedItem(key).value = model[key];
    renderRows('income',model.income); renderRows('bills',model.bills); refreshCount();
    mode = nextMode; dirty = true;
    setText('mode', mode==='sample'?'EXAMPLE NUMBERS':'YOUR ENTRIES');
    error.hidden=true;
  }
  function markDirty() {
    mode='custom';dirty=true;
    setText('mode','YOUR ENTRIES');
    status.textContent='Inputs changed. Update the plan to refresh these results.';
    find('export').disabled=true;find('print').disabled=true;
    find('results').setAttribute('aria-label','Previous calculation; inputs have changed');
  }
  function amountCell(cents) {
    return create('td',formatMoney(cents),cents<0?'planner-negative':undefined);
  }
  function renderTable(target, rows, daily) {
    const rendered = rows.map(row => {
      const tr=create('tr');const lead=create('td',daily?dateLabel(row.date):`Week ${row.weekNumber}`);
      lead.append(create('small',daily?(row.transactions.map(t=>`${t.label} (${t.kind==='income'?'+':'−'}${formatMoney(t.amountCents)})`).join('; ')||'No listed payments'):`${dateLabel(row.startDate)} – ${dateLabel(row.endDate)}`));
      tr.append(lead,amountCell(row.incomeCents),amountCell(row.expenseCents),amountCell(daily?row.withinDayMinimumCents:row.conservativeMinimum.amountCents),amountCell(row.closingBalanceCents));
      return tr;
    });
    find(target).replaceChildren(...rendered);
  }
  function renderResult(model) {
    const calculated=calculateCashFlow(model);
    result=calculated;validModel=JSON.parse(JSON.stringify(model));dirty=false;
    setText('result-mode',mode==='sample'?'WORKED EXAMPLE':'YOUR CALCULATED PLAN');
    setText('period',`${dateLabel(result.startDate)} – ${dateLabel(result.endDate)} · 91 days`);
    setText('low',formatMoney(result.minimumClosingBalance.amountCents));
    setText('low-date',dateLabel(result.minimumClosingBalance.date));
    setText('closing',formatMoney(result.closingBalanceCents));
    setText('total-in',formatMoney(result.totalIncomeCents));setText('total-out',formatMoney(result.totalExpenseCents));
    const shortfall=result.firstBelowZeroDate?`First negative end-of-day balance: ${dateLabel(result.firstBelowZeroDate)}.`:'No negative end-of-day balance in these entries.';
    status.textContent=(mode==='sample'?'Example updated. These are illustrative numbers. ':'Plan updated. ')+shortfall+(model.bills.length===0?' No bills or expenses are included.':'');
    setText('warning',`Low if bills leave before pay: ${formatMoney(result.conservativeMinimum.amountCents)} on ${dateLabel(result.conservativeMinimum.date)}. Actual bank processing order may differ. This also includes your opening cash.`);
    setText('buffer-result',`Your chosen buffer: ${formatMoney(result.bufferCents)}. ${result.firstBelowBufferDate?`First end-of-day balance below it: ${dateLabel(result.firstBelowBufferDate)}.`:'No end-of-day balance falls below it.'} Check the bills-first low separately.`);
    renderTable('weeks',result.weeks,false);renderTable('days',result.days,true);
    const peak=Math.max(1,...result.weeks.map(week=>Math.abs(week.closingBalanceCents)));
    find('chart').replaceChildren(...result.weeks.map(week=>{const cell=create('div',undefined,'planner-chart-cell');const bar=create('div',undefined,'planner-bar');bar.style.height=`${Math.max(.5,Math.abs(week.closingBalanceCents)/peak*48)}%`;bar.dataset.negative=String(week.closingBalanceCents<0);bar.title=`Week ${week.weekNumber}: ${formatMoney(week.closingBalanceCents)}`;cell.append(bar);return cell;}));
    find('results').removeAttribute('aria-label');
    find('exports').hidden=false;find('export-note').hidden=false;find('export').disabled=false;find('print').disabled=false;
    error.hidden=true;form.querySelectorAll('[aria-invalid]').forEach(node=>node.removeAttribute('aria-invalid'));
  }
  function calculate(focus = false, track = false) {
    try {
      renderResult(getModel());
      if(track)trackPlannerEvent('planner_demo_calculate','demo',mode,win);
      if(focus)find('results').querySelector('h2').focus();
      return true;
    } catch (exception) {
      error.textContent=exception.message||'Check your entries and try again.';error.hidden=false;
      find('export').disabled=true;find('print').disabled=true;
      form.querySelectorAll('[aria-invalid]').forEach(node=>node.removeAttribute('aria-invalid'));
      const field=exception.field&&form.elements.namedItem(exception.field);
      if(field?.focus){field.setAttribute('aria-invalid','true');field.focus();}else error.focus();
      status.textContent='The plan was not updated. Fix the highlighted entry; previous results are still shown.';
      return false;
    }
  }
  form.addEventListener('input',markDirty);form.addEventListener('change',markDirty);
  form.addEventListener('submit',event=>{event.preventDefault();calculate(true,true);});
  root.querySelectorAll('[data-cash-add]').forEach(button=>button.addEventListener('click',()=>{
    const model=getModel();if(model.income.length+model.bills.length>=MAX_SCHEDULE_ROWS)return;
    const kind=button.dataset.cashAdd;
    model[kind].push({label:kind==='income'?`Pay ${model[kind].length+1}`:`Expense ${model[kind].length+1}`,amount:'',anchorDate:model.startDate||localToday(),frequency:'once'});
    renderRows(kind,model[kind]);refreshCount();markDirty();
    find(kind).lastElementChild.querySelector('[data-field="amount"]').focus();
  }));
  const replaceAllowed=()=>mode==='sample'||win.confirm('Replace the current entries? Unsaved changes will be lost.');
  find('example').addEventListener('click',()=>{if(!replaceAllowed())return;displayModel(createSampleModel(localToday()),'sample');calculate(false,false);});
  find('blank').addEventListener('click',()=>{if(!replaceAllowed())return;displayModel({startDate:localToday(),openingBalance:'0',buffer:'0',income:[],bills:[]},'custom');calculate(false,false);form.elements.namedItem('openingBalance').focus();});
  find('save').addEventListener('click',()=>{
    if(!calculate(false,false))return;
    try { win.localStorage.setItem(CASH_FLOW_STORAGE_KEY,JSON.stringify({version:1,model:validModel}));storageStatus.textContent='Saved one plan in this browser. Later edits are not saved automatically.'; }
    catch { storageStatus.textContent='This browser could not save the plan. Your entries still work in this tab; download a CSV if useful.'; }
  });
  find('restore').addEventListener('click',()=>{
    let model;
    try { const raw=win.localStorage.getItem(CASH_FLOW_STORAGE_KEY);if(!raw){storageStatus.textContent='No saved plan was found in this browser.';return;}model=parseSavedCashFlow(raw); }
    catch { storageStatus.textContent='The saved plan could not be read or is invalid. Your current entries have not changed.';return; }
    if(!replaceAllowed())return;
    displayModel(model,'custom');calculate(false,false);storageStatus.textContent='Saved plan restored. New edits are not saved automatically.';
  });
  find('delete').addEventListener('click',()=>{
    try { win.localStorage.removeItem(CASH_FLOW_STORAGE_KEY);storageStatus.textContent='Saved plan deleted from this browser. The current working entries are still on screen.'; }
    catch { storageStatus.textContent='This browser could not delete the saved plan. You can remove it through your browser’s site-data controls.'; }
  });
  find('export').addEventListener('click',()=>{
    if(dirty||!result)return;
    const blob=new Blob([exportCashFlowCsv(result)],{type:'text/csv;charset=utf-8'});
    const url=win.URL.createObjectURL(blob);const link=create('a');link.href=url;link.download='howloop-13-week-cash-flow.csv';doc.body.append(link);link.click();link.remove();
    win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);
  });
  find('print').addEventListener('click',()=>{if(!dirty&&result)win.print();});
  displayModel(createSampleModel(localToday()),'sample');
  renderResult(getModel());
  find('inputs').hidden=false;
}
if(typeof document!=='undefined')initCashFlow();
