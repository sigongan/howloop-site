import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaySounds } from '../web/sounds.js';

function audioWindow({ rejectResume = false, deferResume = false } = {}) {
  const instances = [];
  const parameter = () => ({
    value: 0, events: [],
    cancelScheduledValues(time) { this.events.push(['cancel', time]); },
    setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); },
    linearRampToValueAtTime(value, time) { this.value = value; this.events.push(['linear', value, time]); },
    exponentialRampToValueAtTime(value, time) { this.value = value; this.events.push(['exponential', value, time]); },
  });
  const node = () => ({ disconnected: false, connect() {}, disconnect() { this.disconnected = true; } });
  const source = () => ({
    ...node(), starts: [], stops: [],
    start(time) { this.starts.push(time); }, stop(time) { this.stops.push(time); },
  });
  class AudioContext {
    constructor() {
      this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 44100;
      this.destination = {}; this.oscillators = []; this.sources = []; this.gains = []; this.filters = []; this.buffers = [];
      instances.push(this);
    }
    createGain() { const gain = { ...node(), gain: parameter() }; this.gains.push(gain); return gain; }
    createOscillator() {
      const oscillator = { ...source(), frequency: parameter() };
      this.oscillators.push(oscillator); this.sources.push(oscillator); return oscillator;
    }
    createBufferSource() { const bufferSource = source(); this.sources.push(bufferSource); return bufferSource; }
    createBiquadFilter() {
      const filter = { ...node(), frequency: parameter(), Q: parameter() };
      this.filters.push(filter); return filter;
    }
    createBuffer(channels, length, sampleRate) {
      const data = new Float32Array(length);
      const buffer = { channels, length, sampleRate, getChannelData() { return data; } };
      this.buffers.push(buffer); return buffer;
    }
    async resume() {
      if (rejectResume) throw new Error('Gesture required');
      if (deferResume) await new Promise(resolve => { this.finishResume = resolve; });
      this.state = 'running';
    }
  }
  return { win: { AudioContext }, instances };
}

function finishNotes(context) {
  for (const source of context.sources) source.onended?.();
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
  assert.equal(instances[0].sources.length, 0);
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
  assert.ok(context.sources.at(-1).starts[0] > context.currentTime);
  await active.setEnabled(false);
  assert.equal(active.enabled, false);
  assert.ok(context.sources.every(source => source.stops.at(-1) <= context.currentTime + .02));
  assert.deepEqual(context.gains[0].gain.events.at(-1), ['linear', 0, .018]);
});

test('rapid input is limited, seed pitch advances, and stop allows later sounds', async () => {
  const { win, instances } = audioWindow();
  const sounds = createPlaySounds(win);
  await sounds.setEnabled(true);
  const context = instances[0];
  assert.equal(sounds.play('toString'), false);
  assert.equal(context.sources.length, 0);
  assert.equal(sounds.play('seed', 1), true);
  assert.equal(sounds.play('seed', 2), false);
  context.currentTime = .1;
  assert.equal(sounds.play('seed', 5), true);
  assert.ok(context.oscillators[2].frequency.events[0][1] > context.oscillators[0].frequency.events[0][1]);
  for (let count = 0; count < 15; count++) { context.currentTime += .2; sounds.play('drop'); }
  assert.ok(context.sources.length <= 12);
  sounds.stop();
  assert.equal(sounds.enabled, true);
  assert.equal(sounds.play('pick'), true);
  context.state = 'suspended';
  assert.equal(sounds.enabled, false);
  assert.equal(sounds.play('pick'), false);
});

test('new play cues use quiet layered envelopes and disconnect all sources after finishing', async () => {
  const { win, instances } = audioWindow();
  const sounds = createPlaySounds(win);
  await sounds.setEnabled(true);
  const context = instances[0];
  for (const cue of ['shake', 'drop', 'open', 'close', 'turn', 'seed', 'complete', 'pick', 'puzzlePick', 'puzzleFit', 'puzzleMatch', 'puzzleMiss', 'puzzleComplete']) {
    const before = context.sources.length;
    assert.equal(sounds.play(cue, 3), true, cue);
    assert.ok(context.sources.length - before >= 2, `${cue} has complementary layers`);
    assert.ok(context.sources.length - before <= 12);
    finishNotes(context);
    context.currentTime += 2;
  }
  for (const gain of context.gains.slice(1)) {
    const peak = gain.gain.events.find(event => event[0] === 'linear');
    assert.ok(peak[1] <= .34 && peak[1] > 0);
    assert.ok(gain.gain.events.some(event => event[0] === 'exponential' && event[1] === .0001));
    assert.equal(gain.disconnected, true);
  }
  assert.equal(context.gains[0].gain.events.at(-1)[1], .11);
  assert.ok(context.sources.every(source => source.disconnected));
  assert.ok(context.filters.every(filter => filter.disconnected && filter.type === 'lowpass'));
  assert.equal(context.buffers.length, 1, 'leaf noise texture is generated once and reused');
  const noise = context.buffers[0].getChannelData(0);
  assert.ok(noise.some(value => value !== 0));
  assert.ok(noise.every(value => Math.abs(value) <= 1));
});

test('completion still plays when rapid interactions fill the voice limit', async () => {
  const { win, instances } = audioWindow();
  const sounds = createPlaySounds(win);
  await sounds.setEnabled(true);
  const context = instances[0];
  assert.equal(sounds.play('shake'), true);
  assert.equal(sounds.play('drop'), true);
  assert.equal(context.sources.length, 10);
  assert.equal(sounds.play('open'), false, 'ordinary input respects the voice budget');
  assert.equal(sounds.play('complete'), true, 'an earned reward replaces older note tails');
  assert.ok(context.sources.slice(0, 6).every(source => source.stops.at(-1) <= .02));
  assert.equal(sounds.play('complete'), false, 'reward cooldown still applies');
  sounds.stop();
  assert.ok(context.sources.every(source => source.stops.at(-1) <= .02));
});
