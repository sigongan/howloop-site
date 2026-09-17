import test from 'node:test';
import assert from 'node:assert/strict';
import { feeLines, tierLines } from '../src/lib/product-display.mjs';
const plain = (lines) => lines.join('\n').replaceAll('\u00a0', ' ');
test('CDR nested fixed fees retain cents and explicit zero', () => {
  assert.match(plain(feeLines({ name: 'Paper statement', feeMethodUType: 'fixedAmount', fixedAmount: { amount: '2.50' } })), /AUD 2\.50/);
  assert.match(plain(feeLines({ fixedAmount: { amount: '0.00' } })), /AUD 0\.00/);
  assert.match(plain(feeLines({ amount: '5.75' })), /AUD 5\.75/);
});
test('percentage fees show their basis and supplied monetary bounds separately', () => {
  const output = plain(feeLines({ feeMethodUType: 'rateBased', rateBased: { rateType: 'TRANSACTION', rate: '0.03', amountRange: { feeMinimum: '0.00', feeMaximum: '30.50' } } }));
  assert.match(output, /3% of transaction/);
  assert.match(output, /fee minimum: AUD 0\.00/);
  assert.match(output, /fee maximum: AUD 30\.50/);
  assert.doesNotMatch(output, /total cost/i);
});
test('missing or invalid fees are not presented as a zero charge', () => {
  for (const fee of [{}, { fixedAmount: { amount: '' } }, { fixedAmount: { amount: 'not supplied' } }]) {
    const output = plain(feeLines(fee));
    assert.match(output, /No numerical fee amount/);
    assert.doesNotMatch(output, /AUD 0\.00|NaN/);
  }
  assert.match(plain(feeLines({ feeMethodUType: 'variable' })), /Variable fee/);
});
test('fee currency and discount qualifications are retained', () => {
  const output = plain(feeLines({ fixedAmount: { amount: '2.50' }, currency: 'USD', discounts: [{ description: 'Youth discount', eligibility: [{ discountEligibilityType: 'MAX_AGE', additionalValue: '18' }] }] }));
  assert.match(output, /USD 2\.50/);
  assert.match(output, /not applied/);
  assert.match(output, /Discount condition: max age - 18/);
});
test('nested tier conditions are visible and missing upper bounds are not unlimited eligibility', () => {
  const output = plain(tierLines({ minimumValue: '1000', unitOfMeasure: 'DOLLAR', rateApplicationMethod: 'WHOLE_BALANCE', applicabilityConditions: [{ rateApplicabilityType: 'MIN_DEPOSITS', additionalValue: '1000', additionalInfo: 'Must qualify each calendar month.' }] }));
  assert.match(output, /upper bound not supplied in this feed/);
  assert.match(output, /Tier condition: min deposits - 1000 - Must qualify each calendar month/);
  assert.doesNotMatch(output, /no upper limit|unlimited/i);
});
test('zero tier bounds and provider text are preserved as plain strings', () => {
  const output = plain(tierLines({ minimumValue: '0', maximumValue: '0', additionalInfo: '<b>Provider text</b>' }));
  assert.match(output, /0 to 0/);
  assert.match(output, /<b>Provider text<\/b>/);
});

test('legacy single-object tier conditions preserve provider information without throwing', () => {
  const output = plain(tierLines({ minimumValue: '0', applicabilityConditions: { additionalInfo: 'See bank terms', additionalInfoUri: 'https://example.com/terms' } }));
  assert.match(output, /Tier condition: See bank terms - https:\/\/example.com\/terms/);
});
