/**
 * Reproducible pre-publish checks for the generated website.
 * This is a technical regression gate, not a prediction of AdSense approval.
 * Run after "npm run build". It does not make external requests.
 */
import fs from 'node:fs/promises';
import './check-client-syntax.mjs';
import {isIndexableRoute} from '../src/lib/search-indexing.mjs';
import {reviewStatus, brisbaneDate} from '../src/lib/content-status.mjs';
import {bankFreshness} from '../src/lib/bank-freshness.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const origin = 'https://howloop.how';
const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);
const isTechnical = (route) => /^\/(desk|trade)(\/|$)/.test(route);
const normalise = (route) => route === '/' ? route : route.replace(/\/$/, '');
const read = (file) => fs.readFile(file, 'utf8');
const decode = value => value.replace(/&(?:amp|quot|apos|lt|gt|#(?:x[\da-f]+|\d+));/gi, entity => {
  const key = entity.slice(1, -1).toLowerCase();
  const named = {amp:'&', quot:'"', apos:"'", lt:'<', gt:'>'};
  if (key in named) return named[key];
  const point = key.startsWith('#x') ? parseInt(key.slice(2), 16) : Number(key.slice(1));
  return Number.isInteger(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
});
const attributes = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => [m[1].toLowerCase(), decode(m[2] ?? m[3])]));
const tags = (html, name) => [...html.matchAll(new RegExp('<' + name + '\\b[^>]*>', 'gi'))].map((m) => attributes(m[0]));
const meta = (html, name) => tags(html, 'meta').find((item) => item.name === name || item.property === name)?.content;
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name)) : path.join(directory, entry.name)));
  return nested.flat();
}
async function exists(file) {
  try { return (await fs.stat(file)).isFile(); } catch { return false; }
}
async function resolves(route) {
  const decoded = decodeURIComponent(route);
  const candidate = path.resolve(dist, '.' + decoded);
  if (candidate !== dist && !candidate.startsWith(dist + path.sep)) return false;
  return await exists(candidate) || await exists(path.join(candidate, 'index.html')) || await exists(candidate + '.html');
}
let files;
try { files = await walk(dist); } catch {
  console.error('Build output is missing. Run npm run build first.');
  process.exit(1);
}
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const pages = new Map();
for (const file of htmlFiles) {
  const relative = path.relative(dist, file).replaceAll(path.sep, '/');
  const route = normalise('/' + relative.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, ''));
  const html = await read(file);
  const targets = new Set([...html.matchAll(/<[a-z][^>]*>/gi)].flatMap(match => {
    const attrs = attributes(match[0]);
    return [attrs.id, attrs.name].filter(Boolean);
  }));
  pages.set(route, { file, html, targets });
}
const titles = new Map();
const descriptions = new Map();
const canonicalURLs = new Set();
let indexablePages = 0;
for (const [route, { html }] of pages) {
  if (isTechnical(route)) continue;
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = meta(html, 'description')?.trim();
  const canonical = tags(html, 'link').filter((item) => item.rel === 'canonical');
  const noindex = /\bnoindex\b/i.test(meta(html, 'robots') ?? '');
  const excluded = !isIndexableRoute(route);
  if (!title) fail(route + ': missing title');
  if (!description) fail(route + ': missing description');
  if (canonical.length !== 1) fail(route + ': needs one canonical');
  const expected = origin + (route === '/' ? '/' : route + '/');
  if (canonical[0]?.href !== expected) fail(route + ': canonical differs from ' + expected);
  if (!noindex && excluded) fail(route + ': archive/error/unfinished page must have its declared noindex');
  if (noindex && !excluded) fail(route + ': maintained public page is accidentally noindex');
  if ((html.match(/<h1\b/gi) ?? []).length !== 1) fail(route + ': needs exactly one main heading');
  if (!tags(html, 'main').some((item) => item.id === 'main')) fail(route + ': missing main landmark/skip target');
  if (meta(html, 'og:url') !== canonical[0]?.href) fail(route + ': Open Graph URL differs from canonical');
  if (!meta(html, 'og:image')) fail(route + ': missing share image');
  if (!noindex) {
    indexablePages++;
    canonicalURLs.add(canonical[0]?.href);
    if (titles.has(title)) fail(route + ': same title as ' + titles.get(title));
    if (descriptions.has(description)) fail(route + ': same description as ' + descriptions.get(description));
    titles.set(title, route); descriptions.set(description, route);
  }
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (attributes(match[1]).type !== 'application/ld+json') continue;
    try { JSON.parse(match[2]); } catch { fail(route + ': invalid JSON-LD'); }
  }
  for (const link of [...tags(html, 'a'), ...tags(html, 'link'), ...tags(html, 'script'), ...tags(html, 'img')]) {
    const href = link.href ?? link.src;
    if (href === '' || href === '#') fail(route + ': empty link target');
    if (!href) continue;
    if (/^(?:javascript|vbscript):/i.test(href)) fail(route + ': unsafe URL scheme');
    let url;
    try { url = new URL(href, expected); } catch { fail(route + ': invalid URL ' + href); continue; }
    if (url.origin !== origin) continue;
    if (!await resolves(url.pathname)) fail(route + ': broken internal link ' + href);
    if (url.hash && pages.has(normalise(url.pathname))) {
      let fragment;
      try { fragment = decodeURIComponent(url.hash.slice(1)); } catch { fail(route + ': malformed link fragment ' + href); continue; }
      if (!pages.get(normalise(url.pathname)).targets.has(fragment)) fail(route + ': missing internal fragment ' + href);
    }
    if (url.pathname !== '/' && pages.has(normalise(url.pathname)) && !url.pathname.endsWith('/')) fail(route + ': internal page link needs canonical trailing slash: ' + href);
  }
  if (/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle/i.test(html)) {
    fail(route + ': ads are enabled before the separate consent/publishing decision');
  }
  if (tags(html, 'script').some(script => /googletagmanager\.com\/gtag\/js/i.test(script.src ?? ''))) {
    fail(route + ': analytics library must not load before the visitor opts in');
  }
  if (!html.includes('data-analytics-consent')) fail(route + ': missing analytics privacy controls');
}
const comparisonHTML=pages.get('/compare/savings')?.html ?? '';
for (const route of ['/help','/tax-return','/calculators/compound-interest','/calculators/mortgage','/calculators/salary','/calculators/lvr','/compare/savings']) {
  const html = pages.get(route)?.html ?? '';
  if (!html.includes('data-quick-question') || !html.includes('quick-answers__answer')) fail(route + ': prepared help must be present in static HTML');
  if (!html.includes('data-quick-controls hidden')) fail(route + ': search controls must remain hidden until local search is ready');
}
if (!comparisonHTML.includes('data-comparison-static-note')) fail('Savings comparison: missing dated HTML fallback');
if (!comparisonHTML.includes('Conditions, eligibility &amp; fees') && !comparisonHTML.includes('Conditions, eligibility & fees') && !comparisonHTML.includes('No fresh, supported accounts were available')) fail('Savings comparison: missing static account terms or honest unavailable state');
const robots = await read(path.join(dist, 'robots.txt'));
if ((robots.match(/^User-agent:\s*\*\s*$/gmi) ?? []).length !== 1) fail('robots.txt: duplicate or missing wildcard group');
if (/^Disallow:\s*\//gmi.test(robots)) fail('robots.txt: crawl restriction prevents a full readiness review');
if (!robots.includes('Sitemap: ' + origin + '/sitemap-index.xml')) fail('robots.txt: incorrect sitemap declaration');
const sitemapURLs = [];
for (const file of files.filter((f) => /sitemap-\d+\.xml$/.test(f))) sitemapURLs.push(...locs(await read(file)));
if (!sitemapURLs.length) fail('Sitemap contains no public pages');
for (const url of sitemapURLs) {
  if (!canonicalURLs.has(url)) fail('Sitemap includes a noncanonical or excluded URL: ' + url);
}
for (const url of canonicalURLs) if (!sitemapURLs.includes(url)) fail('Indexable page missing from sitemap: ' + url);
if (new Set(sitemapURLs).size !== sitemapURLs.length) fail('Sitemap contains duplicate URLs');
const rss = await read(path.join(dist, 'rss.xml'));
const guides = JSON.parse(await read(path.join(root, 'src/data/learning.json')));
const reviewDate = brisbaneDate();
const editorialReviewsDue = guides.flatMap(guide => {
  const status = reviewStatus(guide.sourcesChecked, guide.reviewDays, reviewDate);
  return status.needsReview ? [{route: '/learn/' + guide.slug + '/', checked: guide.sourcesChecked, due: status.due}] : [];
});
const policies = JSON.parse(await read(path.join(root, 'src/data/policy-updates.json')));
const policyReviewsDue = policies.flatMap(policy => {
  const status = reviewStatus(policy.checkedAt, policy.reviewDays, reviewDate);
  return status.needsReview ? [{id: policy.id, checked: policy.checkedAt, due: status.due}] : [];
});
if (editorialReviewsDue.length || policyReviewsDue.length) warnings.push('Source reviews are due. Revalidate the cited sources; do not renew dates merely because a build passed.');
const rssItems = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
if (rssItems.length !== guides.length) fail('RSS does not contain every maintained money guide');
for (const guide of guides) {
  const target = origin + '/learn/' + guide.slug + '/';
  if (!rssItems.some((item) => item.includes('<link>' + target + '</link>'))) fail('RSS is missing ' + guide.slug);
}
if (/<link>[^<]*\/guides\//.test(rss)) fail('RSS still publishes archived household content');
const headers = await read(path.join(dist, '_headers'));
if (!/\/data\/\*\s+X-Robots-Tag:\s*noindex/.test(headers)) fail('Raw bank snapshots need their noindex response header');
for (const name of ['desk', 'trade']) {
  if (!headers.includes('/' + name + '\n') && !headers.includes('/' + name + '\r\n')) fail('Missing technical-page response header for /' + name);
}
const manifest = JSON.parse(await read(path.join(dist, 'data/banks.json')));
const ids = new Set();
let productCount = 0;
const bankSnapshotsNotUsable = [];
for (const bank of manifest.banks) {
  if (!/^[A-Za-z0-9-]+$/.test(bank.id) || ids.has(bank.id)) fail('Invalid or repeated bank ID: ' + bank.id);
  ids.add(bank.id);
  let snapshot;
  try { snapshot = JSON.parse(await read(path.join(dist, 'data/banks', bank.id + '.json'))); } catch { fail('Missing bank snapshot: ' + bank.id); continue; }
  if (snapshot.name !== bank.name || snapshot.products.length !== bank.productCount) fail('Bank snapshot/manifest mismatch: ' + bank.name);
  const neverRetrieved = snapshot.checkedAt === null && snapshot.status === 'unavailable' && snapshot.products.length === 0;
  if (!neverRetrieved && !Number.isFinite(Date.parse(snapshot.checkedAt))) fail('Bank has an invalid checked date: ' + bank.name);
  if (snapshot.status !== bank.status || snapshot.checkedAt !== bank.checkedAt) fail('Bank status/date mismatch: ' + bank.name);
  const freshness = bankFreshness(snapshot);
  if (!freshness.usable) bankSnapshotsNotUsable.push({id: bank.id, name: bank.name, checkedAt: snapshot.checkedAt, status: snapshot.status, note: freshness.note});
  for (const product of snapshot.products) {
    productCount++;
    if (!product.source?.startsWith('https://')) fail('Product source must use HTTPS: ' + bank.name);
    for (const rate of product.depositRates ?? []) if (rate.rate == null || String(rate.rate).trim() === '' || !Number.isFinite(Number(rate.rate))) fail('Non-finite bank rate: ' + bank.name);
  }
}
if (bankSnapshotsNotUsable.length) warnings.push('Some bank snapshots are unavailable for automatic calculations. The latest overall refresh does not make every bank current.');
warnings.push('This automated result does not assess editorial quality, ownership verification, email delivery, consent compliance or Google approval.');
console.log(JSON.stringify({ technicalGatePassed: failures.length === 0, reviewDate, htmlPages: htmlFiles.length, indexablePages, sitemapURLs: sitemapURLs.length, moneyGuides: guides.length, bankSnapshots: ids.size, products: productCount, editorialReviewsDue, policyReviewsDue, bankSnapshotsNotUsable, failures, warnings }, null, 2));
process.exitCode = failures.length ? 1 : 0;

