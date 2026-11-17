// Builds howloop.how into dist/ — a static, text-first article site. No npm dependencies.
import {cp, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {categories, site} from '../site/site.config.mjs';
import {countWords, escapeHtml, parseFrontMatter, renderInline, renderMarkdown, smartQuotes} from './markdown.mjs';

const root = path.resolve(import.meta.dirname, '..');
const contentDir = path.join(root, 'site/content');
const staticDir = path.join(root, 'site/static');
const dist = path.join(root, 'dist');

// ---------- load content ----------

export async function loadArticles() {
  const dir = path.join(contentDir, 'articles');
  const files = (await readdir(dir)).filter(f => f.endsWith('.md')).sort();
  const articles = [];
  for (const file of files) {
    const {data, body} = parseFrontMatter(await readFile(path.join(dir, file), 'utf8'));
    for (const key of ['title', 'description', 'category', 'published']) {
      if (!data[key]) throw new Error(`${file}: missing front matter "${key}"`);
    }
    if (!categories.some(c => c.id === data.category)) throw new Error(`${file}: unknown category ${data.category}`);
    const slug = file.replace(/\.md$/, '');
    const [main, sources = ''] = body.split(/\n## Sources\s*\n/);
    const rendered = renderMarkdown(main);
    const words = countWords(rendered.html);
    articles.push({
      ...data,
      title: smartQuotes(data.title),
      description: smartQuotes(data.description),
      slug,
      path: `/${slug}/`,
      updated: data.updated || data.published,
      summary: Array.isArray(data.summary) ? data.summary : [],
      html: rendered.html,
      headings: rendered.headings.filter(h => h.level === 2),
      sourcesHtml: sources.trim() ? renderMarkdown(sources).html : '',
      words,
      minutes: Math.max(1, Math.round(words / 220)),
    });
  }
  return articles.sort((a, b) => (Number(a.order || 99) - Number(b.order || 99)) || a.title.localeCompare(b.title));
}

async function loadPages() {
  const dir = path.join(contentDir, 'pages');
  const files = (await readdir(dir)).filter(f => f.endsWith('.md')).sort();
  const pages = [];
  for (const file of files) {
    const {data, body} = parseFrontMatter(await readFile(path.join(dir, file), 'utf8'));
    const slug = file.replace(/\.md$/, '');
    pages.push({...data, title: smartQuotes(data.title), dek: data.dek && smartQuotes(data.dek), slug, path: `/${slug}/`, html: renderMarkdown(body).html});
  }
  return pages;
}

// ---------- templates ----------

const absolute = p => site.url + p;
const formatDate = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'});

function layout({title, description, pagePath, body, ogType = 'website', jsonLd = [], noindex = false, version}) {
  const fullTitle = pagePath === '/' ? `${site.name} — ${site.tagline}` : `${title} | ${site.name}`;
  const ld = jsonLd.map(item => `<script type="application/ld+json">${JSON.stringify(item).replaceAll('<', '\\u003c')}</script>`).join('\n');
  const nav = categories.map(c => `<a href="/topics/${c.id}/">${escapeHtml(c.name)}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${absolute(pagePath)}">
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
<meta name="google-adsense-account" content="${site.adsensePublisher}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${site.adsensePublisher}" crossorigin="anonymous"></script>
<meta property="og:site_name" content="${site.name}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${absolute(pagePath)}">
<meta property="og:image" content="${site.url}/assets/og-default.png">
<meta property="og:locale" content="en_AU">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#fbf8f3">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="${site.name}" href="/feed.xml">
<link rel="stylesheet" href="/assets/styles.css?v=${version}">
${ld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/" aria-label="${site.name} home"><img src="/assets/icon.svg" alt="" width="34" height="34"><span>howloop</span></a>
    <nav class="primary-nav" aria-label="Topics">${nav}<a href="/about/">About</a></nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-inner">
    <div>
      <p class="footer-brand">howloop</p>
      <p>${escapeHtml(site.tagline)}. Written by ${escapeHtml(site.author.name)}, a professional chef based in Queensland, Australia.</p>
    </div>
    <nav aria-label="Site">
      <a href="/articles/">All articles</a>
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
      <a href="/editorial-policy/">Editorial policy</a>
      <a href="/privacy/">Privacy policy</a>
      <a href="/terms/">Terms of use</a>
      <a href="/feed.xml">RSS</a>
    </nav>
  </div>
  <p class="wrap copyright">© ${new Date().getUTCFullYear()} ${site.name}. Information on this site is general in nature and is not medical, dietary or food-safety advice for your specific situation.</p>
</footer>
</body>
</html>
`;
}

function card(article) {
  const category = categories.find(c => c.id === article.category);
  return `<article class="card">
  <p class="eyebrow"><a href="/topics/${category.id}/">${escapeHtml(category.name)}</a></p>
  <h3><a href="${article.path}">${escapeHtml(article.title)}</a></h3>
  <p>${escapeHtml(article.description)}</p>
  <p class="meta">${article.minutes} min read</p>
</article>`;
}

function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({'@type': 'ListItem', position: index + 1, name: item.name, item: absolute(item.path)})),
  };
}

