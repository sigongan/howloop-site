// Display the provider's published components without inferring eligibility or a total cost.
const present = (value) => value !== undefined && value !== null && String(value).trim() !== '';
const words = (value) => String(value ?? '').toLowerCase().replaceAll('_', ' ');
const amount = (value, currency = 'AUD') => {
  if (!present(value) || !Number.isFinite(Number(value))) return null;
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency, currencyDisplay: 'code', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
  } catch { return String(value) + ' ' + String(currency); }
};
const percentage = (value) => present(value) && Number.isFinite(Number(value))
  ? new Intl.NumberFormat('en-AU', { style: 'percent', maximumFractionDigits: 6 }).format(Number(value)) : null;
export const conditionList = (value) => Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
export function conditionText(condition = {}) {
  return [words(condition.rateApplicabilityType ?? condition.eligibilityType ?? condition.discountEligibilityType), condition.additionalValue, condition.additionalInfo, condition.additionalInfoUri].filter(present).join(' - ');
}
export function feeLines(fee = {}) {
  const lines = [[fee.name, words(fee.feeType)].filter(present).join(' - ')];
  const currency = fee.currency ?? 'AUD';
  const fixed = amount(fee.fixedAmount?.amount ?? fee.amount, currency);
  const rate = percentage(fee.rateBased?.rate ?? fee.transactionRate ?? fee.balanceRate ?? fee.accruedRate);
  if (fixed !== null) lines.push('Published fixed amount: ' + fixed);
  if (rate !== null) {
    const basis = fee.rateBased?.rateType ?? (present(fee.transactionRate) ? 'TRANSACTION' : present(fee.balanceRate) ? 'BALANCE' : '');
    lines.push('Published percentage: ' + rate + (basis ? ' of ' + words(basis) : ' (basis not supplied)'));
    if (fee.rateBased?.accrualFrequency) lines.push('Accrual frequency supplied by provider: ' + fee.rateBased.accrualFrequency);
  }
  const range = fee.rateBased?.amountRange ?? fee.variable?.amountRange;
  for (const [key, label] of [['feeMinimum', 'Published fee minimum'], ['feeMaximum', 'Published fee maximum']]) {
    const value = amount(range?.[key], currency);
    if (value !== null) lines.push(label + ': ' + value);
  }
  if (fixed === null && rate === null) lines.push(fee.feeMethodUType === 'variable' ? 'Variable fee - confirm the amount with the provider.' : 'No numerical fee amount supplied here - check the provider.');
  if (present(fee.additionalValue)) lines.push('Provider frequency or value: ' + fee.additionalValue);
  if (present(fee.additionalInfo)) lines.push(fee.additionalInfo);
  if (fee.discounts?.length) {
    lines.push('Conditional discounts are listed by the provider; they are not applied to this projection.');
    for (const discount of fee.discounts) {
      if (present(discount.description)) lines.push(discount.description);
      if (present(discount.additionalInfo)) lines.push(discount.additionalInfo);
      for (const condition of discount.eligibility ?? []) {
        const text = conditionText(condition);
        if (text) lines.push('Discount condition: ' + text);
      }
    }
  }
  return lines.filter(present);
}
export function tierLines(tier = {}) {
  const upper = present(tier.maximumValue) ? tier.maximumValue : 'upper bound not supplied in this feed';
  const lines = ['Provider tier data: ' + (tier.name ? tier.name + ' - ' : '') + (tier.minimumValue ?? 'minimum not supplied') + ' to ' + upper + ' (' + words(tier.unitOfMeasure ?? 'unit not supplied') + '; ' + words(tier.rateApplicationMethod ?? 'method not supplied') + ').'];
  if (present(tier.additionalInfo)) lines.push(tier.additionalInfo);
  for (const condition of conditionList(tier.applicabilityConditions)) {
    const text = conditionText(condition);
    if (text) lines.push('Tier condition: ' + text);
  }
  return lines;
}
