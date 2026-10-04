import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  CashFlowValidationError,
  HORIZON_DAYS,
  MAX_INPUT_CENTS,
  MAX_SCHEDULE_ROWS,
  calculateCashFlow,
  createSampleModel,
  exportCashFlowCsv,
  formatMoney,
  parseDateOnly,
  parseMoneyToCents,
} from '../src/lib/cash-flow.mjs';

const emptyModel = (extra = {}) => ({
  startDate: '2026-10-05', openingBalance: '0', buffer: '0', income: [], bills: [], ...extra,
});
const row = (extra = {}) => ({ label: 'Item', amount: '1.00', anchorDate: '2026-10-05', frequency: 'once', ...extra });
const paymentDates = (result, kind = 'income') => result.days.filter((day) => day.transactions.some((item) => item.kind === kind)).map((day) => day.date);
function invalidAt(fn, field) {
  assert.throws(fn, (error) => error instanceof CashFlowValidationError && error.field === field && error.message.length > 0);
}

// A small CSV reader verifies quoted commas, CRLFs, newlines and escaped quotes
// without introducing a dependency solely for testing this export.
function readCsv(csv) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (char === '\r' && csv[index + 1] === '\n' && !quoted) {
      row.push(cell); rows.push(row); row = []; cell = ''; index += 1;
    } else cell += char;
  }
  assert.equal(quoted, false);
  return rows;
}

test('money parses exactly to integer cents, including grouped commas and surrounding space', () => {
  for (const [input, cents] of [['0', 0], ['00.01', 1], ['0.10', 10], ['1.2', 120], ['1234.56', 123456], [' 1,234.56 ', 123456], ['10,000,000.00', MAX_INPUT_CENTS]]) {
    assert.equal(parseMoneyToCents(input), cents, input);
  }
  assert.equal(parseMoneyToCents('-123.45', { allowNegative: true }), -12345);
  assert.equal(Object.is(parseMoneyToCents('-0.00', { allowNegative: true }), -0), false);
});

test('money rejects blank, coercible, exponent, fractional-cent, unsafe and malformed inputs', () => {
  const invalid = ['', ' ', '\n', null, undefined, 1, NaN, Infinity, {}, [], 'Infinity', 'NaN', '1e3', '1E3', '-1e2', '0x20', '$1', '+1', '.5', '1.', '1.001', '1,00', '12,34,567', '1,0000', ',100', '1,000,00', '1 000', '--1', '10,000,000.01', '1000000000000000000000000', '9'.repeat(10000)];
  for (const input of invalid) invalidAt(() => parseMoneyToCents(input), 'amount');
  invalidAt(() => parseMoneyToCents('-1'), 'amount');
  invalidAt(() => parseMoneyToCents('-0'), 'amount');
  invalidAt(() => parseMoneyToCents('-10000000.01', { allowNegative: true, field: 'openingBalance' }), 'openingBalance');
});

test('strict dates accept leap days and reject rollovers, non-ISO forms and out-of-range years', () => {
  assert.equal(parseDateOnly('2024-02-29') + 1, parseDateOnly('2024-03-01'));
  assert.equal(parseDateOnly('2000-02-29') + 1, parseDateOnly('2000-03-01'));
  for (const input of ['2023-02-29', '2024-02-30', '2024-04-31', '2026-00-01', '2026-13-01', '2026-01-00', '2026-1-01', '2026-01-1', ' 2026-01-01', '2026-01-01 ', '2026-01-01T00:00:00Z', '1999-12-31', '2100-01-01', '', null, 123]) {
    invalidAt(() => parseDateOnly(input), 'date');
  }
});

