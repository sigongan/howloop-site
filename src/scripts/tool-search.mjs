/** Match words in any order; normalisation keeps everyday searches forgiving. */
export function normaliseToolQuery(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function initToolSearch(root) {
  const controls = root.querySelector('[data-tool-controls]');
  const input = root.querySelector('[data-tool-query]');
  if (!controls || !input || controls.dataset.enhanced) return;

  const cards = [...root.querySelectorAll('[data-tool-search]')];
  const groups = [...root.querySelectorAll('[data-tool-group]')];
  const topics = root.querySelector('[data-tool-topics]');
  const status = root.querySelector('[data-tool-status]');
  const empty = root.querySelector('[data-tool-empty]');
  const clear = root.querySelector('[data-tool-clear]');
  const reset = root.querySelector('[data-tool-reset]');
  const searchable = new Map(cards.map(card => [card, normaliseToolQuery(card.dataset.toolSearch)]));

  function update() {
    const query = normaliseToolQuery(input.value);
    const terms = query.split(' ').filter(Boolean);
    let count = 0;
    for (const card of cards) {
      const matches = terms.every(term => searchable.get(card).includes(term));
      card.hidden = !matches;
      if (matches) count += 1;
    }
    for (const group of groups) {
      group.hidden = ![...group.querySelectorAll('[data-tool-search]')].some(card => !card.hidden);
    }
    if (topics) topics.hidden = Boolean(query);
    if (empty) empty.hidden = count > 0;
    if (clear) clear.hidden = input.value.length === 0;
    if (status) status.textContent = query
      ? `${count} ${count === 1 ? 'tool' : 'tools'} found.`
      : `${cards.length} free tools. No account needed.`;
  }

  function clearSearch() {
    input.value = '';
    update();
    input.focus();
  }

  input.addEventListener('input', update);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      clearSearch();
    }
  });
  controls.addEventListener('submit', event => event.preventDefault());
  clear?.addEventListener('click', clearSearch);
  reset?.addEventListener('click', clearSearch);
  controls.dataset.enhanced = 'true';
  controls.hidden = false;
  update();
}
