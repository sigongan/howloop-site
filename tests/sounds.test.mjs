import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaySounds } from '../web/sounds.js';

function audioWindow({ rejectResume = false, deferResume = false } = {}) {
  const instances = [];
  const parameter = () => ({ value: 0, events: [], cancelScheduledValues(time) { this.events.push(['cancel', time]); }, setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }, linearRampToValueAtTime(value, time) { this.value = value; this.events.push(['linear', value, time]); }, exponentialRampToValueAtTime(value, time) { this.value = value; this.events.push(['exponential', value, time]); } });
  class AudioContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; this.oscillators = []; this.gains = []; instances.push(this); }
    createGain() { const gain = { gain: parameter(), connect() {}, disconnect() {} }; this.gains.push(gain); return gain; }
    createOscillator() { const oscillator = { frequency: parameter(), starts: [], stops: [], connect() {}, disconnect() {}, start(time) { this.starts.push(time); }, stop(time) { this.stops.push(time); } }; this.oscillators.push(oscillator); return oscillator; }
    async resume() {
      if (rejectResume) throw new Error('Gesture required');
      if (deferResume) await new Promise(resolve => { this.finishResume = resolve; });
      this.state = 'running';
    }
  }
  return { win: { AudioContext }, instances };
}

test('sound stays silent and creates no audio session until explicitly enabled', async () => {
  const { win, instances } = audioWindow();
  const sounds = createPlaySounds(win);
  assert.equal(sounds.enabled, false);
  assert.equal(sounds.available, true);
  assert.equal(sounds.play('seed', 1), false);
  assert.equal(instances.length, 0);
  assert.equal(await sounds.setEnabled(true), true);
  assert.equal(instances.length, 1);
  assert.equal(instances[0].oscillators.length, 0);
  assert.equal(sounds.enabled, true);
});

test('unsupported and rejected audio activation fail quietly without claiming sound is enabled', async () => {
  const unsupported = createPlaySounds({});
  assert.equal(unsupported.available, false);
  assert.equal(await unsupported.setEnabled(true), false);
  const { win } = audioWindow({ rejectResume: true });
  const rejected = createPlaySounds(win);
  assert.equal(await rejected.setEnabled(true), false);
  assert.equal(rejected.enabled, false);
  assert.equal(rejected.play('complete'), false);
});

test('turning sound off cancels pending activation and all already scheduled notes', async () => {
  const pending = audioWindow({ deferResume: true });
  const sounds = createPlaySounds(pending.win);
  const enabling = sounds.setEnabled(true);
  assert.equal(await sounds.setEnabled(false), false);
  pending.instances[0].finishResume();
  assert.equal(await enabling, false);
  assert.equal(sounds.enabled, false);

  const running = audioWindow();
  const active = createPlaySounds(running.win);
  await active.setEnabled(true);
  active.play('complete');
  const context = running.instances[0];
  assert.ok(context.oscillators[3].starts[0] > context.currentTime);
  await active.setEnabled(false);
  assert.equal(active.enabled, false);
  assert.ok(context.oscillators.every(oscillator => oscillator.stops.at(-1) <= context.currentTime + .02));
  assert.deepEqual(context.gains[0].gain.events.at(-1), ['linear', 0, .018]);
});

test('rapid input is limited, seed pitch advances, and stop allows later sounds', async () => {
  const { win, instances } = audioWindow();
  const sounds = createPlaySounds(win);
  await sounds.setEnabled(true);
  const context = instances[0];
  assert.equal(sounds.play('toString'), false);
  assert.equal(context.oscillators.length, 0);
  assert.equal(sounds.play('seed', 1), true);
  assert.equal(sounds.play('seed', 2), false);
  context.currentTime = .1;
  assert.equal(sounds.play('seed', 5), true);
  assert.ok(context.oscillators[1].frequency.events[0][1] > context.oscillators[0].frequency.events[0][1]);
  for (let count = 0; count < 15; count++) { context.currentTime += .2; sounds.play('drop'); }
  assert.ok(context.oscillators.length <= 12);
  sounds.stop();
  assert.equal(sounds.enabled, true);
  assert.equal(sounds.play('pick'), true);
  context.state = 'suspended';
  assert.equal(sounds.enabled, false);
  assert.equal(sounds.play('pick'), false);
});
