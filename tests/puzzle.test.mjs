import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPuzzleState, updatePuzzleState, isPuzzleComplete } from '../web/fruit-puzzle.js';

test('puzzle supports selecting and placing all three pieces in any order', () => {
  let state = initialPuzzleState('apple');
  for (const piece of [2, 0, 1]) {
    state = updatePuzzleState(state, { type: 'select', piece });
    assert.equal(state.selected, piece);
    state = updatePuzzleState(state, { type: 'place', slot: piece });
    assert.equal(state.selected, null);
  }
  assert.deepEqual(state.placed, [0, 1, 2]);
  assert.equal(isPuzzleComplete(state), true);
  assert.equal(state.fruit, 'apple');
});

test('wrong spaces preserve progress and selection; duplicate or corrupt pieces are ignored', () => {
  let state = updatePuzzleState(initialPuzzleState(), { type: 'select', piece: 1 });
  assert.equal(updatePuzzleState(state, { type: 'place', slot: 0 }), state);
  assert.equal(state.selected, 1);
  assert.deepEqual(state.placed, []);
  for (const piece of [-1, 3, 0.5, NaN, '1', undefined]) {
    assert.equal(updatePuzzleState(state, { type: 'select', piece }), state);
    assert.equal(updatePuzzleState(state, { type: 'place', piece, slot: piece }), state);
  }
  state = updatePuzzleState(state, { type: 'place', piece: 1, slot: 1 });
  assert.equal(updatePuzzleState(state, { type: 'place', piece: 1, slot: 1 }), state);
  assert.equal(updatePuzzleState(state, { type: 'select', piece: 1 }), state);
  assert.equal(isPuzzleComplete(state), false);
});

test('fruit changes and replay clear puzzle progress without changing earlier state', () => {
  const original = initialPuzzleState('watermelon');
  const played = updatePuzzleState(original, { type: 'place', piece: 0, slot: 0 });
  assert.deepEqual(original.placed, []);
  assert.deepEqual(played.placed, [0]);
  assert.deepEqual(updatePuzzleState(played, { type: 'reset' }), initialPuzzleState('watermelon'));
  assert.deepEqual(updatePuzzleState(played, { type: 'fruit', fruit: 'lemon' }), initialPuzzleState('lemon'));
  assert.throws(() => initialPuzzleState('banana'), RangeError);
  assert.throws(() => updatePuzzleState(played, { type: 'fruit', fruit: '../apple' }), RangeError);
});
