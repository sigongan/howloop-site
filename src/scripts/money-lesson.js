// All three illustrated steps stay visible until a reader chooses guided mode.
for (const lesson of document.querySelectorAll('[data-money-lesson]')) {
  if (lesson.dataset.enhanced === 'true') continue;
  const steps = [...lesson.querySelectorAll('[data-lesson-step]')];
  const start = lesson.querySelector('[data-lesson-start]');
  const all = lesson.querySelector('[data-lesson-all]');
  const back = lesson.querySelector('[data-lesson-back]');
  const next = lesson.querySelector('[data-lesson-next]');
  const play = lesson.querySelector('[data-lesson-play]');
  const controls = lesson.querySelector('[data-lesson-controls]');
  const progress = lesson.querySelector('[data-lesson-progress]');
  const count = lesson.querySelector('[data-lesson-count]');
  const announcement = lesson.querySelector('[data-lesson-announcement]');
  if (steps.length !== 3 || !start || !all || !back || !next || !play || !controls || !progress || !count || !announcement) continue;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const title = lesson.querySelector('h2').textContent;
  let current = 0;
  let timer = null;
  let playing = false;
  let guided = false;

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
      step.hidden = guided && position !== current;
      step.classList.toggle('is-current', guided && position === current);
    });
    lesson.querySelectorAll('[data-lesson-track]').forEach((track, index) => track.classList.toggle('is-current', index === current));
    count.textContent = `Step ${current + 1} of ${steps.length}`;
    back.disabled = current === 0;
    next.disabled = current === steps.length - 1;
    updatePlay();
    if (announce) announcement.textContent = `${count.textContent}. ${steps[current].querySelector('h3').textContent.replace(/^\s*\d+\s*/, '')}`;
  }
  function schedule() {
    timer = window.setTimeout(() => {
      timer = null;
      if (!playing) return;
      if (motion.matches || document.hidden) { stop(); return; }
      show(current + 1);
      if (current === steps.length - 1) stop();
      else schedule();
    }, 10000);
  }
  function playFromCurrent() {
    if (motion.matches || !guided) return;
    if (current === steps.length - 1) show(0);
    playing = true;
    updatePlay();
    announcement.textContent = `Playing. ${count.textContent}. Use Pause to stop.`;
    schedule();
  }
  function changeStep(direction) {
    stop();
    show(current + direction);
  }
  start.addEventListener('click', () => {
    guided = true;
    lesson.dataset.guided = 'true';
    start.hidden = true;
    all.hidden = false;
    controls.hidden = false;
    progress.hidden = false;
    show(0);
    // Put focus on Pause before starting so focus changes do not stop playback.
    if (motion.matches) next.focus();
    else { play.focus(); playFromCurrent(); }
  });
  all.addEventListener('click', () => {
    stop();
    guided = false;
    lesson.dataset.guided = 'false';
    start.hidden = false;
    all.hidden = true;
    controls.hidden = true;
    progress.hidden = true;
    show(0, false);
    start.focus();
    announcement.textContent = 'All three steps are visible. Read at your own pace.';
  });
  back.addEventListener('click', () => changeStep(-1));
  next.addEventListener('click', () => changeStep(1));
  play.addEventListener('click', () => {
    if (playing) {
      stop();
      announcement.textContent = `Paused. ${count.textContent}.`;
    } else playFromCurrent();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  lesson.addEventListener('focusin', event => { if (playing && event.target !== play) stop(); });
  function applyMotionPreference() {
    if (motion.matches) stop();
    if (motion.matches && document.activeElement === play) (current === steps.length - 1 ? back : next).focus();
    play.hidden = motion.matches;
    start.textContent = motion.matches ? 'View one step at a time' : 'Watch step by step';
    start.setAttribute('aria-label', `${motion.matches ? 'View' : 'Watch'} the lesson: ${title}`);
  }
  motion.addEventListener('change', applyMotionPreference);
  lesson.dataset.enhanced = 'true';
  lesson.dataset.guided = 'false';
  lesson.querySelector('[data-lesson-mode]').hidden = false;
  applyMotionPreference();
  show(0, false);
}