test('empty plan returns exactly 91 inclusive days, 13 contiguous weeks and deterministic ties', () => {
  const result = calculateCashFlow(emptyModel({ openingBalance: '123.45', buffer: '123.45' }));
  assert.equal(result.days.length, HORIZON_DAYS);
  assert.equal(result.weeks.length, 13);
  assert.equal(result.startDate, '2026-10-05');
  assert.equal(result.endDate, '2027-01-03');
  assert.equal(result.minimumClosingBalance.date, result.startDate);
  assert.deepEqual(result.conservativeMinimum, { date: result.startDate, amountCents: 12345 });
  assert.equal(result.firstBelowZeroDate, null);
  assert.equal(result.firstBelowBufferDate, null);
  assert.equal(result.firstConservativeBelowBufferDate, null);
  assert.equal(result.closingBalanceCents, 12345);
  assert.equal(result.totalIncomeCents, 0);
  assert.equal(result.totalExpenseCents, 0);
  for (const [index, week] of result.weeks.entries()) {
    assert.equal(week.weekNumber, index + 1);
    assert.equal(week.startDate, result.days[index * 7].date);
    assert.equal(week.endDate, result.days[index * 7 + 6].date);
    assert.equal(parseDateOnly(week.endDate) - parseDateOnly(week.startDate), 6);
  }
});

test('horizon may end on 2099-12-31 but cannot cross the supported year range', () => {
  assert.equal(calculateCashFlow(emptyModel({ startDate: '2099-10-02' })).endDate, '2099-12-31');
  assert.equal(calculateCashFlow(emptyModel({ startDate: '2000-01-01' })).days[0].date, '2000-01-01');
  invalidAt(() => calculateCashFlow(emptyModel({ startDate: '2099-10-03' })), 'startDate');
  invalidAt(() => calculateCashFlow(emptyModel({ startDate: '2100-01-01' })), 'startDate');
});

test('once-only events include start and final date, exclude outside dates, and do not repeat', () => {
  const result = calculateCashFlow(emptyModel({ income: [
    row({ anchorDate: '2026-10-04' }), row({ anchorDate: '2026-10-05' }),
    row({ anchorDate: '2027-01-03' }), row({ anchorDate: '2027-01-04' }),
  ] }));
  assert.deepEqual(paymentDates(result), ['2026-10-05', '2027-01-03']);
  assert.equal(result.totalIncomeCents, 200);
});

test('weekly/fortnightly schedules anchored before the horizon keep their actual pay cycle', () => {
  const weekly = calculateCashFlow(emptyModel({ income: [row({ anchorDate: '2026-09-29', frequency: 'weekly' })] }));
  const fortnightly = calculateCashFlow(emptyModel({ income: [row({ anchorDate: '2026-09-22', frequency: 'fortnightly' })] }));
  assert.equal(paymentDates(weekly)[0], '2026-10-06');
  assert.equal(paymentDates(weekly).at(-1), '2026-12-29');
  assert.equal(paymentDates(weekly).length, 13);
  assert.deepEqual(paymentDates(fortnightly), ['2026-10-06', '2026-10-20', '2026-11-03', '2026-11-17', '2026-12-01', '2026-12-15', '2026-12-29']);
});

test('recurrences never appear before a future anchor, even in the same month', () => {
  for (const frequency of ['once', 'weekly', 'fortnightly', 'monthly']) {
    const result = calculateCashFlow(emptyModel({ income: [row({ anchorDate: '2026-10-20', frequency })] }));
    assert.equal(paymentDates(result)[0], '2026-10-20');
    assert.ok(paymentDates(result).every((date) => date >= '2026-10-20'));
    const after = calculateCashFlow(emptyModel({ income: [row({ anchorDate: '2027-01-04', frequency })] }));
    assert.equal(after.totalIncomeCents, 0);
  }
});

test('January 31 monthly anchor clamps February then recovers March 31 in a normal year', () => {
  const result = calculateCashFlow(emptyModel({ startDate: '2023-01-31', income: [row({ anchorDate: '2023-01-31', frequency: 'monthly' })] }));
  assert.deepEqual(paymentDates(result), ['2023-01-31', '2023-02-28', '2023-03-31', '2023-04-30']);
});

test('January 31 monthly anchor uses leap February and an old anchor remains intact', () => {
  const result = calculateCashFlow(emptyModel({ startDate: '2024-02-01', income: [row({ anchorDate: '2000-01-31', frequency: 'monthly' })] }));
  assert.deepEqual(paymentDates(result), ['2024-02-29', '2024-03-31', '2024-04-30']);
});

test('February 29 monthly anchor remains day 29 after a non-leap February clamp', () => {
  const result = calculateCashFlow(emptyModel({ startDate: '2025-01-01', income: [row({ anchorDate: '2024-02-29', frequency: 'monthly' })] }));
  assert.deepEqual(paymentDates(result), ['2025-01-29', '2025-02-28', '2025-03-29']);
});

