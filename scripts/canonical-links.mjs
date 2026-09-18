import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
// Cloudflare serves directory/index.html pages at their trailing-slash URLs.
// Normalise only routes that actually exist; leave assets, API paths and queries alone.
export async function normaliseBuiltLinks({dir}) {
 const root=fileURLToPath(dir);
 async function walk(folder){return (await Promise.all((await fs.readdir(folder,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(folder,e.name)):[path.join(folder,e.name)]))).flat();}
 const files=await walk(root),html=files.filter(f=>f.endsWith('.html'));
 const routes=new Set(html.filter(f=>path.basename(f)==='index.html').map(f=>'/'+path.relative(root,path.dirname(f)).replaceAll(path.sep,'/')).map(p=>p==='/'?p:p.replace(/\/+$/,'')+'/'));
 for(const file of html){
  const original=await fs.readFile(file,'utf8');
  const updated=original.replace(/href=(['"])(https:\/\/howloop\.how)?(\/[^'"]*)\1/g,(all,quote,origin='',href)=>{
   const split=href.search(/[?#]/),pathname=split<0?href:href.slice(0,split),suffix=split<0?'':href.slice(split);
   const canonical=pathname==='/'?'/':pathname.replace(/\/+$/,'')+'/';
   return routes.has(canonical)?'href='+quote+origin+canonical+suffix+quote:all;
  });
  if(updated!==original)await fs.writeFile(file,updated);
 }
}
