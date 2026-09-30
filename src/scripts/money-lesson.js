// Progressive enhancement only: every explanation and diagram is in the HTML.
for (const lesson of document.querySelectorAll('[data-money-lesson]')) {
  if (lesson.dataset.enhanced === 'true') continue;
  const steps = [...lesson.querySelectorAll('[data-lesson-step]')];
  const back = lesson.querySelector('[data-lesson-back]');
  const next = lesson.querySelector('[data-lesson-next]');
  const play = lesson.querySelector('[data-lesson-play]');
  if (steps.length !== 3 || !back || !next || !play) continue;
  const count = lesson.querySelector('[data-lesson-count]');
  const announcement = lesson.querySelector('[data-lesson-announcement]');
  const motionNote = lesson.querySelector('[data-lesson-motion-note]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const title = lesson.querySelector('h2').textContent;
  let current = 0;
  let timer = null;
  let playing = false;

  function updatePlay() {
    play.textContent = playing ? 'Pause' : current === steps.length - 1 ? 'Replay' : 'Play';
    play.setAttribute('aria-label', `${playing ? 'Pause' : current === steps.length - 1 ? 'Replay' : 'Play'} the lesson: ${title}`);
  }
  function stop() {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    playing = false;
    updatePlay();
  }
  function show(index, announce = true) {
    current = Math.max(0, Math.min(steps.length - 1, index));
    steps.forEach((step, position) => {
      step.hidden = position !== current;
      step.classList.toggle('is-current', position === current);
    });
    lesson.querySelectorAll('[data-lesson-track]').forEach((track, index) => track.classList.toggle('is-current', index === current));
    count.textContent = `Step ${current + 1} of ${steps.length}`;
    back.disabled = current === 0;
    next.disabled = current === steps.length - 1;
    updatePlay();
    if (announce) announcement.textContent = `${count.textContent}. ${steps[current].querySelector('h3').textContent.replace(/^\s*\d+\.\s*/, '')}`;
  }
  function schedule() {
    timer = window.setTimeout(() => {
      timer = null;
      if (!playing) return;
      if (motion.matches || document.hidden) { stop(); return; }
      show(current + 1);
      if (current === steps.length - 1) stop();
      else schedule();
    }, 6500);
  }
  function changeStep(direction) {
    stop();
    show(current + direction);
  }
  back.addEventListener('click', () => changeStep(-1));
  next.addEventListener('click', () => changeStep(1));
  play.addEventListener('click', () => {
    if (playing) {
      stop();
      announcement.textContent = `Paused. ${count.textContent}.`;
      return;
    }
    if (motion.matches) return;
    if (current === steps.length - 1) show(0);
    playing = true;
    updatePlay();
    announcement.textContent = `Playing. ${count.textContent}. Use Pause to stop.`;
    schedule();
  });
  // Pause when a reader leaves the page or moves keyboard focus to another control.
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  lesson.addEventListener('focusin', event => { if (playing && event.target !== play) stop(); });
  function applyMotionPreference() {
    if (motion.matches) stop();
    if (motion.matches && document.activeElement === play) (current === steps.length - 1 ? back : next).focus();
    play.hidden = motion.matches;
    motionNote.hidden = !motion.matches;
  }
  motion.addEventListener('change', applyMotionPreference);
  lesson.dataset.enhanced = 'true';
  lesson.querySelector('[data-lesson-controls]').hidden = false;
  lesson.querySelector('[data-lesson-progress]').hidden = false;
  applyMotionPreference();
  show(0, false);
}