test('monthly anchor crosses a year and day-30 schedules do not drift after February', () => {
  const crossing = calculateCashFlow(emptyModel({ startDate: '2023-12-20', income: [row({ anchorDate: '2023-10-31', frequency: 'monthly' })] }));
  assert.deepEqual(paymentDates(crossing), ['2023-12-31', '2024-01-31', '2024-02-29']);
  const day30 = calculateCashFlow(emptyModel({ startDate: '2023-02-01', income: [row({ anchorDate: '2022-11-30', frequency: 'monthly' })] }));
  assert.deepEqual(paymentDates(day30), ['2023-02-28', '2023-03-30', '2023-04-30']);
});

test('an old weekly anchor jumps straight to the horizon without expanding a century of entries', () => {
  const result = calculateCashFlow(emptyModel({ startDate: '2099-10-02', income: [row({ anchorDate: '2000-01-01', frequency: 'weekly' })] }));
  assert.equal(paymentDates(result).length, 13);
  assert.ok(paymentDates(result).every((date) => date >= result.startDate && date <= result.endDate));
  for (const date of paymentDates(result)) assert.equal((parseDateOnly(date) - parseDateOnly('2000-01-01')) % 7, 0);
});

test('UTC date math is identical across Australian and US DST boundaries and process time zones', () => {
  const moduleUrl = new URL('../src/lib/cash-flow.mjs', import.meta.url).href;
  const script = `import {calculateCashFlow} from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(calculateCashFlow(${JSON.stringify(emptyModel({ startDate: '2026-09-20', income: [row({ anchorDate: '2026-09-20', frequency: 'weekly' })] }))})));`;
  const results = ['UTC', 'Australia/Sydney', 'America/New_York'].map((TZ) => execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ }, encoding: 'utf8' }));
  assert.equal(results[0], results[1]);
  assert.equal(results[0], results[2]);
  const dates = JSON.parse(results[0]).days.map((day) => parseDateOnly(day.date));
  for (let index = 1; index < dates.length; index += 1) assert.equal(dates[index] - dates[index - 1], 1);
});

test('mixed frequencies, cents and both signs reconcile exactly at day, week and horizon levels', () => {
  const result = calculateCashFlow(emptyModel({
    startDate: '2026-01-01', openingBalance: '-0.01', buffer: '10',
    income: [row({ amount: '0.10', anchorDate: '2026-01-01', frequency: 'weekly' }), row({ amount: '0.20', anchorDate: '2026-01-01', frequency: 'fortnightly' }), row({ amount: '1.01', anchorDate: '2025-12-31', frequency: 'monthly' })],
    bills: [row({ amount: '0.03', anchorDate: '2026-01-01', frequency: 'weekly' }), row({ amount: '0.02', anchorDate: '2026-04-01', frequency: 'once' })],
  }));
  assert.equal(result.totalIncomeCents, 13 * 10 + 7 * 20 + 3 * 101);
  assert.equal(result.totalExpenseCents, 13 * 3 + 2);
  assert.equal(result.closingBalanceCents, -1 + result.totalIncomeCents - result.totalExpenseCents);
  for (const day of result.days) {
    assert.equal(day.closingBalanceCents, day.startingBalanceCents + day.incomeCents - day.expenseCents);
    assert.equal(day.withinDayMinimumCents, day.startingBalanceCents - day.expenseCents);
    for (const value of [day.startingBalanceCents, day.closingBalanceCents, day.incomeCents, day.expenseCents]) assert.ok(Number.isSafeInteger(value));
  }
  assert.equal(result.weeks.reduce((sum, week) => sum + week.incomeCents, 0), result.totalIncomeCents);
  assert.equal(result.weeks.reduce((sum, week) => sum + week.expenseCents, 0), result.totalExpenseCents);
  assert.equal(result.weeks.at(-1).closingBalanceCents, result.closingBalanceCents);
});

