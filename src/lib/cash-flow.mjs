/**
 * Deterministic 13-week household cash-flow projection. All money is integer AUD
 * cents; all dates are date-only strings interpreted with UTC calendar math.
 * No interest, tax, recommendations, persistence, clock access or networking.
 *
 * Public API:
 * - calculateCashFlow({startDate, openingBalance, buffer, income, bills})
 *   openingBalance/buffer/row.amount are decimal STRINGS (e.g. "1,250.50").
 *   income/bills are arrays of {label, amount, anchorDate, frequency}, with up
 *   to 40 rows COMBINED. frequency: once | weekly | fortnightly | monthly.
 *   Monthly payments keep the ORIGINAL anchor day and clamp in short months.
 *   startDate through startDate + 90 days are included; all dates must be in
 *   2000–2099, including the entire projection horizon. Empty arrays are valid.
 * - createSampleModel(startDate = '2026-10-05') returns a new editable model.
 * - exportCashFlowCsv(result) returns quoted daily CSV, with formula-safe labels.
 * - parseMoneyToCents(value, {allowNegative = false, field = 'amount'} = {})
 * - parseDateOnly(value, field = 'date') returns a UTC epoch-day integer.
 * - formatMoney(cents) returns an en-AU AUD display string.
 *
 * Invalid input throws CashFlowValidationError with .field (e.g.
 * 'income.0.amount') and a human-readable .message. No inputs are mutated.
 *
 * Result minimumClosingBalance considers END-OF-DAY balances only. The
 * conservativeMinimum and each day's withinDayMinimumCents instead assume ALL
 * bills debit before ANY income on the same date; this includes that day's
 * opening balance. These are distinct measures, not predicted bank posting
 * order. All minimum points are {amountCents, date}; ties use the earliest date.
 * Threshold dates are null when never breached, and use strict less-than.
 */

export const HORIZON_DAYS = 91;
export const MAX_SCHEDULE_ROWS = 40;
export const MAX_INPUT_CENTS = 1_000_000_000; // A$10,000,000 per input.
const DAY_MS = 86_400_000;
const MIN_YEAR = 2000;
const MAX_YEAR = 2099;
const FREQUENCIES = new Set(['once', 'weekly', 'fortnightly', 'monthly']);

export class CashFlowValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'CashFlowValidationError';
    this.field = field;
  }
}

function invalid(field, message) {
  throw new CashFlowValidationError(message, field);
}

/** Parse a decimal money string without floating-point rounding or coercion. */
export function parseMoneyToCents(value, { allowNegative = false, field = 'amount' } = {}) {
  if (typeof value !== 'string' || value.length > 40) {
    invalid(field, 'Enter an amount as a decimal number, no larger than A$10,000,000.');
  }
  const text = value.trim();
  // Commas, when present, must be correctly grouped. No exponent notation,
  // currency symbols, plus signs, blank amounts, Infinity or fractional cents.
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) {
    invalid(field, 'Enter a valid amount with no more than two decimal places.');
  }
  const negative = text.startsWith('-');
  if (negative && !allowNegative) invalid(field, 'This amount cannot be negative.');
  const unsigned = (negative ? text.slice(1) : text).replaceAll(',', '');
  const [whole, decimal = ''] = unsigned.split('.');
  const magnitude = BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0'));
  if (magnitude > BigInt(MAX_INPUT_CENTS)) {
    invalid(field, 'Each amount must be no larger than A$10,000,000.');
  }
  const cents = Number(magnitude);
  // Canonicalise negative zero; it should not leak into comparisons or output.
  return negative && cents !== 0 ? -cents : cents;
}

/** Strict YYYY-MM-DD, valid Gregorian date in 2000–2099, as UTC epoch days. */
export function parseDateOnly(value, field = 'date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    invalid(field, 'Enter a date in YYYY-MM-DD format.');
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12 || day < 1 || day > 31) {
    invalid(field, 'Enter a valid date between 2000-01-01 and 2099-12-31.');
  }
  const milliseconds = Date.UTC(year, month - 1, day);
  const date = new Date(milliseconds);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    invalid(field, 'Enter a real calendar date.');
  }
  return milliseconds / DAY_MS;
}

