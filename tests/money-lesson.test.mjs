import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script = readFileSync(new URL('../src/scripts/money-lesson.js', import.meta.url), 'utf8');

function element(document, {hidden = false, text = ''} = {}) {
  const listeners = new Map();
  const classes = new Set();
  return {
    hidden, disabled: false, textContent: text, dataset: {}, attributes: {},
    classList: {
      contains(name) { return classes.has(name); },
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      },
    },
    addEventListener(type, listener) {
      listeners.set(type, [...(listeners.get(type) || []), listener]);
    },
    dispatch(type, event = {}) {
      for (const listener of listeners.get(type) || []) listener(event);
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() {
      document.activeElement = this;
      document.lesson?.dispatch('focusin', {target: this});
    },
    click() {
      if (this.hidden || this.disabled) return;
      this.focus();
      this.dispatch('click', {target: this});
    },
  };
}

function fixture({reducedMotion = false} = {}) {
  const timers = new Map();
  let nextTimerId = 1;
  const document = {
    activeElement: null, hidden: false, listeners: new Map(),
    addEventListener(type, listener) {
      this.listeners.set(type, [...(this.listeners.get(type) || []), listener]);
    },
    dispatch(type) {
      for (const listener of this.listeners.get(type) || []) listener();
    },
  };
  const motion = {
    matches: reducedMotion, listeners: [],
    addEventListener(type, listener) {
      assert.equal(type, 'change');
      this.listeners.push(listener);
    },
    set(matches) {
      this.matches = matches;
      for (const listener of this.listeners) listener();
    },
  };
  const nodes = Object.fromEntries(
    ['start', 'all', 'back', 'next', 'play', 'controls', 'progress', 'count', 'announcement', 'mode']
      .map(name => [name, element(document)]),
  );
  for (const name of ['all', 'controls', 'progress', 'mode']) nodes[name].hidden = true;
  const steps = [1, 2, 3].map(number => {
    const step = element(document);
    const heading = element(document, {text: `${number} Lesson point ${number}`});
    step.querySelector = selector => selector === 'h3' ? heading : null;
    return step;
  });
  const tracks = steps.map(() => element(document));
  const lesson = element(document);
  document.lesson = lesson;
  lesson.querySelectorAll = selector => ({
    '[data-lesson-step]': steps,
    '[data-lesson-track]': tracks,
  })[selector] || [];
  const selectorNodes = Object.fromEntries(
    Object.entries(nodes).map(([name, node]) => [`[data-lesson-${name}]`, node]),
  );
  selectorNodes.h2 = element(document, {text: 'How does interest grow?'});
  lesson.querySelector = selector => selectorNodes[selector] || null;
  document.querySelectorAll = selector => selector === '[data-money-lesson]' ? [lesson] : [];

  const window = {
    matchMedia(query) {
      assert.equal(query, '(prefers-reduced-motion: reduce)');
      return motion;
    },
    setTimeout(callback, delay) {
      assert.equal(delay, 10000);
      const id = nextTimerId++;
      timers.set(id, callback);
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
  };
  runInNewContext(script, {document, window}, {filename: 'money-lesson.js'});

  function advance() {
    const first = timers.entries().next().value;
    assert.ok(first, 'expected a pending lesson timer');
    const [id, callback] = first;
    timers.delete(id);
    callback();
  }
  return {
    document, motion, nodes, steps, tracks, lesson, advance,
    pending: () => timers.size,
    visible: () => steps.map(step => !step.hidden),
  };
}

test('all three steps remain visible on load without a timer or forced guided mode', () => {
  const f = fixture();
  assert.deepEqual(f.visible(), [true, true, true]);
  assert.equal(f.pending(), 0);
  assert.equal(f.lesson.dataset.guided, 'false');
  assert.equal(f.nodes.mode.hidden, false);
  assert.equal(f.nodes.controls.hidden, true);
  assert.equal(f.nodes.progress.hidden, true);
  assert.equal(f.nodes.start.textContent, 'Watch step by step');
});

test('Watch explicitly begins at step one; Pause stops the scheduled change', () => {
  const f = fixture();
  f.nodes.start.click();
  assert.deepEqual(f.visible(), [true, false, false]);
  assert.equal(f.nodes.count.textContent, 'Step 1 of 3');
  assert.equal(f.nodes.play.textContent, 'Pause');
  assert.equal(f.document.activeElement, f.nodes.play);
  assert.equal(f.pending(), 1);
  f.nodes.play.click();
  assert.equal(f.nodes.play.textContent, 'Play');
  assert.equal(f.pending(), 0);
  assert.deepEqual(f.visible(), [true, false, false]);
});

test('manual Next and Back pause playback and respect the first and last steps', () => {
  const f = fixture();
  f.nodes.start.click();
  assert.equal(f.nodes.back.disabled, true);
  f.nodes.next.click();
  assert.equal(f.pending(), 0);
  assert.equal(f.nodes.play.textContent, 'Play');
  assert.deepEqual(f.visible(), [false, true, false]);
  f.nodes.next.click();
  assert.deepEqual(f.visible(), [false, false, true]);
  assert.equal(f.nodes.next.disabled, true);
  assert.equal(f.nodes.play.textContent, 'Replay');
  f.nodes.back.click();
  f.nodes.back.click();
  assert.deepEqual(f.visible(), [true, false, false]);
  assert.equal(f.nodes.back.disabled, true);
});

test('Show all restores every step, cancels playback, and returns focus to Watch', () => {
  const f = fixture();
  f.nodes.start.click();
  f.advance();
  assert.deepEqual(f.visible(), [false, true, false]);
  assert.equal(f.pending(), 1);
  f.nodes.all.click();
  assert.deepEqual(f.visible(), [true, true, true]);
  assert.equal(f.pending(), 0);
  assert.equal(f.lesson.dataset.guided, 'false');
  assert.equal(f.nodes.controls.hidden, true);
  assert.equal(f.nodes.progress.hidden, true);
  assert.equal(f.nodes.all.hidden, true);
  assert.equal(f.nodes.start.hidden, false);
  assert.equal(f.document.activeElement, f.nodes.start);
  assert.match(f.nodes.announcement.textContent, /all three steps are visible/i);
});

test('reduced motion starts with manual steps and a preference change stops playback', () => {
  const manual = fixture({reducedMotion: true});
  assert.deepEqual(manual.visible(), [true, true, true]);
  assert.equal(manual.nodes.start.textContent, 'View one step at a time');
  assert.equal(manual.nodes.play.hidden, true);
  manual.nodes.start.click();
  assert.deepEqual(manual.visible(), [true, false, false]);
  assert.equal(manual.pending(), 0);
  assert.equal(manual.document.activeElement, manual.nodes.next);
  manual.nodes.next.click();
  assert.deepEqual(manual.visible(), [false, true, false]);

  const changed = fixture();
  changed.nodes.start.click();
  assert.equal(changed.pending(), 1);
  changed.motion.set(true);
  assert.equal(changed.pending(), 0);
  assert.equal(changed.nodes.play.hidden, true);
  assert.equal(changed.nodes.play.textContent, 'Play');
  assert.equal(changed.document.activeElement, changed.nodes.next);
});

test('backgrounding or moving focus away stops playback; ending offers Replay from step one', () => {
  const background = fixture();
  background.nodes.start.click();
  background.document.hidden = true;
  background.document.dispatch('visibilitychange');
  assert.equal(background.pending(), 0);
  assert.equal(background.nodes.play.textContent, 'Play');

  const focus = fixture();
  focus.nodes.start.click();
  focus.nodes.all.focus();
  assert.equal(focus.pending(), 0);

  const end = fixture();
  end.nodes.start.click();
  end.advance();
  assert.equal(end.pending(), 1);
  end.advance();
  assert.deepEqual(end.visible(), [false, false, true]);
  assert.equal(end.pending(), 0);
  assert.equal(end.nodes.play.textContent, 'Replay');
  end.nodes.play.click();
  assert.deepEqual(end.visible(), [true, false, false]);
  assert.equal(end.nodes.play.textContent, 'Pause');
  assert.equal(end.pending(), 1);
});
