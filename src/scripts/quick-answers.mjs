import {filterQuickAnswers} from '../lib/quick-answers.mjs';

function initialiseQuickAnswers(root) {
  if (root.dataset.quickReady === 'true') return;
  const input = root.querySelector('[data-quick-search]');
  const form = root.querySelector('[data-quick-search-form]');
  const controls = root.querySelector('[data-quick-controls]');
  const count = root.querySelector('[data-quick-count]');
  const empty = root.querySelector('[data-quick-empty]');
  const reset = root.querySelector('[data-quick-reset]');
  const buttons = [...root.querySelectorAll('[data-quick-topic]')];
  const items = [...root.querySelectorAll('[data-quick-question]')].map(element => ({
    id: element.dataset.id, topic: element.dataset.topic,
    search: element.dataset.search ?? element.textContent, element,
  }));
  if (!input || !form || !controls || !count || !empty || !reset) return;
  let topic = 'all';
  function refresh() {
    const visible = new Set(filterQuickAnswers(items, {query: input.value, topic}).map(item => item.id));
    for (const item of items) {
      item.element.hidden = !visible.has(item.id);
      if (item.element.hidden) item.element.open = false;
    }
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.quickTopic === topic));
    count.textContent = visible.size === 1 ? '1 question found' : `${visible.size} questions found`;
    empty.hidden = visible.size !== 0;
    reset.disabled = !input.value && topic === 'all';
  }
  input.addEventListener('input', refresh);
  input.addEventListener('search', refresh);
  form.addEventListener('submit', event => {event.preventDefault(); refresh();});
  for (const button of buttons) button.addEventListener('click', () => {topic = button.dataset.quickTopic; refresh();});
  reset.addEventListener('click', () => {input.value = ''; topic = 'all'; refresh(); input.focus();});
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape' && input.value) {event.preventDefault(); event.stopPropagation(); input.value = ''; refresh();}
  });
  function openLinkedQuestion() {
    let target;
    try {target = decodeURIComponent(window.location.hash.slice(1));} catch {return;}
    const linked = items.find(item => item.element.id === target);
    if (linked) {input.value = ''; topic = 'all'; refresh(); linked.element.open = true;}
  }
  root.dataset.quickReady = 'true';
  controls.hidden = false;
  refresh();
  openLinkedQuestion();
  window.addEventListener('hashchange', openLinkedQuestion);
}

document.querySelectorAll('[data-quick-answers]').forEach(initialiseQuickAnswers);