function dateString(epochDay) {
  return new Date(epochDay * DAY_MS).toISOString().slice(0, 10);
}

function calendarParts(epochDay) {
  const date = new Date(epochDay * DAY_MS);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
}

function horizon(startDate) {
  const start = parseDateOnly(startDate, 'startDate');
  const end = start + HORIZON_DAYS - 1;
  if (calendarParts(end).year > MAX_YEAR) {
    invalid('startDate', 'Choose a start date whose full 13 weeks end by 2099-12-31.');
  }
  return { start, end };
}

function safeAdd(a, b) {
  const value = a + b;
  if (!Number.isSafeInteger(value)) invalid('model', 'The combined amounts are too large to calculate safely.');
  return value;
}

function validateRows(rows, group) {
  if (!Array.isArray(rows)) invalid(group, `Enter ${group} as a list of scheduled items.`);
  if (rows.length > MAX_SCHEDULE_ROWS) invalid(group, 'Use no more than 40 income and bill rows in total.');
  return Array.from(rows, (row, index) => {
    const field = `${group}.${index}`;
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      invalid(field, 'Enter a valid scheduled item.');
    }
    if (typeof row.label !== 'string' || row.label.length > 80 || row.label.trim().length === 0) {
      invalid(`${field}.label`, 'Give each item a label of 1 to 80 characters.');
    }
    const amountCents = parseMoneyToCents(row.amount, { field: `${field}.amount` });
    if (amountCents <= 0) invalid(`${field}.amount`, 'Scheduled amounts must be greater than zero.');
    const anchorDay = parseDateOnly(row.anchorDate, `${field}.anchorDate`);
    if (!FREQUENCIES.has(row.frequency)) {
      invalid(`${field}.frequency`, 'Choose once, weekly, fortnightly or monthly.');
    }
    return {
      kind: group === 'income' ? 'income' : 'expense',
      label: row.label.trim(),
      amountCents,
      anchorDay,
      frequency: row.frequency,
    };
  });
}

function occurrenceDays(row, start, end) {
  if (row.anchorDay > end) return [];
  if (row.frequency === 'once') return row.anchorDay >= start ? [row.anchorDay] : [];
  if (row.frequency === 'weekly' || row.frequency === 'fortnightly') {
    const step = row.frequency === 'weekly' ? 7 : 14;
    // Jump directly to the horizon rather than iterating old occurrences.
    const first = row.anchorDay + Math.max(0, Math.ceil((start - row.anchorDay) / step)) * step;
    const dates = [];
    for (let day = first; day <= end; day += step) dates.push(day);
    return dates;
  }
  const anchor = calendarParts(row.anchorDay);
  const first = calendarParts(start);
  const last = calendarParts(end);
  const lastMonth = last.year * 12 + last.month;
  const dates = [];
  for (let monthIndex = Math.max(anchor.year * 12 + anchor.month, first.year * 12 + first.month);
    monthIndex <= lastMonth; monthIndex += 1) {
    const year = Math.floor(monthIndex / 12);
    const month = monthIndex % 12;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = Date.UTC(year, month, Math.min(anchor.day, daysInMonth)) / DAY_MS;
    if (day >= start && day >= row.anchorDay && day <= end) dates.push(day);
  }
  return dates;
}

function minimumPoint(days, key) {
  let point = null;
  for (const day of days) {
    if (point === null || day[key] < point.amountCents) point = { amountCents: day[key], date: day.date };
  }
  return point;
}

