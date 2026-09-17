import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const registerURL='https://api.cdr.gov.au/cdr-register/v1/all/data-holders/brands/summary';
async function get(url,version,minVersion='3'){
 const response=await fetch(url,{headers:{accept:'application/json','x-v':String(version),'x-min-v':String(minVersion)},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('HTTP '+response.status);
 return response.json();
}
async function oldBank(id){try{return JSON.parse(await fs.readFile(path.join(root,'public/data/banks',id+'.json'),'utf8'));}catch{return null;}}
async function pool(items,fn,concurrency=5){let next=0;await Promise.all(Array.from({length:concurrency},async()=>{while(next<items.length){const i=next++;await fn(items[i]);}}));}
const register=await get(registerURL,2,1);
if(!Array.isArray(register.data))throw Error('Invalid CDR register response; existing snapshots retained.');
const brands=register.data.map(b=>({...b,dataHolderBrandId:b.dataHolderBrandId??(b.interimId?'interim-'+b.interimId:null)})).filter(b=>b.industries?.includes('banking')&&typeof b.dataHolderBrandId==='string'&&/^[a-zA-Z0-9-]+$/.test(b.dataHolderBrandId)).sort((a,b)=>a.brandName.localeCompare(b.brandName));
if(brands.length<20)throw Error('Unexpectedly small register response; existing snapshots retained.');
const now=new Date().toISOString(),banks=[];
await pool(brands,async b=>{
 const previous=await oldBank(b.dataHolderBrandId);
 const bank={id:b.dataHolderBrandId,name:b.brandName,baseUri:b.publicBaseUri,checkedAt:now,lastAttempt:now,status:'available',products:[]};
 try{
 const base=new URL(b.publicBaseUri);if(base.protocol!=='https:')throw Error('Unsupported provider URL');
 let url=b.publicBaseUri.replace(/\/$/,'')+'/cds-au/v1/banking/products?product-category=TRANS_AND_SAVINGS_ACCOUNTS&effective=CURRENT&page-size=100',pages=0;const products=[];
 while(url){
  if(++pages>20)throw Error('Pagination exceeded safety limit');
  const payload=await get(url,5);if(!Array.isArray(payload.data?.products))throw Error('Invalid products payload');
  products.push(...payload.data.products);const next=payload.links?.next;
  if(next&&new URL(next).origin!==base.origin)throw Error('Unexpected pagination host');
  url=next??null;
 }
 const candidates=products.filter(p=>p.isTailored!==true&&!/business|trust|smsf|superannuation|corporate|community|charity|commercial|farm|statutory|solicitor|real estate|body corporate/i.test(p.name));
 for(const p of candidates){try{
  const source=b.publicBaseUri.replace(/\/$/,'')+'/cds-au/v1/banking/products/'+encodeURIComponent(p.productId);
  const {data:d}=await get(source,7);if(!d?.productId)throw Error('Invalid product');
  if(d.depositRates?.length)bank.products.push({id:d.productId,name:d.name,description:d.description,url:d.additionalInformation?.overviewUri??d.additionalInformation?.termsUri??null,lastUpdated:d.lastUpdated,source,depositRates:d.depositRates,fees:d.fees??[],eligibility:d.eligibility??[],constraints:d.constraints??[],features:d.features??[],additionalInformation:d.additionalInformation});
 }catch{bank.detailErrors=(bank.detailErrors??0)+1;}}
 if(bank.detailErrors)bank.status='partial';
 }catch(e){bank.status='unavailable';bank.error=e.message;if(previous){bank.products=previous.products;bank.checkedAt=previous.checkedAt;}}
 banks.push(bank);console.log(bank.name+': '+bank.status+' ('+bank.products.length+' products)');
});
banks.sort((a,b)=>a.name.localeCompare(b.name));
await fs.mkdir(path.join(root,'public/data/banks'),{recursive:true});await fs.mkdir(path.join(root,'src/data'),{recursive:true});
const metadata={fetchedAt:now,source:registerURL,banks:banks.map(({products,...bank})=>({...bank,productCount:products.length}))};
async function atomic(file,value){const tmp=file+'.tmp';await fs.writeFile(tmp,JSON.stringify(value,null,2));await fs.rename(tmp,file);}
for(const bank of banks)await atomic(path.join(root,'public/data/banks',bank.id+'.json'),{name:bank.name,checkedAt:bank.checkedAt,lastAttempt:bank.lastAttempt,status:bank.status,products:bank.products});
await atomic(path.join(root,'src/data/banks.json'),metadata);await atomic(path.join(root,'public/data/banks.json'),metadata);
console.log('Updated '+banks.length+' banking brands. Publish the generated snapshots through the existing deployment workflow.');
