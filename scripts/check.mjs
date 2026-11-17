// Pre-review readiness check for the built site in dist/.
// Fails loudly on anything that commonly gets an AdSense site review rejected:
// missing publisher code, thin or placeholder pages, broken internal links, missing policy pages.
import {readFile, readdir, stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {site, categories} from '../site/site.config.mjs';
import {countWords} from './markdown.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const MIN_ARTICLE_WORDS = 900;

async function list(dir) {
  const entries = await readdir(dir, {withFileTypes: true});
  return (await Promise.all(entries.map(e => e.isDirectory() ? list(path.join(dir, e.name)) : path.join(dir, e.name)))).flat();
}
async function exists(file) {
  try { await stat(file); return true; } catch { return false; }
}
function resolveLink(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;
  if (clean.endsWith('/')) return path.join(dist, clean, 'index.html');
  return path.join(dist, clean);
}

const files = await list(dist);
const htmlFiles = files.filter(f => f.endsWith('.html'));
const problems = [];
const pub = site.adsensePublisher;

// Required pages for trust and policy.
for (const page of ['/', '/about/', '/contact/', '/privacy/', '/terms/', '/editorial-policy/', '/articles/']) {
  if (!(await exists(resolveLink(page)))) problems.push(`Missing required page ${page}`);
}
for (const c of categories) {
  if (!(await exists(resolveLink(`/topics/${c.id}/`)))) problems.push(`Missing topic page ${c.id}`);
}

// ads.txt must match the publisher ID.
const adsTxt = (await readFile(path.join(dist, 'ads.txt'), 'utf8')).trim();
if (adsTxt !== `google.com, ${pub.replace('ca-', '')}, DIRECT, f08c47fec0942fa0`) problems.push('ads.txt does not match the publisher ID');

// Privacy policy must carry Google's required advertising disclosures.
const privacy = await readFile(resolveLink('/privacy/'), 'utf8');
for (const needle of ['use cookies to serve ads based on your prior visits', 'adssettings.google.com', 'policies.google.com/technologies/partner-sites']) {
  if (!privacy.includes(needle)) problems.push(`Privacy policy is missing AdSense disclosure: ${needle}`);
}

const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8');
let articleCount = 0;
let totalWords = 0;

for (const file of htmlFiles) {
  const rel = '/' + path.relative(dist, file).replace(/index\.html$/, '');
  const html = await readFile(file, 'utf8');
  const head = html.split('</head>')[0];
  const isNotFound = rel === '/404.html';

  if (!head.includes(`<meta name="google-adsense-account" content="${pub}">`)) problems.push(`${rel}: missing google-adsense-account meta`);
  if (!head.includes(`adsbygoogle.js?client=${pub}`)) problems.push(`${rel}: missing AdSense script`);
  if (!/<title>[^<]{10,}<\/title>/.test(head)) problems.push(`${rel}: missing or very short <title>`);
  const description = head.match(/<meta name="description" content="([^"]*)">/);
  if (!description || description[1].length < 50) problems.push(`${rel}: missing or short meta description`);
  if (!isNotFound && !head.includes(`<link rel="canonical" href="${site.url}${rel}">`)) problems.push(`${rel}: canonical URL mismatch`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) problems.push(`${rel}: expected exactly one <h1>`);
  if (/\b(TODO|TBD|lorem ipsum|coming soon|under construction)\b/i.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) problems.push(`${rel}: placeholder text found`);
  if (/playground|grown-ups|fruit-puzzle/i.test(html)) problems.push(`${rel}: links to the retired playground`);
  const visibleText = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  if (/\*\*|\]\(|(^|\s)\*\S/.test(visibleText)) problems.push(`${rel}: unrendered Markdown in page text`);
  if (!isNotFound && !sitemap.includes(`<loc>${site.url}${rel}</loc>`)) problems.push(`${rel}: not listed in sitemap.xml`);

  // Internal links must resolve to a built file.
  for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
    const target = resolveLink(href);
    if (target && !(await exists(target))) problems.push(`${rel}: broken internal link ${href}`);
  }

  // Article quality floor.
  if (html.includes('"@type":"Article"')) {
    articleCount++;
    const prose = html.match(/<div class="prose">([\s\S]*?)<\/div>\s*(?:<section class="sources"|<section class="author-box")/);
    const words = prose ? countWords(prose[1]) : 0;
    totalWords += words;
    if (words < MIN_ARTICLE_WORDS) problems.push(`${rel}: only ${words} words of body text (minimum ${MIN_ARTICLE_WORDS})`);
    if (!html.includes('class="sources"')) problems.push(`${rel}: article has no sources section`);
  }
}

if (articleCount < 15) problems.push(`Only ${articleCount} articles; aim for at least 15 substantial articles before requesting review`);

if (problems.length) {
  console.error(`Readiness check failed with ${problems.length} problem(s):\n- ` + problems.join('\n- '));
  process.exit(1);
}
assert.ok(articleCount > 0);
console.log(JSON.stringify({passed: true, pages: htmlFiles.length, articles: articleCount, articleWords: totalWords, averageWords: Math.round(totalWords / articleCount)}));
