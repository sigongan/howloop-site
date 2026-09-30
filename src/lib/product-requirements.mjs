// Short excerpts from the published feed, not an assessment of the reader.
// Callers must render these as text and keep the complete provider terms available.
const list = value => Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
const text = value => typeof value === 'string' || typeof value === 'number' && Number.isFinite(value)
  ? String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : '';
const excerpt = value => {
  if (value.length <= 280) return value;
  const cut = value.slice(0, 248);
  const boundary = cut.lastIndexOf(' ');
  return cut.slice(0, boundary > 200 ? boundary : cut.length).trimEnd() + '… (excerpt; see full terms)';
};
const details = entry => {
  const value = text(entry.additionalValue), info = text(entry.additionalInfo);
  return value && info && value.toLowerCase() !== info.toLowerCase() ? value + ' — ' + info : info || value;
};
const decimalAmount = value => {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim()))) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > Number.MAX_SAFE_INTEGER / 100) return null;
  // A dollar reminder must not silently round an unexplained sub-cent minimum.
  return Math.abs(number - Math.round(number * 100) / 100) <= Number.EPSILON * Math.max(1, number) ? number : null;
};
const dollars = value => new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2,
}).format(value);

const eligibilityLabels = {
  OTHER: 'Published requirement', REQUIREMENT: 'Published requirement',
  MIN_AGE: 'Minimum age', MAX_AGE: 'Maximum age', RESIDENCY_STATUS: 'Residency',
  NATURAL_PERSON: 'Account holder', MIN_INCOME: 'Minimum income',
  PENSION_RECIPIENT: 'Pension requirement', BUSINESS: 'Business eligibility',
};
const constraintLabels = {
  OPENING_BALANCE: 'Opening balance', MIN_BALANCE: 'Minimum balance', MAX_BALANCE: 'Maximum balance',
  MIN_LIMIT: 'Published minimum limit', MAX_LIMIT: 'Published maximum limit', OTHER: 'Published account limit',
};

/** Up to three provider excerpts. Missing details never imply unrestricted access. */
export function productRequirements(product) {
  if (!product || typeof product !== 'object') return [];
  const notices = [];
  for (const entry of list(product.eligibility)) {
    if (!entry || typeof entry !== 'object') continue;
    const type = text(entry.eligibilityType), content = details(entry);
    if (!type && !content) continue;
    const routine = ['MIN_AGE', 'MAX_AGE', 'RESIDENCY_STATUS'].includes(type);
    notices.push({
      label: eligibilityLabels[type] || 'Published eligibility',
      text: content || 'An eligibility requirement is listed without details. Check the full terms with the bank.',
      priority: !content ? 9 : routine ? 4 : type === 'NATURAL_PERSON' ? 3 : 0,
    });
  }
  for (const entry of list(product.constraints)) {
    if (!entry || typeof entry !== 'object') continue;
    const type = text(entry.constraintType), content = details(entry);
    if (!type && !content) continue;
    // Keep a number as the provider supplied it; the label supplies its meaning.
    notices.push({
      label: constraintLabels[type] || 'Published account limit',
      text: content || 'An account limit is listed without details. Check the full terms with the bank.',
      priority: !content ? 9 : type === 'OPENING_BALANCE' && decimalAmount(entry.additionalValue) !== 0 ? 1 : 2,
    });
  }
  notices.sort((a, b) => a.priority - b.priority);
  const seen = new Set();
  return notices.filter(notice => {
    const key = notice.label + ':' + notice.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 3).map(({label, text: value}) => ({label, text: excerpt(value)}));
}

/**
 * A source-backed reminder, never a pass/fail eligibility test.
 * No number is extracted from prose, and no monthly timeframe is inferred.
 * Conflicting or incomplete structured amounts need the full terms instead.
 */
export function bonusDepositRequirement(product, contribution) {
  if (typeof contribution !== 'number' || decimalAmount(contribution) === null) return null;
  const conditions = list(product?.depositRates)
    .filter(rate => rate?.depositRateType === 'BONUS')
    .flatMap(rate => list(rate.applicabilityConditions))
    .filter(condition => condition?.rateApplicabilityType === 'MIN_DEPOSIT_AMOUNT');
  if (!conditions.length) return null;
  const amounts = conditions.map(condition => decimalAmount(condition.additionalValue));
  if (amounts.some(amount => amount === null) || new Set(amounts).size !== 1 || amounts[0] <= 0) return null;
  const amount = amounts[0];
  return {
    amount,
    text: `Published minimum deposit: ${dollars(amount)}. Adding ${dollars(contribution)} in this example does not establish that you meet it.`,
  };
}
