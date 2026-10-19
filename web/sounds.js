// Original, quiet playground cues. Audio is created only by the sound toggle.
export function createPlaySounds(win = globalThis.window) {
  const Context = win?.AudioContext || win?.webkitAudioContext;
  let context = null;
  let master = null;
  let rustleBuffer = null;
  let selected = false;
  let supported = typeof Context === 'function';
  let activation = 0;
  const voices = new Set();
  const lastPlayed = new Map();
  const volume = .11;
  const maxVoices = 12;
  const cooldowns = {
    shake: .18, drop: .1, open: .35, close: .35, turn: .22,
    seed: .09, complete: 1, pick: .15,
    puzzlePick: .1, puzzleFit: .12, puzzleMatch: .12, puzzleMiss: .18, puzzleComplete: 1,
  };

  function fadeVoice(voice, now) {
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + .018);
      voice.source.stop(now + .02);
    } catch { /* A note may have finished between the event and this loop. */ }
  }

  function silence() {
    if (!context || !master) return;
    const now = context.currentTime;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + .018);
    } catch { /* An interrupted or closed audio session is already silent. */ }
    for (const voice of voices) fadeVoice(voice, now);
    voices.clear();
    lastPlayed.clear();
  }

  async function setEnabled(value) {
    const request = ++activation;
    selected = false;
    if (!value) {
      silence();
      return false;
    }
    if (!supported) return false;
    try {
      if (!context || context.state === 'closed') {
        context = new Context({ latencyHint: 'interactive' });
        master = context.createGain();
        master.gain.value = 0;
        master.connect(context.destination);
        rustleBuffer = null;
      }
      if (context.state !== 'running') await context.resume();
      // An OFF tap while resume() is pending must never switch sound back on.
      if (request !== activation || context.state !== 'running') return false;
      selected = true;
      return true;
    } catch {
      if (!context || !master) supported = false;
      if (request === activation) {
        selected = false;
        silence();
      }
      return false;
    }
  }

  const tone = (frequency, delay, duration, amplitude, endFrequency = frequency, type = 'sine') =>
    ({ frequency, delay, duration, amplitude, endFrequency, type });
  const air = (delay, duration, amplitude = .13, frequency = 750) =>
    ({ noise: true, delay, duration, amplitude, frequency });

  function recipe(name, detail) {
    switch (name) {
      case 'shake': return [
        air(0, .14, .17, 650), air(.1, .15, .14, 950), air(.22, .13, .1, 600),
        tone(190, .025, .08, .16, 155, 'triangle'), tone(245, .16, .08, .1, 195, 'triangle'),
      ];
      case 'drop': return [
        tone(205, 0, .2, .34, 90), tone(330, .035, .14, .1, 165, 'triangle'),
        tone(275, .17, .15, .22, 145), tone(360, .3, .11, .13, 220), air(0, .1, .1, 420),
      ];
      case 'open': return [
        tone(310, 0, .27, .19, 610), tone(465, .06, .22, .08, 800), air(.02, .22, .12, 900),
      ];
      case 'close': return [
        tone(580, 0, .22, .18, 290), tone(380, .08, .16, .09, 190), air(0, .18, .1, 650),
      ];
      case 'turn': return [tone(270, 0, .18, .12, 420), tone(405, .045, .15, .045, 560)];
      case 'seed': {
        const count = Number.isFinite(detail) ? Math.max(1, Math.min(5, Math.round(detail))) : 1;
        const frequency = [660, 740, 831, 932, 1047][count - 1];
        return [tone(frequency, 0, .24, .28), tone(frequency * 1.5, .012, .12, .065)];
      }
      case 'complete': return [
        ...[523, 659, 784, 1047].flatMap((frequency, index) => [
          tone(frequency, index * .13, .32, .23), tone(frequency * .5, index * .13, .22, .075, frequency * .5, 'triangle'),
        ]),
      ];
      case 'pick': return [tone(360, 0, .2, .22, 570), tone(720, .055, .18, .065, 850)];
      case 'puzzlePick': return [tone(300, 0, .12, .19, 380, 'triangle'), tone(600, .018, .1, .055, 670)];
      case 'puzzleFit':
      case 'puzzleMatch': return [tone(523, 0, .19, .21), tone(659, .07, .2, .18), tone(784, .14, .24, .15)];
      case 'puzzleMiss': return [tone(380, 0, .17, .12, 320), tone(480, .06, .14, .045, 405)];
      case 'puzzleComplete': return [
        ...[523, 784, 659, 1047].flatMap((frequency, index) => [
          tone(frequency, index * .14, .34, .23), tone(frequency * .5, index * .14, .25, .075, frequency * .5, 'triangle'),
        ]),
      ];
      default: return [];
    }
  }

  function makeRustleBuffer() {
    if (rustleBuffer) return rustleBuffer;
    const length = Math.ceil((context.sampleRate || 44100) * .5);
    rustleBuffer = context.createBuffer(1, length, context.sampleRate || 44100);
    const data = rustleBuffer.getChannelData(0);
    // A small original noise texture, generated locally and reused for leaf swishes.
    let seed = 8137;
    for (let index = 0; index < data.length; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[index] = (seed / 4294967296) * 2 - 1;
    }
    return rustleBuffer;
  }

  function schedule(spec) {
    const start = context.currentTime + spec.delay;
    const gain = context.createGain();
    const source = spec.noise ? context.createBufferSource() : context.createOscillator();
    const filter = spec.noise ? context.createBiquadFilter() : null;
    const voice = { source, gain, filter };
    voices.add(voice);
    source.onended = () => {
      voices.delete(voice);
      try { source.disconnect(); gain.disconnect(); filter?.disconnect(); } catch { /* Already disconnected. */ }
    };
    if (spec.noise) {
      source.buffer = makeRustleBuffer();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(spec.frequency, start);
      filter.Q.setValueAtTime(.65, start);
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.type = spec.type;
      source.frequency.setValueAtTime(spec.frequency, start);
      source.frequency.exponentialRampToValueAtTime(spec.endFrequency, start + spec.duration * .8);
      source.connect(gain);
    }
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.linearRampToValueAtTime(spec.amplitude, start + (spec.noise ? .025 : .012));
    gain.gain.exponentialRampToValueAtTime(.0001, start + spec.duration);
    gain.connect(master);
    source.start(start);
    source.stop(start + spec.duration + .025);
  }

  function play(name, detail) {
    if (!selected || !context || context.state !== 'running' || !Object.hasOwn(cooldowns, name)) return false;
    const now = context.currentTime;
    if (now - (lastPlayed.get(name) ?? -Infinity) < cooldowns[name]) return false;
    const notes = recipe(name, detail);
    if (voices.size + notes.length > maxVoices) {
      // A completed activity can replace older tails, so quick seed taps never swallow its reward.
      if (name !== 'complete' && name !== 'puzzleComplete') return false;
      const replace = voices.size + notes.length - maxVoices;
      for (const voice of [...voices].slice(0, replace)) { fadeVoice(voice, now); voices.delete(voice); }
    }
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(volume, now + .012);
      notes.forEach(schedule);
      lastPlayed.set(name, now);
      return true;
    } catch {
      silence();
      return false;
    }
  }

  return {
    get enabled() { return selected && context?.state === 'running'; },
    get available() { return supported; },
    setEnabled,
    play,
    stop: silence,
  };
}
