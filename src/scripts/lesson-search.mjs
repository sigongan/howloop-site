export function normaliseLessonQuery(value) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** Progressive enhancement: the full linked library works without JavaScript. */
export function initLessonSearch(doc = document) {
  const controls = doc.querySelector('[data-lesson-controls]');
  const input = controls?.querySelector('input');
  const status = doc.querySelector('[data-lesson-status]');
  const empty = doc.querySelector('[data-lesson-empty]');
  if (!controls || !input || !status || !empty || controls.dataset.bound) return;
  const cards = [...doc.querySelectorAll('[data-lesson-search]')];
  const groups = [...doc.querySelectorAll('.lesson-group')];
  const update = () => {
    const words = normaliseLessonQuery(input.value).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const card of cards) {
      const content = normaliseLessonQuery(card.dataset.lessonSearch ?? '');
      card.hidden = !words.every(word => content.includes(word));
      if (!card.hidden) count++;
    }
    for (const group of groups) group.hidden = ![...group.querySelectorAll('[data-lesson-search]')].some(card => !card.hidden);
    empty.hidden = count > 0;
    status.textContent = `${count} ${count === 1 ? 'guide' : 'guides'}${words.length ? ' found' : ' to explore'}.`;
  };
  input.addEventListener('input', update);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { input.value = ''; update(); }
  });
  controls.dataset.bound = 'true';
  update();
  controls.hidden = false;
}

if (typeof document !== 'undefined') initLessonSearch();
