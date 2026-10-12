import { calculateCashFlow, createSampleModel, exportCashFlowCsv, formatMoney, MAX_SCHEDULE_ROWS } from '../lib/cash-flow.mjs';
import { trackPlannerEvent } from './product-events.mjs';
import { createHomeExampleModel, createTimingExampleModel, HOME_EXAMPLE_PRESET_ID } from '../lib/cash-flow-examples.mjs';

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
const frequencies = [['once','Just once'],['weekly','Every week'],['fortnightly','Every 2 weeks'],['monthly','Every month']];

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
  let exampleEdited = false;
  let dirty = false;
  let result = null;
  let validModel = null;
  let exampleKind = 'default';
  let restoredPlan = false;
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
      for (const [key,caption,type] of [['label','Label','text'],['amount','Amount (A$)','text'],['anchorDate',kind==='income'?'Day money arrives':'Day money goes out','date']]) {
        const control = input(`${kind}.${index}.${key}`,type,entry[key]); control.dataset.field = key;
        grid.append(field(caption,control,key==='label'));
      }
      const select = doc.createElement('select'); select.name = `${kind}.${index}.frequency`; select.id = `cash-${kind}-${index}-frequency`; select.dataset.field = 'frequency';
      for (const [value,caption] of frequencies) { const option = create('option',caption); option.value=value; select.append(option); }
      select.value = entry.frequency;
      grid.append(field('How often?', select));
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
  function displayModel(model, nextMode, nextExampleKind = 'default') {
    for (const key of ['startDate','openingBalance','buffer']) form.elements.namedItem(key).value = model[key];
    renderRows('income',model.income); renderRows('bills',model.bills); refreshCount();
    mode = nextMode; exampleKind = nextExampleKind; exampleEdited = false; dirty = true; restoredPlan = false;
    find('stale-start').hidden = true;
    setText('mode', mode==='sample'?(exampleKind==='home'?'RENT BEFORE PAY EXAMPLE':'EXAMPLE NUMBERS'):'YOUR ENTRIES');
    error.hidden=true;
  }
  function markDirty() {
    if(mode==='sample')exampleEdited=true;
    dirty=true;
    setText('mode',mode==='sample'?'EDITED EXAMPLE':'YOUR ENTRIES');
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
    const empty = model.income.length===0 && model.bills.length===0;
    find('output').hidden=empty;
    find('weeks').closest('section').hidden=empty;
    find('daily').hidden=empty;
    setText('result-mode',empty?'START YOUR PLAN':mode==='sample'?(exampleEdited?'EDITED EXAMPLE':exampleKind==='home'?'RENT BEFORE PAY EXAMPLE':'WORKED EXAMPLE'):'YOUR CALCULATED PLAN');
    setText('period',`${dateLabel(result.startDate)} – ${dateLabel(result.endDate)} · 91 days`);
    setText('low',formatMoney(result.minimumClosingBalance.amountCents));
    setText('low-date',dateLabel(result.minimumClosingBalance.date));
    setText('closing',formatMoney(result.closingBalanceCents));
    setText('total-in',formatMoney(result.totalIncomeCents));setText('total-out',formatMoney(result.totalExpenseCents));
    const firstShortDay=result.days.find(day=>day.date===result.firstBelowZeroDate);
    const shortfall=firstShortDay?`Your first shortfall is ${formatMoney(-firstShortDay.closingBalanceCents)} on ${dateLabel(firstShortDay.date)}.`:'These entries stay at or above zero at the end of each day.';
    status.textContent=empty?'Add your pay and bills to see your plan. Starting cash alone is not a cash-flow plan.':(mode==='sample'?(exampleEdited?'Edited example. Other sample amounts and dates may remain. Start a blank plan to use only your entries. ':exampleKind==='home'?'Homepage example loaded with illustrative 2026 dates. Edit the entries to try your own plan. ':'Example updated. These are illustrative numbers. '):'Plan updated. ')+shortfall+(model.bills.length===0?' Income-only scenario: no bills or expenses are included. This does not show whether your bills are covered.':model.income.length===0?' Expenses-only scenario: no income is included. Check whether this is intentional.':'');
    const staleStart = find('stale-start');
    staleStart.hidden = !(restoredPlan && model.startDate < localToday());
    if (!staleStart.hidden) staleStart.textContent = `This restored plan starts on ${dateLabel(model.startDate)}, before today. Check the first day, opening cash and payment dates, then select Show my plan. Nothing was changed automatically.`;
    setText('warning',`Low if bills leave before pay: ${formatMoney(result.conservativeMinimum.amountCents)} on ${dateLabel(result.conservativeMinimum.date)}. Actual bank processing order may differ. This also includes your opening cash.`);
    setText('buffer-result',`Money you want to keep aside: ${formatMoney(result.bufferCents)}. ${result.firstBelowBufferDate?`First day ending below your target: ${dateLabel(result.firstBelowBufferDate)}.`:'No day ends below your target.'} Check the bills-first low separately.`);
    renderTable('weeks',result.weeks,false);renderTable('days',result.days,true);
    const peak=Math.max(1,...result.weeks.map(week=>Math.abs(week.closingBalanceCents)));
    find('chart').replaceChildren(...result.weeks.map(week=>{const cell=create('div',undefined,'planner-chart-cell');const bar=create('div',undefined,'planner-bar');bar.style.height=`${Math.max(.5,Math.abs(week.closingBalanceCents)/peak*48)}%`;bar.dataset.negative=String(week.closingBalanceCents<0);bar.title=`Week ${week.weekNumber}: ${formatMoney(week.closingBalanceCents)}`;cell.append(bar);return cell;}));
    find('results').removeAttribute('aria-label');
    find('exports').hidden=empty;find('export-note').hidden=empty;find('export').disabled=empty;find('print').disabled=empty;
    error.hidden=true;form.querySelectorAll('[aria-invalid]').forEach(node=>node.removeAttribute('aria-invalid'));
  }
  function calculate(focus = false, track = false) {
    try {
      renderResult(getModel());
      if(track)trackPlannerEvent('planner_demo_calculate','demo',mode,win);
      if(focus){const heading=find('results').querySelector('h2');heading.focus({preventScroll:true});heading.scrollIntoView?.({block:'start'});}
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
  const replaceAllowed=()=>mode==='sample'&&!exampleEdited||win.confirm('Replace the current entries? Unsaved changes will be lost.');
  find('example').addEventListener('click',()=>{if(!replaceAllowed())return;displayModel(createSampleModel(localToday()),'sample');calculate(false,false);});
  find('home-example').addEventListener('click',()=>{if(!replaceAllowed())return;displayModel(createHomeExampleModel(),'sample','home');calculate(true,false);});
  const timingExample = find('timing');
  if (timingExample) {
    timingExample.addEventListener('click',()=>{if(!replaceAllowed())return;displayModel(createTimingExampleModel(),'sample');calculate(true,false);});
    timingExample.hidden=false;
  }
  find('blank').addEventListener('click',()=>{if(!replaceAllowed())return;displayModel({startDate:localToday(),openingBalance:'0',buffer:'0',income:[],bills:[]},'custom');calculate(false,false);form.elements.namedItem('openingBalance').focus();});
  find('save').addEventListener('click',()=>{
    if(!calculate(false,false))return;
    try { win.localStorage.setItem(CASH_FLOW_STORAGE_KEY,JSON.stringify({version:1,model:validModel,exampleBased:mode==='sample'}));storageStatus.textContent='Saved one plan in this browser. Later edits are not saved automatically.'; }
    catch { storageStatus.textContent='This browser could not save the plan. Your entries still work in this tab; download a CSV if useful.'; }
  });
  find('restore').addEventListener('click',()=>{
    let model;let exampleBased=false;
    try { const raw=win.localStorage.getItem(CASH_FLOW_STORAGE_KEY);if(!raw){storageStatus.textContent='No saved plan was found in this browser.';return;}model=parseSavedCashFlow(raw);exampleBased=JSON.parse(raw).exampleBased===true; }
    catch { storageStatus.textContent='The saved plan could not be read or is invalid. Your current entries have not changed.';return; }
    if(!replaceAllowed())return;
    displayModel(model,exampleBased?'sample':'custom');restoredPlan=true;if(exampleBased){exampleEdited=true;setText('mode','EDITED EXAMPLE');}calculate(false,false);storageStatus.textContent='Saved plan restored. Check the first day, opening cash and payment dates before using it again. New edits are not saved automatically.';
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
  const homePreset = new URL(win.location.href).searchParams.get('preset') === HOME_EXAMPLE_PRESET_ID;
  displayModel(homePreset?createHomeExampleModel():createSampleModel(localToday()),'sample',homePreset?'home':'default');
  renderResult(getModel());
  find('inputs').hidden=false;
}
if(typeof document!=='undefined')initCashFlow();

