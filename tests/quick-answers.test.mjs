import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseQuestionSearch, filterQuickAnswers} from '../src/lib/quick-answers.mjs';

const items = [
  {id: 'uniform', topic: 'tax', question: 'Can I claim work clothes?', answer: 'Ordinary clothes are different from a uniform.', keywords: ['uniform', 'laundry', 'dress code']},
  {id: 'offset', topic: 'home', question: 'What is an offset account?', answer: 'It reduces the balance used to calculate interest.', keywords: ['home loan', 'mortgage']},
  {id: 'super', topic: 'pay', question: 'Does my salary include super?', answer: 'Check the package.', keywords: ['superannuation', 'pay before tax']},
];

test('partial words, mixed case and all query terms select a relevant prepared answer', () => {
  assert.deepEqual(filterQuickAnswers(items, {query: ' UNI '}).map(i => i.id), ['uniform']);
  assert.deepEqual(filterQuickAnswers(items, {query: 'home OFF'}).map(i => i.id), ['offset']);
  assert.deepEqual(filterQuickAnswers(items, {query: 'super'}).map(i => i.id), ['super']);
  assert.deepEqual(filterQuickAnswers(items, {query: 'clothes mortgage'}), []);
});

test('category and query intersect, with an empty query showing only that category', () => {
  assert.deepEqual(filterQuickAnswers(items, {topic: 'tax'}).map(i => i.id), ['uniform']);
  assert.deepEqual(filterQuickAnswers(items, {topic: 'tax', query: 'offset'}), []);
  assert.equal(filterQuickAnswers(items).length, 3);
});

test('search normalises accents, punctuation and equivalent Unicode without changing input', () => {
  assert.equal(normaliseQuestionSearch('Café · TAKE-HOME'), 'cafe take home');
  assert.equal(normaliseQuestionSearch('ＳＵＰＥＲ'), 'super');
  assert.deepEqual(filterQuickAnswers(items, {query: 'dress-code'}).map(i => i.id), ['uniform']);
});

test('unsupported questions return no generated answer; matching does not mutate records', () => {
  const original = JSON.stringify(items);
  assert.deepEqual(filterQuickAnswers(items, {query: 'personal refund guaranteed'}), []);
  assert.equal(JSON.stringify(items), original);
});