function articlePage(article, articles, version) {
  const category = categories.find(c => c.id === article.category);
  const sameCategory = articles.filter(a => a.category === article.category && a.slug !== article.slug);
  const others = articles.filter(a => a.category !== article.category && a.slug !== article.slug);
  const related = [...sameCategory, ...others].slice(0, 3);
  const updated = article.updated !== article.published ? ` · Updated <time datetime="${article.updated}">${formatDate(article.updated)}</time>` : '';
  const summary = article.summary.length
    ? `<aside class="in-short" aria-label="In short"><p class="callout-title">In short</p><ul>${article.summary.map(s => `<li>${renderInline(s)}</li>`).join('')}</ul></aside>`
    : '';
  const toc = article.headings.length >= 4
    ? `<nav class="toc" aria-label="On this page"><p class="callout-title">On this page</p><ol>${article.headings.map(h => `<li><a href="#${h.id}">${renderInline(h.text)}</a></li>`).join('')}</ol></nav>`
    : '';
  const body = `<div class="wrap article-wrap">
<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">›</span><a href="/topics/${category.id}/">${escapeHtml(category.name)}</a></nav>
<article class="article">
  <header class="article-header">
    <h1>${escapeHtml(article.title)}</h1>
    <p class="dek">${escapeHtml(article.description)}</p>
    <p class="byline">By <a href="/about/">${escapeHtml(site.author.name)}</a> · <time datetime="${article.published}">${formatDate(article.published)}</time>${updated} · ${article.minutes} min read</p>
  </header>
  ${summary}
  ${toc}
  <div class="prose">
${article.html}
  </div>
  ${article.sourcesHtml ? `<section class="sources" aria-labelledby="sources"><h2 id="sources">Sources and further reading</h2>${article.sourcesHtml}</section>` : ''}
  <section class="author-box" aria-label="About the author">
    <img src="/assets/icon.svg" alt="" width="48" height="48">
    <div>
      <p><strong>${escapeHtml(site.author.name)}</strong> is a professional chef with more than a decade in hotel, Japanese and hatted Italian kitchens, and a background in mechanical engineering. <a href="/about/">More about Jess</a>.</p>
      <p class="small">Howloop articles are researched with AI assistance and checked against the sources listed above. Read our <a href="/editorial-policy/">editorial policy</a>, or <a href="/contact/">tell us about a mistake</a>.</p>
    </div>
  </section>
</article>
<section class="related" aria-labelledby="related"><h2 id="related">Keep reading</h2><div class="grid">${related.map(card).join('\n')}</div></section>
</div>`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      datePublished: article.published,
      dateModified: article.updated,
      wordCount: article.words,
      articleSection: category.name,
      mainEntityOfPage: absolute(article.path),
      image: `${site.url}/assets/og-default.png`,
      author: {'@type': 'Person', name: site.author.name, url: absolute(site.author.url), jobTitle: site.author.role},
      publisher: {'@type': 'Organization', name: site.name, url: site.url, logo: {'@type': 'ImageObject', url: `${site.url}/assets/logo-512.png`}},
    },
    breadcrumbLd([{name: 'Home', path: '/'}, {name: category.name, path: `/topics/${category.id}/`}, {name: article.title, path: article.path}]),
  ];
  return layout({title: article.title, description: article.description, pagePath: article.path, body, ogType: 'article', jsonLd, version});
}

function categoryPage(category, articles, version) {
  const list = articles.filter(a => a.category === category.id);
  const body = `<div class="wrap">
<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">›</span><span>${escapeHtml(category.name)}</span></nav>
<header class="page-header">
  <h1>${escapeHtml(category.title)}</h1>
  ${category.intro.map(p => `<p class="lede">${escapeHtml(p)}</p>`).join('\n')}
</header>
<div class="grid">${list.map(card).join('\n')}</div>
</div>`;
  const description = `${category.intro[0]} ${list.length} plain-English guides from a working chef.`;
  return layout({title: category.title, description: description.slice(0, 300), pagePath: `/topics/${category.id}/`, body, version,
    jsonLd: [breadcrumbLd([{name: 'Home', path: '/'}, {name: category.name, path: `/topics/${category.id}/`}])]});
}