/** Calculate 91 daily records, 13 seven-day summaries, and threshold dates. */
export function calculateCashFlow(model) {
  if (model === null || typeof model !== 'object' || Array.isArray(model)) {
    invalid('model', 'Enter a cash-flow plan.');
  }
  const { start, end } = horizon(model.startDate);
  const openingBalanceCents = parseMoneyToCents(model.openingBalance, { allowNegative: true, field: 'openingBalance' });
  const bufferCents = parseMoneyToCents(model.buffer, { field: 'buffer' });
  // Check the bound before reading or expanding any individual rows.
  if (!Array.isArray(model.income)) invalid('income', 'Enter income as a list of scheduled items.');
  if (!Array.isArray(model.bills)) invalid('bills', 'Enter bills as a list of scheduled items.');
  if (model.income.length + model.bills.length > MAX_SCHEDULE_ROWS) {
    invalid('schedules', 'Use no more than 40 income and bill rows in total.');
  }
  const income = validateRows(model.income, 'income');
  const bills = validateRows(model.bills, 'bills');
  const occurrences = Array.from({ length: HORIZON_DAYS }, () => []);
  // Bills precede income consistently, including the CSV and transaction ledger.
  for (const row of [...bills, ...income]) {
    for (const day of occurrenceDays(row, start, end)) {
      occurrences[day - start].push({ kind: row.kind, label: row.label, amountCents: row.amountCents });
    }
  }

  let balance = openingBalanceCents;
  let totalIncomeCents = 0;
  let totalExpenseCents = 0;
  const days = occurrences.map((transactions, index) => {
    const startingBalanceCents = balance;
    let incomeCents = 0;
    let expenseCents = 0;
    let withinDayMinimumCents = startingBalanceCents;
    const ledger = transactions.map((transaction) => {
      if (transaction.kind === 'income') {
        incomeCents = safeAdd(incomeCents, transaction.amountCents);
        balance = safeAdd(balance, transaction.amountCents);
      } else {
        expenseCents = safeAdd(expenseCents, transaction.amountCents);
        balance = safeAdd(balance, -transaction.amountCents);
      }
      withinDayMinimumCents = Math.min(withinDayMinimumCents, balance);
      return { ...transaction, balanceAfterCents: balance };
    });
    totalIncomeCents = safeAdd(totalIncomeCents, incomeCents);
    totalExpenseCents = safeAdd(totalExpenseCents, expenseCents);
    return {
      date: dateString(start + index),
      weekNumber: Math.floor(index / 7) + 1,
      startingBalanceCents,
      incomeCents,
      expenseCents,
      closingBalanceCents: balance,
      withinDayMinimumCents,
      transactions: ledger,
    };
  });
  const weeks = Array.from({ length: 13 }, (_, index) => {
    const week = days.slice(index * 7, index * 7 + 7);
    return {
      weekNumber: index + 1,
      startDate: week[0].date,
      endDate: week[6].date,
      startingBalanceCents: week[0].startingBalanceCents,
      incomeCents: week.reduce((sum, day) => safeAdd(sum, day.incomeCents), 0),
      expenseCents: week.reduce((sum, day) => safeAdd(sum, day.expenseCents), 0),
      closingBalanceCents: week[6].closingBalanceCents,
      minimumClosingBalance: minimumPoint(week, 'closingBalanceCents'),
      conservativeMinimum: minimumPoint(week, 'withinDayMinimumCents'),
    };
  });
  const firstBelow = (key, threshold) => days.find((day) => day[key] < threshold)?.date ?? null;
  return {
    startDate: model.startDate,
    endDate: dateString(end),
    openingBalanceCents,
    bufferCents,
    totalIncomeCents,
    totalExpenseCents,
    closingBalanceCents: balance,
    minimumClosingBalance: minimumPoint(days, 'closingBalanceCents'),
    conservativeMinimum: minimumPoint(days, 'withinDayMinimumCents'),
    firstBelowZeroDate: firstBelow('closingBalanceCents', 0),
    firstBelowBufferDate: firstBelow('closingBalanceCents', bufferCents),
    firstConservativeBelowZeroDate: firstBelow('withinDayMinimumCents', 0),
    firstConservativeBelowBufferDate: firstBelow('withinDayMinimumCents', bufferCents),
    days,
    weeks,
  };
}

