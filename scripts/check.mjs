import {readFile,readdir} from 'node:fs/promises';import assert from 'node:assert/strict';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist');
async function list(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?list(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
const files=await list(dist),html=await readFile(path.join(dist,'index.html'),'utf8'),headers=await readFile(path.join(dist,'_headers'),'utf8');
assert.ok(!files.some(f=>/salary|tax-explain|banks|ads\.txt|cash-flow|finance|worked-examples/.test(f)));
for(const f of files.filter(f=>/\.(html|js)$/.test(f))){const text=await readFile(f,'utf8');assert.ok(!/googletagmanager|google-adsense-account|adsbygoogle|beacon\.min\.js|static\.cloudflareinsights\.com|localStorage|sessionStorage/.test(text),`Tracking/oldfinance marker in ${f}`);}
assert.match(headers,/no-transform/);assert.match(headers,/script-src 'self'/);assert.match(html,/name="viewport"/);assert.match(html,/<h1/);assert.match(html,/apple-scene|app.js/);
for(const id of ['apple','lemon','watermelon'])assert.equal(await readFile(path.join(root,'shared',id+'.json'),'utf8'),await readFile(path.join(dist,'content',id+'.json'),'utf8'));
console.log(JSON.stringify({passed:true,files:files.length,sharedContentMatches:true,financeRoutesPresent:false,trackingScriptsPresent:false}));
