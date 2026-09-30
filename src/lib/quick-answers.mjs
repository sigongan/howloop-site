/** Local matching only: never invent an answer or send a search to a service. */
export function normaliseQuestionSearch(value) {
  return String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en-AU').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function filterQuickAnswers(items, {query = '', topic = 'all'} = {}) {
  const terms = normaliseQuestionSearch(query).split(' ').filter(Boolean);
  return items.filter(item => {
    if (topic !== 'all' && item.topic !== topic) return false;
    const searchable = normaliseQuestionSearch(item.search ?? [item.question, item.answer, item.example, ...(item.keywords ?? [])].filter(Boolean).join(' '));
    return terms.every(term => searchable.includes(term));
  });
}