function homePage(articles, version) {
  const featuredSlugs = ['what-temperature-do-eggs-cook', 'does-resting-steak-keep-it-juicy', 'maillard-reaction-vs-caramelisation'];
  const featured = featuredSlugs.map(s => articles.find(a => a.slug === s)).filter(Boolean);
  const sections = categories.map(c => `<section class="topic-section" aria-labelledby="topic-${c.id}">
  <div class="section-head"><h2 id="topic-${c.id}">${escapeHtml(c.title)}</h2><a href="/topics/${c.id}/">Browse ${escapeHtml(c.name)} →</a></div>
  <p class="section-intro">${escapeHtml(c.intro[0])}</p>
  <ul class="link-list">${articles.filter(a => a.category === c.id).map(a => `<li><a href="${a.path}">${escapeHtml(a.title)}</a><span>${escapeHtml(a.description)}</span></li>`).join('')}</ul>
</section>`).join('\n');
  const body = `<section class="hero">
  <div class="wrap hero-grid">
  <div class="hero-inner">
    <p class="eyebrow">Food science for people who cook</p>
    <h1>Why does food do <em>that</em>?</h1>
    <p class="lede">Howloop explains the science behind everyday cooking — what heat does to an egg, why a sauce splits, why onions sting — in plain English. Every guide is written from a working chef’s point of view and ends with the sources behind it, so you can check the evidence yourself.</p>
    <p class="hero-links"><a class="button" href="/articles/">Browse all ${articles.length} guides</a><a class="text-link" href="/about/">Who writes Howloop?</a></p>
  </div>
  <aside class="numbers" aria-labelledby="numbers-title">
    <p id="numbers-title" class="callout-title">Numbers every cook should know</p>
    <ol>
      <li><span>~62°C</span><a href="/what-temperature-do-eggs-cook/">Egg white starts to set</a></li>
      <li><span>~70°C</span><a href="/what-temperature-do-eggs-cook/">Egg yolk sets firm</a></li>
      <li><span>~82°C</span><a href="/why-custard-curdles/">Stirred custard is done</a></li>
      <li><span>100°C</span><a href="/maillard-reaction-vs-caramelisation/">Why wet food can’t brown</a></li>
      <li><span>~160°C</span><a href="/maillard-reaction-vs-caramelisation/">Table sugar caramelises</a></li>
      <li><span>~180°C</span><a href="/why-popcorn-pops/">Popcorn pops</a></li>
    </ol>
  </aside>
  </div>
</section>
<div class="wrap">
<section aria-labelledby="start-here"><h2 id="start-here" class="kicker">Start here</h2><div class="grid">${featured.map(card).join('\n')}</div></section>
${sections}
<section class="about-strip" aria-labelledby="about-strip">
  <h2 id="about-strip">Written in a real kitchen</h2>
  <p>Howloop is written by ${escapeHtml(site.author.name)}, a professional chef in Queensland, Australia, who trained in a luxury hotel kitchen in Seoul, cooked Japanese food in Vancouver and has spent more than a decade in Australian kitchens, including five years as sous chef and then head chef of a hatted Italian restaurant. Jess also trained in mechanical engineering — which is why these guides care about temperatures, pressures and measurements as much as flavour.</p>
  <p><a href="/about/">Read more about Jess and how Howloop is made →</a></p>
</section>
</div>`;
  const jsonLd = [{
    '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: site.url + '/', description: site.description,
    publisher: {'@type': 'Organization', name: site.name, url: site.url, logo: {'@type': 'ImageObject', url: `${site.url}/assets/logo-512.png`}},
  }];
  return layout({title: site.name, description: site.description, pagePath: '/', body, jsonLd, version});
}

function allArticlesPage(articles, version) {
  const body = `<div class="wrap">
<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">›</span><span>All articles</span></nav>
<header class="page-header"><h1>All articles</h1><p class="lede">Every Howloop guide, grouped by topic. Each one explains what is happening, what it means for your cooking, and where the evidence comes from.</p></header>
${categories.map(c => `<section class="topic-section" aria-labelledby="all-${c.id}"><div class="section-head"><h2 id="all-${c.id}">${escapeHtml(c.title)}</h2><a href="/topics/${c.id}/">Topic page →</a></div><ul class="link-list">${articles.filter(a => a.category === c.id).map(a => `<li><a href="${a.path}">${escapeHtml(a.title)}</a><span>${escapeHtml(a.description)}</span></li>`).join('')}</ul></section>`).join('\n')}
</div>`;
  return layout({title: 'All articles', description: `All ${articles.length} Howloop food-science guides — eggs, meat, fruit and vegetables, heat and browning, sauces and seasoning.`, pagePath: '/articles/', body, version});
}

