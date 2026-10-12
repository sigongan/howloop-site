import { createSampleModel } from './cash-flow.mjs';

// A fixed, reproducible example. Never use the clock or the visitor's own data.
export const TIMING_EXAMPLE_START = '2026-10-05';
export function createTimingExampleModel() {
  return { ...createSampleModel(TIMING_EXAMPLE_START), openingBalance: '400.00' };
}

// This public ID selects fixed example data. Financial amounts never travel in the URL.
export const HOME_EXAMPLE_PRESET_ID = 'rent-before-pay-2026';
export function createHomeExampleModel() {
  return {
    startDate: '2026-10-12',
    openingBalance: '400.00',
    buffer: '0.00',
    income: [{ label: 'Pay', amount: '2200.00', anchorDate: '2026-10-14', frequency: 'once' }],
    bills: [{ label: 'Rent', amount: '650.00', anchorDate: '2026-10-12', frequency: 'once' }],
  };
}

