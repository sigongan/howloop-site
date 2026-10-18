// Original, quiet playground cues. Audio is created only by the sound toggle.
export function createPlaySounds(win = globalThis.window) {
  const Context = win?.AudioContext || win?.webkitAudioContext;
  let context = null;
  let master = null;
  let selected = false;
  let supported = typeof Context === 'function';
  let activation = 0;
  const voices = new Set();
  const lastPlayed = new Map();
  const volume = .13;
  const cooldowns = { shake: .18, drop: .1, open: .35, seed: .09, complete: 1, pick: .15 };

  function silence() {
    if (!context || !master) return;
    const now = context.currentTime;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + .018);
    } catch { /* An interrupted or closed audio session is already silent. */ }
    for (const voice of voices) {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
        voice.gain.gain.linearRampToValueAtTime(0, now + .018);
        voice.oscillator.stop(now + .02);
      } catch { /* A note may have finished between the event and this loop. */ }
    }
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

  function note(frequency, delay, duration, amplitude = .35, endFrequency = frequency, type = 'sine') {
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const voice = { oscillator, gain };
    voices.add(voice);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration * .8);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.linearRampToValueAtTime(amplitude, start + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.onended = () => {
      voices.delete(voice);
      try { oscillator.disconnect(); gain.disconnect(); } catch { /* Already disconnected. */ }
    };
    oscillator.start(start);
    oscillator.stop(start + duration + .025);
  }

  function play(name, detail) {
    if (!selected || !context || context.state !== 'running' || !Object.hasOwn(cooldowns, name)) return false;
    const now = context.currentTime;
    if (now - (lastPlayed.get(name) ?? -Infinity) < cooldowns[name]) return false;
    const needed = name === 'complete' ? 4 : name === 'drop' || name === 'shake' ? 3 : 1;
    if (voices.size + needed > 12) return false;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(volume, now + .012);
      switch (name) {
        case 'shake':
          note(185, 0, .13, .24, 150, 'triangle');
          note(240, .045, .12, .18, 195, 'triangle');
          note(310, .085, .11, .12, 250, 'triangle');
          break;
        case 'drop':
          note(230, 0, .16, .38, 115);
          note(280, .13, .12, .24, 160);
          note(340, .25, .1, .14, 210);
          break;
        case 'open': note(360, 0, .3, .22, 600); break;
        case 'seed': {
          const count = Number.isFinite(detail) ? Math.max(1, Math.min(5, Math.round(detail))) : 1;
          note([660, 740, 880, 990, 1175][count - 1], 0, .19, .3);
          break;
        }
        case 'complete':
          [523, 659, 784, 1047].forEach((frequency, index) => note(frequency, index * .115, .25, .28));
          break;
        case 'pick': note(440, 0, .18, .25, 570); break;
      }
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
