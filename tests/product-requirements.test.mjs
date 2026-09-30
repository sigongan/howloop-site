import test from 'node:test';
import assert from 'node:assert/strict';
import {productRequirements, bonusDepositRequirement} from '../src/lib/product-requirements.mjs';

const deposit = (additionalValue, overrides = {}) => ({rateApplicabilityType: 'MIN_DEPOSIT_AMOUNT', additionalValue, ...overrides});
const bonusProduct = conditions => ({depositRates: [{depositRateType: 'BONUS', applicabilityConditions: conditions}]});

test('shows account membership and linked-account restrictions ahead of routine eligibility', () => {
  const product = {eligibility: [
    {eligibilityType: 'MIN_AGE', additionalValue: '18'},
    {eligibilityType: 'RESIDENCY_STATUS', additionalValue: 'Australian resident'},
    {eligibilityType: 'OTHER', additionalInfo: 'You must be a member of the education-sector credit union.'},
    {eligibilityType: 'REQUIREMENT', additionalInfo: 'An eligible linked transaction account is required.'},
  ], constraints: [{constraintType: 'OPENING_BALANCE', additionalValue: '100.00'}]};
  const before = JSON.stringify(product);
  assert.deepEqual(productRequirements(product), [
    {label: 'Published requirement', text: 'You must be a member of the education-sector credit union.'},
    {label: 'Published requirement', text: 'An eligible linked transaction account is required.'},
    {label: 'Opening balance', text: '100.00'},
  ]);
  assert.equal(JSON.stringify(product), before);
});

test('retains provider wording and separate residency facts instead of asserting suitability', () => {
  assert.deepEqual(productRequirements({eligibility: [
    {eligibilityType: 'RESIDENCY_STATUS', additionalValue: 'Australian citizen or permanent resident', additionalInfo: 'An Australian residential address is required.'},
  ]}), [{label: 'Residency', text: 'Australian citizen or permanent resident — An Australian residential address is required.'}]);
});

test('prioritises the three specific account-opening conditions even when age appears first', () => {
  const requirements = ["You don't have an existing Saver Account already.", 'You need a linked Transaction Account.', "You're the only account holder (no joint account holders)."];
  const result = productRequirements({eligibility: [
    {eligibilityType: 'MIN_AGE', additionalValue: '16'},
    {eligibilityType: 'NATURAL_PERSON', additionalInfo: 'The account is available to personal customers only.'},
    ...requirements.map(additionalInfo => ({eligibilityType: 'OTHER', additionalInfo})),
  ]});
  assert.deepEqual(result.map(item => item.text), requirements);
});

test('missing and unknown requirements remain explicit and never become unrestricted eligibility', () => {
  assert.deepEqual(productRequirements({eligibility: [{eligibilityType: 'OTHER'}]}), [
    {label: 'Published requirement', text: 'An eligibility requirement is listed without details. Check the full terms with the bank.'},
  ]);
  assert.deepEqual(productRequirements({constraints: [{constraintType: 'PROVIDER_SPECIFIC'}]}), [
    {label: 'Published account limit', text: 'An account limit is listed without details. Check the full terms with the bank.'},
  ]);
  for (const input of [null, undefined, {}, {eligibility: [null, 7, {}], constraints: [null, true]}]) assert.deepEqual(productRequirements(input), []);
});

test('deduplicates published text and bounds lengthy excerpts without pretending they are full terms', () => {
  const longText = 'A provider condition with further exceptions and qualifications. '.repeat(12);
  const result = productRequirements({eligibility: [
    {eligibilityType: 'OTHER', additionalInfo: 'Linked\n account\t required.'},
    {eligibilityType: 'OTHER', additionalInfo: 'Linked account required.'},
    {eligibilityType: 'OTHER', additionalInfo: longText},
  ]});
  assert.equal(result.length, 2);
  assert.equal(result[0].text, 'Linked account required.');
  assert.ok(result[1].text.length <= 280);
  assert.ok(result[1].text.endsWith('… (excerpt; see full terms)'));
  assert.ok(longText.startsWith(result[1].text.split('…')[0]));
});

test('does not turn product descriptions or marketing features into eligibility rules', () => {
  assert.deepEqual(productRequirements({description: 'The best account for everyone.', features: [{featureType: 'OTHER', additionalInfo: 'Earn rewards with a linked card.'}]}), []);
});

test('identical values for different requirements retain their distinct meaning', () => {
  const result = productRequirements({eligibility: [{eligibilityType: 'MIN_AGE', additionalValue: '18'}], constraints: [{constraintType: 'OPENING_BALANCE', additionalValue: '18'}]});
  assert.deepEqual(result, [{label: 'Opening balance', text: '18'}, {label: 'Minimum age', text: '18'}]);
});

test('uses a structured bonus minimum without guessing a monthly period', () => {
  assert.deepEqual(bonusDepositRequirement(bonusProduct([deposit('200.00')]), 0), {
    amount: 200,
    text: 'Published minimum deposit: $200. Adding $0 in this example does not establish that you meet it.',
  });
  const result = bonusDepositRequirement(bonusProduct(deposit(200)), 250);
  assert.equal(result.amount, 200);
  assert.match(result.text, /Adding \$250.*does not establish/);
  assert.doesNotMatch(result.text, /month|eligible|qualify|meets/);
});

test('does not infer an amount from prose, other condition types, or non-bonus rates', () => {
  for (const product of [
    bonusProduct([{rateApplicabilityType: 'OTHER', additionalInfo: 'Deposit at least $200 monthly.'}]),
    bonusProduct([{rateApplicabilityType: 'DEPOSIT_BALANCE_INCREASED', additionalValue: '200'}]),
    bonusProduct([deposit(undefined, {additionalInfo: 'Deposit $200'})]),
    {depositRates: [{depositRateType: 'VARIABLE', applicabilityConditions: [deposit('200')]}]},
    {depositRates: [{depositRateType: 'INTRODUCTORY', applicabilityConditions: [deposit('200')]}]},
    null,
  ]) assert.equal(bonusDepositRequirement(product, 0), null);
});

test('invalid and contradictory structured amounts do not produce a fabricated minimum', () => {
  for (const value of ['', ' ', '1,000', '$200', 'AUD 200', '2e2', '-1', '200 per month', '0.004', 0.004, null, {}, false, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(bonusDepositRequirement(bonusProduct([deposit(value)]), 0), null, String(value));
  }
  assert.equal(bonusDepositRequirement(bonusProduct([deposit('200'), deposit('500')]), 0), null);
  assert.equal(bonusDepositRequirement(bonusProduct([deposit('200'), deposit('unknown')]), 0), null);
  assert.equal(bonusDepositRequirement(bonusProduct([deposit('0')]), 0), null);
  for (const value of [undefined, null, '0', -1, Infinity, NaN]) assert.equal(bonusDepositRequirement(bonusProduct([deposit('200')]), value), null);
});

test('identical limits repeated across bonus rows are one source-backed reminder', () => {
  const product = {depositRates: [
    {depositRateType: 'BONUS', applicabilityConditions: [deposit('200.00')]},
    {depositRateType: 'BONUS', applicabilityConditions: deposit(200)},
  ]};
  const before = JSON.stringify(product);
  assert.equal(bonusDepositRequirement(product, 50.5).text, 'Published minimum deposit: $200. Adding $50.50 in this example does not establish that you meet it.');
  assert.equal(JSON.stringify(product), before);
});
