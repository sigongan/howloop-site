import {cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readdir} from 'node:fs/promises';
const root=path.resolve(import.meta.dirname,'..');
await rm(path.join(root,'dist'),{recursive:true,force:true});
await mkdir(path.join(root,'dist'),{recursive:true});
await cp(path.join(root,'web'),path.join(root,'dist'),{recursive:true});
await cp(path.join(root,'shared'),path.join(root,'dist/content'),{recursive:true});
await writeFile(path.join(root,'dist/robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://howloop.how/sitemap.xml\n');
await writeFile(path.join(root,'dist/sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://howloop.how/</loc><lastmod>2026-10-18</lastmod></url><url><loc>https://howloop.how/privacy.html</loc><lastmod>2026-10-18</lastmod></url></urlset>');
console.log('Built dependency-free food playground and shared learning content.');

// Version every local module and stylesheet, including transitive imports.
// The domain's edge cache can outlive a deployment.
async function assetFiles(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?assetFiles(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();}
const assets=(await assetFiles(path.join(root,'dist'))).filter(f=>/\.(js|css)$/.test(f)).sort();
const hash=createHash('sha256');for(const f of assets)hash.update(await readFile(f));
const version=hash.digest('hex').slice(0,12);
for(const f of [...assets.filter(f=>f.endsWith('.js')),path.join(root,'dist/index.html'),path.join(root,'dist/privacy.html')]){
 const source=await readFile(f,'utf8');
 await writeFile(f,source.replace(/(["'])([^"'\s]+\.(?:js|css))\1/g,(match,quote,url)=>`${quote}${url}?v=${version}${quote}`));
}
