import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppleScene } from '../web/apple-scene.js';
import { initialState, updateState } from '../web/state.js';

// GPU calls are stubbed; the renderer's real geometry, visibility, ray picking
// and application reducer are exercised together. This is not a visual test.
function sceneFixture(onSeed) {
  const noop = () => {};
  const context = new Proxy({ createRadialGradient: () => ({ addColorStop: noop }) }, {
    get: (object, key) => key in object ? object[key] : noop,
    set: (object, key, value) => (object[key] = value, true),
  });
  let nextEnum = 1;
  const gl = new Proxy({ getShaderParameter: () => true, getProgramParameter: () => true,
    getAttribLocation: () => 0, getUniformLocation: () => ({}) }, {
    get: (object, key) => {
      if (key in object) return object[key];
      if (key.toUpperCase() === key) return object[key] = nextEnum++;
      return object[key] = () => ({});
    },
  });
  const window = { requestAnimationFrame: () => 1, cancelAnimationFrame: noop,
    devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
  const canvas = { getContext: () => gl,
    ownerDocument: { defaultView: window, createElement: () => ({ getContext: () => context }) },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 500 }),
    addEventListener: noop, removeEventListener: noop, dataset: {} };
  return createAppleScene(canvas, { onSeed });
}

test('visible seeds selected during gradual opening are recorded by the playground', () => {
  let state = initialState();
  const scene = sceneFixture(id => { state = updateState(state, { type: 'seed', id }); });
  try {
    for (const fruit of ['lemon', 'apple']) {
      for (const split of [0.2, 0.4, 0.54, 1]) {
        state = updateState(initialState(), { type: 'fruit', fruit });
        state = updateState(state, { type: 'inspect' });
        state = updateState(state, { type: 'split', value: split });
        scene.setState(state);
        const visible = scene.getSeedTargets().filter(target => target.visible);
        assert.ok(visible.length > 0, `${fruit} at ${split} has visible seeds`);
        for (const target of visible) {
          assert.equal(scene.pickSeed(target.clientX, target.clientY), target.id);
          assert.ok(state.foundSeeds.has(target.id),
            `A visible ${fruit} seed at opening ${split} must respond to a tap`);
        }
      }
    }
  } finally { scene.destroy(); }
});