test('same-date bills-before-pay conservative low is separate from end-of-day minimum', () => {
  const result = calculateCashFlow(emptyModel({ openingBalance: '100', buffer: '50',
    income: [row({ label: 'Pay', amount: '200' })], bills: [row({ label: 'Rent', amount: '150' })],
  }));
  assert.deepEqual(result.minimumClosingBalance, { amountCents: 15000, date: '2026-10-05' });
  assert.deepEqual(result.conservativeMinimum, { amountCents: -5000, date: '2026-10-05' });
  assert.equal(result.firstBelowZeroDate, null);
  assert.equal(result.firstBelowBufferDate, null);
  assert.equal(result.firstConservativeBelowZeroDate, '2026-10-05');
  assert.equal(result.firstConservativeBelowBufferDate, '2026-10-05');
  assert.deepEqual(result.days[0].transactions, [
    { kind: 'expense', label: 'Rent', amountCents: 15000, balanceAfterCents: -5000 },
    { kind: 'income', label: 'Pay', amountCents: 20000, balanceAfterCents: 15000 },
  ]);
  assert.deepEqual(result.weeks[0].conservativeMinimum, result.conservativeMinimum);
});

test('first breach dates refer to the first day below each threshold, and equality is safe', () => {
  const result = calculateCashFlow(emptyModel({ openingBalance: '100', buffer: '50', bills: [
    row({ amount: '50', anchorDate: '2026-10-06' }),
    row({ amount: '0.01', anchorDate: '2026-10-07' }),
    row({ amount: '49.99', anchorDate: '2026-10-08' }),
    row({ amount: '0.01', anchorDate: '2026-10-09' }),
  ] }));
  assert.equal(result.firstBelowBufferDate, '2026-10-07');
  assert.equal(result.firstBelowZeroDate, '2026-10-09');
  assert.deepEqual(result.minimumClosingBalance, { amountCents: -1, date: '2026-10-09' });
});

test('negative opening balance is valid, zero buffer is valid, and opening risk may precede end-day risk', () => {
  const result = calculateCashFlow(emptyModel({ openingBalance: '-10', income: [row({ amount: '20' })] }));
  assert.equal(result.firstBelowZeroDate, null);
  assert.equal(result.firstConservativeBelowZeroDate, result.startDate);
  assert.deepEqual(result.conservativeMinimum, { amountCents: -1000, date: result.startDate });
  const noPay = calculateCashFlow(emptyModel({ openingBalance: '-0.01' }));
  assert.equal(noPay.firstBelowZeroDate, noPay.startDate);
  assert.equal(noPay.firstBelowBufferDate, noPay.startDate);
});

test('nonnegative buffer and strictly positive schedule amounts are enforced with UI field paths', () => {
  invalidAt(() => calculateCashFlow(emptyModel({ buffer: '-0.01' })), 'buffer');
  invalidAt(() => calculateCashFlow(emptyModel({ openingBalance: '' })), 'openingBalance');
  for (const amount of ['0', '0.00', '-1', '1.001']) {
    invalidAt(() => calculateCashFlow(emptyModel({ income: [row({ amount })] })), 'income.0.amount');
  }
  invalidAt(() => calculateCashFlow(emptyModel({ bills: [row(), row({ amount: '' })] })), 'bills.1.amount');
});

test('invalid row structures, empty/long labels, missing dates and unknown frequencies are rejected', () => {
  for (const label of ['', ' ', 'x'.repeat(81), undefined, 123]) {
    invalidAt(() => calculateCashFlow(emptyModel({ income: [row({ label })] })), 'income.0.label');
  }
  assert.equal(calculateCashFlow(emptyModel({ income: [row({ label: 'x'.repeat(80) })] })).totalIncomeCents, 100);
  invalidAt(() => calculateCashFlow(emptyModel({ bills: [row({ anchorDate: '2026-02-30' })] })), 'bills.0.anchorDate');
  invalidAt(() => calculateCashFlow(emptyModel({ income: [row({ frequency: 'daily' })] })), 'income.0.frequency');
  invalidAt(() => calculateCashFlow(emptyModel({ income: [null] })), 'income.0');
  invalidAt(() => calculateCashFlow(emptyModel({ income: new Array(1) })), 'income.0');
  invalidAt(() => calculateCashFlow(emptyModel({ income: {} })), 'income');
  invalidAt(() => calculateCashFlow(emptyModel({ bills: null })), 'bills');
  invalidAt(() => calculateCashFlow(null), 'model');
  invalidAt(() => calculateCashFlow([]), 'model');
});

