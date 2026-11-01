import {readFile,readdir} from 'node:fs/promises';import assert from 'node:assert/strict';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist');
async function list(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?list(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
const files=await list(dist),html=await readFile(path.join(dist,'index.html'),'utf8'),headers=await readFile(path.join(dist,'_headers'),'utf8');
assert.ok(!files.some(f=>/salary|tax-explain|banks|cash-flow|finance|worked-examples/.test(path.relative(dist,f))));
for(const f of files.filter(f=>/\.(html|js)$/.test(f))){const text=await readFile(f,'utf8');assert.ok(!/googletagmanager|googlesyndication|doubleclick|adsbygoogle|beacon\.min\.js|static\.cloudflareinsights\.com|localStorage|sessionStorage/.test(text),`Tracking or ad script in ${f}`);}
const ownership = html.match(/<head>[^]*?<meta name="google-adsense-account" content="ca-(pub-\d{16})">[^]*?<\/head>/);
assert.ok(ownership, 'Homepage head contains the publisher verification tag');
assert.equal((await readFile(path.join(dist,'ads.txt'),'utf8')).trim(), `google.com, ${ownership[1]}, DIRECT, f08c47fec0942fa0`);
const sitemap = await readFile(path.join(dist,'sitemap.xml'),'utf8');
for (const page of ['/learn/', '/grown-ups/', '/privacy/']) {
  const url = 'https://howloop.how' + page;
  const pageHtml = await readFile(path.join(dist, page.slice(1), 'index.html'), 'utf8');
  assert.ok(html.includes(`href="${page}"`) && pageHtml.includes(`rel="canonical" href="${url}"`) && sitemap.includes(`<loc>${url}</loc>`), `Public route ${page}`);
}
assert.match(headers,/no-transform/);assert.match(headers,/script-src 'self'/);assert.match(html,/name="viewport"/);assert.match(html,/<h1/);assert.match(html,/apple-scene|app.js/);
for(const id of ['apple','lemon','watermelon','orange','pear'])assert.equal(await readFile(path.join(root,'shared',id+'.json'),'utf8'),await readFile(path.join(dist,'content',id+'.json'),'utf8'));
console.log(JSON.stringify({passed:true,files:files.length,sharedContentMatches:true,financeRoutesPresent:false,trackingScriptsPresent:false}));
