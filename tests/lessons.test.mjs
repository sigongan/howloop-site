import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {buildLessonPages, lessonActivities, lessonIds, renderLesson} from '../scripts/lessons.mjs';

const contentDir = path.resolve(import.meta.dirname, '../shared');

test('each real lesson URL contains its learning content without JavaScript', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'howloop-lessons-'));
  try {
    const urls = await buildLessonPages({contentDir, outputDir: temporary});
    assert.equal(new Set(urls).size, 5);
    for (const id of lessonIds) {
      const html = await readFile(path.join(temporary, 'learn', id, 'index.html'), 'utf8');
      const content = JSON.parse(await readFile(path.join(contentDir, `${id}.json`), 'utf8'));
      assert.ok(html.includes(`<link rel="canonical" href="https://howloop.how/learn/${id}/">`));
      assert.ok(html.includes(`href="/?fruit=${id}#playground"`));
      assert.ok(html.includes(lessonActivities[id].goal));
      for (const fact of content.languages.en.facts) assert.ok(html.includes(fact.text), `${id}: ${fact.title}`);
      assert.equal((html.match(/<h1>/g) || []).length, 1);
      assert.ok(!html.includes('<script'), 'lesson text needs no script execution');
      assert.ok(html.includes('English lesson'));
      assert.ok(html.includes('five findable seeds for counting'));
      for (const other of lessonIds.filter(other => other !== id)) assert.ok(html.includes(`href="/learn/${other}/"`));
      for (const [, url] of lessonActivities[id].sources) assert.ok(/^https:\/\/(?:ask\.ifas\.ufl\.edu|(?:[a-z.]+\.)?extension\.(?:umn\.edu|umd\.edu|iastate\.edu)|fruit\.umn\.edu)\//.test(url), url);
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      assert.ok(text.split(' ').length <= 500, `${id} stays concise: ${text.split(' ').length} words`);
    }
  } finally {
    await rm(temporary, {recursive: true, force: true});
  }
});

test('lesson activities teach different observations and safely escape content', async () => {
  const goals = lessonIds.map(id => lessonActivities[id].goal);
  assert.equal(new Set(goals).size, 5);
  assert.ok(lessonActivities.lemon.notice.includes('white pith'));
  assert.ok(lessonActivities.apple.notice.includes('core'));
  assert.ok(lessonActivities.watermelon.notice.includes('vine rather than'));
  assert.ok(lessonActivities.orange.notice.includes('juice-filled'));
  assert.ok(lessonActivities.pear.notice.includes('Asian'));
  const content = JSON.parse(await readFile(path.join(contentDir, 'lemon.json'), 'utf8'));
  content.languages.en.facts[0].text = '<img src=x onerror="run()"> & a peel';
  const html = renderLesson(content);
  assert.ok(html.includes('&lt;img src=x onerror=&quot;run()&quot;&gt; &amp; a peel'));
  assert.ok(!html.includes('<img src=x'));
  assert.throws(() => renderLesson({...content, id: '../other'}), /Unknown lesson/);
});
