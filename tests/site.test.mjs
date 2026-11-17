import test from 'node:test';
import assert from 'node:assert/strict';
import {countWords, parseFrontMatter, renderInline, renderMarkdown, slugify} from '../scripts/markdown.mjs';
import {loadArticles} from '../scripts/build.mjs';
import {categories} from '../site/site.config.mjs';

test('front matter parses scalars and lists', () => {
  const {data, body} = parseFrontMatter('---\ntitle: "Hello: world"\nsummary:\n  - one\n  - two\norder: 2\n---\nBody text\n');
  assert.equal(data.title, 'Hello: world');
  assert.deepEqual(data.summary, ['one', 'two']);
  assert.equal(data.order, '2');
  assert.equal(body, 'Body text\n');
});

test('inline markdown escapes HTML and renders emphasis, code and links', () => {
  assert.equal(renderInline('<b>'), '&lt;b&gt;');
  assert.equal(renderInline('**bold** and *italic*'), '<strong>bold</strong> and <em>italic</em>');
  assert.equal(renderInline('use `a*b*c` here'), 'use <code>a*b*c</code> here');
  assert.equal(renderInline('[site](/about/)'), '<a href="/about/">site</a>');
  assert.equal(renderInline('[ext](https://example.com)'), '<a href="https://example.com" rel="noopener">ext</a>');
  assert.equal(renderInline('chlorophyll *a* and *b*'), 'chlorophyll <em>a</em> and <em>b</em>');
});

test('block markdown renders headings, lists, tables and callouts', () => {
  const {html, headings} = renderMarkdown('## A heading\n\nPara one\ncontinues.\n\n- x\n- y\n\n1. first\n2. second\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n:::tip Title\nInside **tip**\n:::\n');
  assert.match(html, /<h2 id="a-heading">A heading<\/h2>/);
  assert.match(html, /<p>Para one continues\.<\/p>/);
  assert.match(html, /<ul><li>x<\/li><li>y<\/li><\/ul>/);
  assert.match(html, /<ol><li>first<\/li><li>second<\/li><\/ol>/);
  assert.match(html, /<th scope="col">A<\/th>/);
  assert.match(html, /<aside class="callout callout-tip"><p class="callout-title">Title<\/p><p>Inside <strong>tip<\/strong><\/p><\/aside>/);
  assert.deepEqual(headings, [{level: 2, text: 'A heading', id: 'a-heading'}]);
});

test('slugify and word count behave', () => {
  assert.equal(slugify('Fruit & Veg: Why?'), 'fruit-veg-why');
  assert.equal(countWords('<p>Two words</p><p>and 3 more</p>'), 5);
});

test('every article has complete front matter, sources and enough depth', async () => {
  const articles = await loadArticles();
  assert.ok(articles.length >= 15, 'at least 15 articles');
  const slugs = new Set();
  for (const article of articles) {
    assert.ok(!slugs.has(article.slug), `duplicate slug ${article.slug}`);
    slugs.add(article.slug);
    assert.ok(article.title.length >= 20, `${article.slug}: title`);
    assert.ok(article.description.length >= 80 && article.description.length <= 220, `${article.slug}: description length ${article.description.length}`);
    assert.match(article.published, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(article.summary.length >= 2, `${article.slug}: summary bullets`);
    assert.ok(article.sourcesHtml.includes('<li>'), `${article.slug}: sources`);
    assert.ok(article.words >= 900, `${article.slug}: ${article.words} words`);
  }
  for (const category of categories) {
    assert.ok(articles.filter(a => a.category === category.id).length >= 3, `topic ${category.id} has at least three articles`);
  }
});
