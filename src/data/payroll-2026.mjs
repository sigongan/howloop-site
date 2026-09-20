// ATO Withholding Schedules Instrument 2026, schedules 1 and 8.
// Each row is [weekly earnings below, a, b], with y = a*x - b.
export const PAYROLL = {
  year: '2026–27', effectiveFrom: '2026-07-01', effectiveTo: '2027-06-30', checked: '2026-09-20',
  source: 'https://www.legislation.gov.au/F2026L00716/asmade/text',
  superSource: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee',
  superRate: 0.12, superEarningsCap: 270830,
  threshold: [[362,0,0],[538,.15,54.3462],[673,.25,108.2135],[721,.17,54.3473],[865,.179,60.8377],[1282,.3227,185.1935],[2596,.32,181.7319],[3653,.39,363.4627],[Infinity,.47,655.7704]],
  noThreshold: [[188,.15,.15],[371,.2084,11.0185],[515,.179,.1066],[932,.3227,74.1674],[2246,.32,71.6508],[3303,.39,228.8816],[Infinity,.47,493.1893]],
  help: [[1337,0,0],[2494,.15,200.5615],[3577,.17,250.4527],[Infinity,.10,0]],
  helpNoThreshold: [[987,0,0],[2144,.15,148.0615],[2727,.17,190.9527],[Infinity,.10,0]],
};
