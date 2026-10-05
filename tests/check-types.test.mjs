import test from 'node:test';
import assert from 'node:assert/strict';
import { missingTypecheckDependencies } from '../scripts/check-types.mjs';
test('type-check preflight distinguishes a missing checker from a successful check', () => {
  assert.deepEqual(missingTypecheckDependencies(()=>{throw new Error('MODULE_NOT_FOUND');}),['@astrojs/check','typescript']);
  assert.deepEqual(missingTypecheckDependencies(name=>{if(name==='typescript')throw Error();return '/checker';}),['typescript']);
  assert.deepEqual(missingTypecheckDependencies(()=>'/resolved'),[]);
});