test('40 schedule rows are allowed in total, 41 are rejected before expansion', () => {
  assert.equal(MAX_SCHEDULE_ROWS, 40);
  const income = Array.from({ length: 20 }, () => row());
  const bills = Array.from({ length: 20 }, () => row());
  const result = calculateCashFlow(emptyModel({ income, bills }));
  assert.equal(result.totalIncomeCents, 2000);
  assert.equal(result.totalExpenseCents, 2000);
  invalidAt(() => calculateCashFlow(emptyModel({ income, bills: [...bills, row()] })), 'schedules');
  invalidAt(() => calculateCashFlow(emptyModel({ income: new Array(1000000) })), 'schedules');
});

test('maximum input values and maximum recurring rows remain exact safe integer totals', () => {
  const income = Array.from({ length: 40 }, () => row({ amount: '10,000,000.00', frequency: 'weekly' }));
  const result = calculateCashFlow(emptyModel({ openingBalance: '10000000', buffer: '10000000', income }));
  assert.equal(result.totalIncomeCents, 40 * 13 * MAX_INPUT_CENTS);
  assert.equal(result.closingBalanceCents, 521 * MAX_INPUT_CENTS);
  assert.ok(Number.isSafeInteger(result.closingBalanceCents));
  const negative = calculateCashFlow(emptyModel({ openingBalance: '-10000000', bills: income }));
  assert.equal(negative.closingBalanceCents, -521 * MAX_INPUT_CENTS);
});

test('input arrays/objects are never mutated, and repeated calls produce identical output', () => {
  const model = createSampleModel();
  const before = JSON.stringify(model);
  for (const item of [...model.income, ...model.bills]) Object.freeze(item);
  Object.freeze(model.income); Object.freeze(model.bills); Object.freeze(model);
  const first = calculateCashFlow(model);
  assert.equal(JSON.stringify(model), before);
  assert.deepEqual(calculateCashFlow(model), first);
});

test('sample is a fresh deterministic model with all anchor dates shifted by chosen start', () => {
  const baseline = createSampleModel();
  const shifted = createSampleModel('2024-02-25');
  assert.equal(baseline.startDate, '2026-10-05');
  const offset = parseDateOnly(shifted.startDate) - parseDateOnly(baseline.startDate);
  for (const group of ['income', 'bills']) {
    for (let index = 0; index < baseline[group].length; index += 1) {
      assert.equal(parseDateOnly(shifted[group][index].anchorDate) - parseDateOnly(baseline[group][index].anchorDate), offset);
      assert.equal(shifted[group][index].amount, baseline[group][index].amount);
    }
  }
  shifted.income[0].amount = '1';
  assert.notEqual(createSampleModel('2024-02-25').income[0].amount, '1');
  assert.equal(calculateCashFlow(createSampleModel('2000-01-01')).days.length, 91);
  assert.equal(calculateCashFlow(createSampleModel('2099-10-02')).endDate, '2099-12-31');
  invalidAt(() => createSampleModel('2099-10-03'), 'startDate');
});

test('AUD display formatter does not affect integer calculations and rejects unsafe cents', () => {
  assert.equal(formatMoney(123456), '$1,234.56');
  assert.equal(formatMoney(-1), '-$0.01');
  assert.equal(formatMoney(0), '$0.00');
  assert.equal(formatMoney(Number.MAX_SAFE_INTEGER), '$90,071,992,547,409.91');
  invalidAt(() => formatMoney(1.2), 'amount');
  invalidAt(() => formatMoney(Infinity), 'amount');
  invalidAt(() => formatMoney(Number.MAX_SAFE_INTEGER + 1), 'amount');
});

test('weekly and fortnightly schedules include a recurrence exactly on the final day', () => {
  for (const frequency of ['weekly', 'fortnightly']) {
    const result = calculateCashFlow(emptyModel({ income: [row({ anchorDate: '2026-10-11', frequency })] }));
    assert.equal(paymentDates(result).at(-1), '2027-01-03');
    assert.equal(result.days.at(-1).incomeCents, 100);
  }
});

