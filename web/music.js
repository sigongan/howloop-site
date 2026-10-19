// Original Howloop music. No recordings, familiar-song arrangements or network requests.
const freezeBars = rows => Object.freeze(rows.map(row => Object.freeze(row)));
const orchardBars = freezeBars([
  [0,-1,2,3,-1,2,1,-1], [2,-1,4,3,-1,1,0,-1],
  [1,-1,2,-1,3,2,0,-1], [2,1,0,-1,-1,1,2,-1],
  [3,-1,4,5,-1,4,2,-1], [4,3,2,-1,1,-1,2,-1],
  [1,-1,3,4,-1,3,1,-1], [2,1,0,-1,-1,-1,0,-1],
  [0,-1,2,3,-1,5,4,-1], [3,-1,2,1,-1,2,0,-1],
  [2,-1,3,4,-1,2,1,-1], [3,2,1,-1,0,-1,2,-1],
  [4,-1,5,4,3,-1,2,-1], [2,3,4,-1,2,-1,1,-1],
  [1,-1,2,3,2,1,0,-1], [2,-1,1,-1,0,-1,-1,-1],
]);
const puzzleBars = freezeBars([
  [2,3,-1,2,4,-1,3,-1], [1,2,-1,3,2,-1,0,-1],
  [3,4,-1,3,5,-1,4,-1], [2,-1,1,2,0,-1,-1,-1],
  [4,2,-1,3,5,-1,3,-1], [3,1,-1,2,4,-1,2,-1],
  [2,3,4,-1,3,2,1,-1], [0,-1,2,-1,1,-1,0,-1],
  [2,4,-1,3,5,-1,4,-1], [3,2,-1,1,2,-1,0,-1],
  [4,5,-1,4,3,-1,2,-1], [1,3,-1,2,0,-1,-1,-1],
  [3,4,5,-1,4,3,2,-1], [2,-1,4,3,1,-1,2,-1],
  [3,2,-1,1,2,1,0,-1], [2,-1,1,-1,0,-1,-1,-1],
]);
const bass = Object.freeze([48,45,43,48,45,43,50,43,48,45,43,48,45,43,50,48]);
export const PLAY_MUSIC = Object.freeze({
  orchard: Object.freeze({bpm:90, bars:orchardBars, bass}),
  puzzle: Object.freeze({bpm:100, bars:puzzleBars, bass}),
});
const melodyMidi = [60,62,64,67,69,72];
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

export function createPlayMusic(win = globalThis.window) {
  const Context = win?.AudioContext || win?.webkitAudioContext;
  const setTick = win?.setInterval?.bind(win) || globalThis.setInterval?.bind(globalThis);
  const clearTick = win?.clearInterval?.bind(win) || globalThis.clearInterval?.bind(globalThis);
  let supported = typeof Context === 'function' && typeof setTick === 'function' && typeof clearTick === 'function';
  let context = null, master = null, interval = null;
  let selected = false, destroyed = false, activation = 0;
  let mood = 'orchard', volume = .55, nextTime = 0, step = 0;
  const voices = new Set();
  const maxVoices = 12, lookahead = .28, maxGain = .08;

  function stopSequence() {
    if (interval !== null) { clearTick(interval); interval = null; }
    if (!context) return;
    const now = context.currentTime;
    if (master) {
      try {
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + .025);
      } catch { /* A closed audio session is already silent. */ }
    }
    for (const voice of voices) {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
        voice.gain.gain.linearRampToValueAtTime(0, now + .025);
        voice.source.stop(now + .03);
      } catch { /* A note may already have ended. */ }
    }
    voices.clear();
  }

  function pause() {
    ++activation;
    selected = false;
    stopSequence();
  }

  function applyVolume() {
    if (!context || !master || context.state !== 'running') return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(selected ? volume * maxGain : 0, now + .035);
  }

  function note(midi, time, duration, amplitude, type = 'sine') {
    if (voices.size >= maxVoices) return;
    const source = context.createOscillator(), gain = context.createGain();
    const voice = {source, gain};
    voices.add(voice);
    source.type = type;
    source.frequency.setValueAtTime(frequency(midi), time);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.linearRampToValueAtTime(amplitude, time + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(gain); gain.connect(master);
    source.onended = () => {
      voices.delete(voice);
      try { source.disconnect(); gain.disconnect(); } catch { /* Already disconnected. */ }
    };
    source.start(time); source.stop(time + duration + .02);
  }

  function tick() {
    if (!selected || destroyed || context?.state !== 'running') { pause(); return; }
    try {
      const score = PLAY_MUSIC[mood], eighth = 30 / score.bpm, now = context.currentTime;
      // A delayed tab resumes at the current beat instead of playing a backlog of notes.
      if (nextTime < now + .005) {
        const missed = Math.ceil((now + .025 - nextTime) / eighth);
        step = (step + missed) % (score.bars.length * 8);
        nextTime += missed * eighth;
      }
      let scheduled = 0;
      while (nextTime <= now + lookahead && scheduled < 3) {
        const bar = Math.floor(step / 8), beat = step % 8;
        const pitch = score.bars[bar][beat];
        if (pitch !== -1 && voices.size + 2 <= maxVoices) {
          // A rounded fundamental and a very quiet octave create a small wooden-key timbre.
          const midi = melodyMidi[pitch];
          note(midi, nextTime, mood === 'puzzle' ? .28 : .39, .21);
          note(midi + 12, nextTime, .15, .027, 'triangle');
        }
        if ((beat === 0 || beat === 4) && voices.size < maxVoices) {
          note(score.bass[bar] + (beat === 4 ? 7 : 0), nextTime, .48, .12);
        }
        step = (step + 1) % (score.bars.length * 8);
        nextTime += eighth;
        scheduled++;
      }
    } catch { pause(); }
  }

  function startSequence() {
    step = 0;
    nextTime = context.currentTime + .04;
    applyVolume();
    tick();
    if (selected && !destroyed) interval = setTick(tick, 100);
  }

  async function setEnabled(value) {
    if (!value) { pause(); return false; }
    if (destroyed || !supported) return false;
    if (selected && context?.state === 'running' && interval !== null) return true;
    const request = ++activation;
    selected = false;
    stopSequence();
    try {
      if (!context || context.state === 'closed') {
        context = new Context({latencyHint:'interactive'});
        master = context.createGain();
        master.gain.value = 0;
        master.connect(context.destination);
      }
      if (context.state !== 'running') await context.resume();
      if (destroyed || request !== activation || context.state !== 'running') return false;
      selected = true;
      startSequence();
      return selected;
    } catch {
      if (!context || !master) supported = false;
      if (request === activation) pause();
      return false;
    }
  }

  function setMood(value) {
    if (destroyed || !Object.hasOwn(PLAY_MUSIC, value)) return false;
    if (mood === value) return true;
    mood = value;
    if (selected && context?.state === 'running') {
      stopSequence();
      startSequence();
    }
    return true;
  }

  function setVolume(value) {
    if (destroyed || !Number.isFinite(value)) return false;
    volume = Math.max(0, Math.min(1, value));
    try { applyVolume(); } catch { pause(); }
    return volume;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    pause();
    try { master?.disconnect(); } catch { /* Already disconnected. */ }
    try { context?.close()?.catch?.(() => {}); } catch { /* Already closed. */ }
    context = null; master = null;
  }

  return {
    get available() { return supported && !destroyed; },
    get enabled() { return selected && !destroyed && context?.state === 'running'; },
    get playing() { return selected && !destroyed && interval !== null && context?.state === 'running'; },
    setEnabled, setMood, setVolume, pause, destroy,
  };
}