/** Fresh sample, anchored to a fixed baseline and shifted to the chosen start. */
export function createSampleModel(startDate = '2026-10-05') {
  const { start } = horizon(startDate);
  const baseline = parseDateOnly('2026-10-05');
  const shifted = (date) => dateString(start + parseDateOnly(date) - baseline);
  return {
    startDate,
    openingBalance: '3200.00',
    buffer: '1500.00',
    income: [
      { label: 'Fortnightly pay', amount: '3500.00', anchorDate: shifted('2026-10-09'), frequency: 'fortnightly' },
      { label: 'Monthly pay', amount: '1400.00', anchorDate: shifted('2026-10-15'), frequency: 'monthly' },
    ],
    bills: [
      { label: 'Housing', amount: '650.00', anchorDate: shifted('2026-10-05'), frequency: 'weekly' },
      { label: 'Groceries', amount: '180.00', anchorDate: shifted('2026-10-07'), frequency: 'weekly' },
      { label: 'Transport', amount: '95.00', anchorDate: shifted('2026-10-08'), frequency: 'fortnightly' },
      { label: 'Utilities', amount: '220.00', anchorDate: shifted('2026-10-19'), frequency: 'monthly' },
      { label: 'Annual insurance', amount: '1100.00', anchorDate: shifted('2026-11-02'), frequency: 'once' },
    ],
  };
}

/** Display cents only; no arithmetic relies on this formatter. */
export function formatMoney(cents) {
  if (!Number.isSafeInteger(cents)) invalid('amount', 'Money must be a safe integer number of cents.');
  const magnitude = Math.abs(cents);
  // Group whole dollars separately so even the largest safe integer-cent
  // input cannot lose a cent when converted to fractional floating dollars.
  const whole = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 }).format(Math.floor(magnitude / 100));
  return `${cents < 0 ? '-' : ''}$${whole}.${String(magnitude % 100).padStart(2, '0')}`;
}

function decimalMoney(cents) {
  if (!Number.isSafeInteger(cents)) invalid('result', 'CSV amounts must be safe integer cents.');
  const magnitude = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}${Math.floor(magnitude / 100)}.${String(magnitude % 100).padStart(2, '0')}`;
}

function safeLabel(label) {
  const text = String(label);
  // Leading whitespace (including tabs, newlines and BOM) must not conceal a
  // formula. Prefix the entire user value, then apply ordinary CSV escaping.
  return /^\s*[=+\-@]/u.test(text) ? `'${text}` : text;
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

/**
 * One row per day. Multiple income/bill labels are joined with '; '. All cells
 * are quoted, embedded quotes/newlines preserved, and every user label is
 * formula-neutralised. Fixed-point monetary columns remain numeric on import.
 */
export function exportCashFlowCsv(result) {
  if (!result || !Array.isArray(result.days) || result.days.length !== HORIZON_DAYS) {
    invalid('result', 'Export a completed 13-week projection.');
  }
  const rows = [[
    'Date', 'Week', 'Income labels', 'Bill labels', 'Starting balance (AUD)',
    'Income (AUD)', 'Bills (AUD)', 'Closing balance (AUD)',
    'Conservative within-day minimum (AUD)', 'Buffer (AUD)',
  ]];
  for (const day of result.days) {
    rows.push([
      day.date,
      day.weekNumber,
      day.transactions.filter((item) => item.kind === 'income').map((item) => safeLabel(item.label)).join('; '),
      day.transactions.filter((item) => item.kind === 'expense').map((item) => safeLabel(item.label)).join('; '),
      decimalMoney(day.startingBalanceCents),
      decimalMoney(day.incomeCents),
      decimalMoney(day.expenseCents),
      decimalMoney(day.closingBalanceCents),
      decimalMoney(day.withinDayMinimumCents),
      decimalMoney(result.bufferCents),
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