test('recurrence expansion agrees with a separate daily-calendar oracle across 240 fixed scenarios', () => {
  const dayMs = 86400000;
  let seed = 173;
  const next = (limit) => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % limit; };
  const epoch = parseDateOnly('2001-01-01');
  const asDate = (day) => new Date(day * dayMs).toISOString().slice(0, 10);
  for (let scenario = 0; scenario < 240; scenario += 1) {
    const start = epoch + next(35000);
    const anchor = Math.max(parseDateOnly('2000-01-01'), start - next(720) + next(120));
    const anchorDate = new Date(anchor * dayMs);
    const originalDay = anchorDate.getUTCDate();
    const frequency = ['once', 'weekly', 'fortnightly', 'monthly'][scenario % 4];
    const result = calculateCashFlow(emptyModel({ startDate: asDate(start), income: [row({ anchorDate: asDate(anchor), frequency })] }));
    const expected = [];
    for (let day = start; day < start + 91; day += 1) {
      if (day < anchor) continue;
      const date = new Date(day * dayMs);
      const finalDayOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
      const occurs = frequency === 'once' ? day === anchor
        : frequency === 'weekly' ? (day - anchor) % 7 === 0
          : frequency === 'fortnightly' ? (day - anchor) % 14 === 0
            : date.getUTCDate() === Math.min(originalDay, finalDayOfMonth);
      if (occurs) expected.push(asDate(day));
    }
    assert.deepEqual(paymentDates(result), expected, `${frequency}, ${asDate(anchor)}, ${asDate(start)}`);
  }
});

test('CSV has one row per day with dates, labels, cent-exact balances and quoted fields', () => {
  const result = calculateCashFlow(emptyModel({ openingBalance: '-0.01', income: [row({ label: 'Pay, bonus', amount: '0.10' })], bills: [row({ label: 'A "quoted"\nbill', amount: '0.20' })] }));
  const csv = exportCashFlowCsv(result);
  const rows = readCsv(csv);
  assert.equal(rows.length, 92);
  assert.equal(rows[0].length, 10);
  assert.deepEqual(rows[1], ['2026-10-05', '1', 'Pay, bonus', 'A "quoted"\nbill', '-0.01', '0.10', '0.20', '-0.11', '-0.21', '0.00']);
  assert.equal(rows.at(-1)[0], result.endDate);
  assert.ok(csv.startsWith('"Date","Week","Income labels"'));
  assert.ok(csv.includes('"A ""quoted""\nbill"'));
  assert.ok(csv.endsWith('\r\n'));
  invalidAt(() => exportCashFlowCsv({}), 'result');
});

test('CSV neutralises formula prefixes, even after whitespace, without losing user labels', () => {
  const malicious = ['=SUM(1,2)', '+SUM(1,2)', '-1+2', '@SUM(1,2)', '  =HYPERLINK("https://example.com")', '\t+1', '\r\n-1', '\uFEFF@SUM(1)'];
  for (const label of malicious) {
    const result = calculateCashFlow(emptyModel({ income: [row({ label })] }));
    const csvLabel = readCsv(exportCashFlowCsv(result))[1][2];
    assert.equal(csvLabel, `'${label.trim()}`);
    assert.ok(csvLabel.startsWith("'"));
    // Defensive export also protects labels with whitespace if a result is
    // supplied by another caller rather than the validated calculator.
    result.days[0].transactions[0].label = label;
    assert.equal(readCsv(exportCashFlowCsv(result))[1][2], `'${label}`);
  }
  const normal = calculateCashFlow(emptyModel({ income: [row({ label: "O'Brien – work" })] }));
  assert.equal(readCsv(exportCashFlowCsv(normal))[1][2], "O'Brien – work");
});

test('CSV multiple label lists preserve each distinct entry and do not duplicate money totals', () => {
  const result = calculateCashFlow(emptyModel({ income: [row({ label: 'Pay A' }), row({ label: '=Pay B' })], bills: [row({ label: 'Rent' })] }));
  const rows = readCsv(exportCashFlowCsv(result));
  assert.equal(rows[1][2], "Pay A; '=Pay B");
  assert.equal(rows.slice(1).reduce((sum, csvRow) => sum + Math.round(Number(csvRow[5]) * 100), 0), result.totalIncomeCents);
  assert.equal(rows.slice(1).reduce((sum, csvRow) => sum + Math.round(Number(csvRow[6]) * 100), 0), result.totalExpenseCents);
});