function staticPage(page, version) {
  const updated = page.updated ? `<p class="byline">Last updated <time datetime="${page.updated}">${formatDate(page.updated)}</time></p>` : '';
  const body = `<div class="wrap article-wrap">
<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">›</span><span>${escapeHtml(page.title)}</span></nav>
<article class="article">
  <header class="article-header"><h1>${escapeHtml(page.title)}</h1>${page.dek ? `<p class="dek">${escapeHtml(page.dek)}</p>` : ''}${updated}</header>
  <div class="prose">
${page.html}
  </div>
</article>
</div>`;
  const jsonLd = page.slug === 'about' ? [{
    '@context': 'https://schema.org', '@type': 'AboutPage', url: absolute(page.path),
    mainEntity: {'@type': 'Person', name: site.author.name, jobTitle: site.author.role, sameAs: [site.youtube]},
  }] : [];
  return layout({title: page.title, description: page.description, pagePath: page.path, body, jsonLd, version});
}

function notFoundPage(articles, version) {
  const body = `<div class="wrap article-wrap"><article class="article"><header class="article-header"><h1>Page not found</h1><p class="dek">That address doesn’t exist on Howloop — it may belong to an older version of this site.</p></header>
<div class="prose"><p>Try one of these instead:</p><ul>${articles.slice(0, 6).map(a => `<li><a href="${a.path}">${escapeHtml(a.title)}</a></li>`).join('')}</ul><p>Or browse <a href="/articles/">all articles</a>.</p></div></article></div>`;
  return layout({title: 'Page not found', description: 'This page could not be found on Howloop. Browse our food-science guides on eggs, meat, vegetables, browning and sauces instead.', pagePath: '/404.html', body, noindex: true, version});
}

function rss(articles) {
  const items = [...articles].sort((a, b) => b.published.localeCompare(a.published)).map(a => `<item><title>${escapeHtml(a.title)}</title><link>${absolute(a.path)}</link><guid>${absolute(a.path)}</guid><pubDate>${new Date(a.published + 'T00:00:00Z').toUTCString()}</pubDate><description>${escapeHtml(a.description)}</description></item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${site.name}</title><link>${site.url}/</link><description>${escapeHtml(site.description)}</description><language>en-au</language>${items}</channel></rss>\n`;
}

// ---------- build ----------

async function writePage(pagePath, html) {
  const file = pagePath.endsWith('.html') ? path.join(dist, pagePath) : path.join(dist, pagePath, 'index.html');
  await mkdir(path.dirname(file), {recursive: true});
  await writeFile(file, html);
}

export async function build() {
  const articles = await loadArticles();
  const pages = await loadPages();
  for (const category of categories) {
    const count = articles.filter(a => a.category === category.id).length;
    if (count < 3) throw new Error(`Topic ${category.id} has only ${count} articles; every topic page needs at least three.`);
  }

  await rm(dist, {recursive: true, force: true});
  await mkdir(dist, {recursive: true});
  await cp(staticDir, dist, {recursive: true});
  const css = await readFile(path.join(staticDir, 'assets/styles.css'));
  const version = createHash('sha256').update(css).digest('hex').slice(0, 10);

  await writePage('/', homePage(articles, version));
  await writePage('/articles/', allArticlesPage(articles, version));
  for (const category of categories) await writePage(`/topics/${category.id}/`, categoryPage(category, articles, version));
  for (const article of articles) await writePage(article.path, articlePage(article, articles, version));
  for (const page of pages) await writePage(page.path, staticPage(page, version));
  await writePage('/404.html', notFoundPage(articles, version));

  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    {loc: '/', lastmod: today},
    {loc: '/articles/', lastmod: today},
    ...categories.map(c => ({loc: `/topics/${c.id}/`, lastmod: today})),
    ...articles.map(a => ({loc: a.path, lastmod: a.updated})),
    ...pages.map(p => ({loc: p.path, lastmod: p.updated || today})),
  ];
  await writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${absolute(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
  await writeFile(path.join(dist, 'ads.txt'), `google.com, ${site.adsensePublisher.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
  await writeFile(path.join(dist, 'feed.xml'), rss(articles));

  const totalWords = articles.reduce((sum, a) => sum + a.words, 0);
  console.log(`Built ${articles.length} articles (${totalWords.toLocaleString('en-AU')} words), ${categories.length} topic pages and ${pages.length} site pages into dist/.`);
  return {articles, pages};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await build();
