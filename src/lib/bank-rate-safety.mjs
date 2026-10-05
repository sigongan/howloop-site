// Shared fail-closed rules for every automatic bank-rate model and preview.
// Provider prose is evidence of ambiguity, never a source from which to invent
// a replacement numerical cap, total rate or eligibility decision.
const amount = value => (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim()) || typeof value === 'number')
  && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
export const validDepositRate = value => (typeof value === 'string' && value.trim() !== '' || typeof value === 'number')
  && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= .3;

function accountLimits(product) {
  if (product?.constraints != null && !Array.isArray(product.constraints)) return null;
  let minimum = 0, maximum = Infinity;
  for (const rule of product?.constraints ?? []) {
    if (!rule || !['MIN_BALANCE', 'OPENING_BALANCE', 'MAX_BALANCE'].includes(rule.constraintType)) continue;
    const limit = amount(rule.additionalValue);
    if (limit === null) return null;
    if (rule.constraintType === 'MAX_BALANCE') maximum = Math.min(maximum, limit);
    else minimum = Math.max(minimum, limit);
  }
  return minimum <= maximum ? {minimum, maximum} : null;
}

export function withinAccountLimits(product, start, end) {
  const limits = accountLimits(product);
  return !!limits && Number.isFinite(start) && Number.isFinite(end)
    && start >= limits.minimum && end >= limits.minimum
    && start <= limits.maximum && end <= limits.maximum;
}

export function hasAmbiguousRateText(rows) {
  return rows.some(row => {
    const conditions = value => Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
    const text = [row.additionalInfo, row.additionalValue,
      ...conditions(row.applicabilityConditions).map(c => c.additionalInfo),
      ...(row.tiers ?? []).flatMap(t => [t.additionalInfo, ...conditions(t.applicabilityConditions).map(c => c.additionalInfo)])
    ].filter(Boolean).join(' ');
    // Some feeds label a total as BONUS. Adding it to base would double-count.
    if (/\b(?:includes?|inclusive of)\b.{0,50}\b(?:base|standard|bonus)\b/i.test(text)
      || /\b(?:total|combined|overall)\s+(?:interest\s+)?rate\b/i.test(text)) return true;
    // Text-only balance caps/ranges can contradict even open-ended CDR tiers.
    if (/\b(?:up to|capped at|maximum of|less than|greater than|above|below|over|under|first)\s*(?:AUD\s*\$?|AU?\$|\$)\s*\d/i.test(text)
      || /\bbalances?\b.{0,40}\b(?:cap|limit|maximum|exceed)/i.test(text)
      || /\b(?:minimum|maximum)\s+(?:account\s+)?balances?\b/i.test(text)) return true;
    // A prose welcome/expiry period cannot silently become a permanent BONUS.
    if (/\b(?:first|initial|next|for|after)\s+\d+\s*-?\s*(?:days?|months?|years?)\b/i.test(text)
      || /\b(?:expires?|expiry|limited[ -]time)\b/i.test(text)) return true;
    return row.depositRateType !== 'INTRODUCTORY' && /^P\d+[DMY]$/.test(row.additionalValue ?? '');
  });
}

export function guardBankRateModel(product, model) {
  if (!accountLimits(product)) return null;
  const validateBalance = balance => {
    if (!withinAccountLimits(product, balance, balance)) throw new RangeError('The balance is outside the published account limits. Enter a confirmed custom rate or choose another account.');
  };
  const guarded = (balance, month = 1) => { validateBalance(balance); return model(balance, month); };
  // savings() checks the closing balance too, including the final month's
  // interest and deposit. A cap crossed in the last month must not slip through.
  guarded.validateBalance = validateBalance;
  return guarded;
}
