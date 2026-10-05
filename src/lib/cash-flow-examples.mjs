import { createSampleModel } from './cash-flow.mjs';

// A fixed, reproducible example. Never use the clock or the visitor's own data.
export const TIMING_EXAMPLE_START = '2026-10-05';
export function createTimingExampleModel() {
  return { ...createSampleModel(TIMING_EXAMPLE_START), openingBalance: '400.00' };
}
