import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {FIELDS,KINDS,defaultValues,calculateLanguageTool,parseLocalizedNumber,readLanguageState,formatMoney} from '../src/lib/language-calculators.mjs';

test('every language keeps labels, lists and numeric placeholders complete',async()=>{
 const english=JSON.parse(await fs.readFile(new URL('../src/data/languages/en.json',import.meta.url),'utf8'));
 for(const name of ['zh-hans','zh-hant','ar','vi','pa','es','ko']){
  const copy=JSON.parse(await fs.readFile(new URL(`../src/data/languages/${name}.json`,import.meta.url),'utf8'));
  assert.deepEqual(Object.keys(copy).sort(),Object.keys(english).sort(),name);
  for(const [key,value] of Object.entries(english)){
   assert.ok(copy[key]?.length,`${name}.${key}`);
   if(Array.isArray(value)){assert.equal(copy[key].length,value.length);assert.ok(copy[key].every(item=>typeof item==='string'&&item.trim()));}
   else assert.deepEqual([...copy[key].matchAll(/\{\w+\}/g)].map(m=>m[0]).sort(),[...value.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort(),`${name}.${key}`);
  }
 }
 for(const kind of KINDS){for(const field of FIELDS[kind]){assert.ok(english[field.label]);for(const [,key] of field.options??[])assert.ok(english[key]);}}
});
test('translated savings uses independent compound-interest example and zero-rate deposits',()=>{
 const result=calculateLanguageTool('compound-interest',{principal:100,contribution:0,frequency:'monthly',annualRate:10,years:1});
 assert.ok(Math.abs(result.total-100*(1+.1/12)**12)<1e-8);
 const zero=calculateLanguageTool('compound-interest',{principal:1000,contribution:100,frequency:'weekly',annualRate:0,years:2});
 assert.ok(Math.abs(zero.total-11400)<1e-8);
});
test('mortgage, goal and buffer have independently checkable zero-rate outcomes',()=>{
 const mortgage=calculateLanguageTool('mortgage',{principal:1200,annualRate:0,years:1,offset:0,extra:100});
 assert.equal(mortgage.total,100);assert.equal(mortgage.stats.find(([key])=>key==='paidOff')[1],6);
 assert.equal(calculateLanguageTool('savings-goal',{principal:1200,target:3600,annualRate:0,years:1}).total,200);
 const buffer=calculateLanguageTool('emergency-fund',{expenses:1000,months:3,existing:1000,contribution:500});
 assert.equal(buffer.total,3000);assert.equal(buffer.stats[1][1],4);
 assert.equal(calculateLanguageTool('emergency-fund',{expenses:1000,months:3,existing:1000,contribution:0}).stats[1][1],null);
});
test('pay shows employer super separately and language never changes underlying currency',()=>{
 const result=calculateLanguageTool('salary',{...defaultValues('salary'),amount:50000,outputPeriod:'annual'});
 assert.equal(result.stats.find(([key])=>key==='super')[1],6000);
 assert.equal(result.total+result.stats.find(([key])=>key==='tax')[1],50000);
 for(const lang of ['en-AU','zh-Hans','zh-Hant','ar','vi','pa-Guru','es','ko'])assert.ok(formatMoney(result.total,lang).includes('AUD'));
});
test('accept supported scripts but reject blanks, malformed or ambiguous numbers',()=>{
 for(const input of ['1,234.50','١٬٢٣٤٫٥٠','۱۲۳۴.۵۰','੧੨੩੪.੫੦','１２３４.５０'])assert.equal(parseLocalizedNumber(input),1234.5);
 assert.equal(parseLocalizedNumber('1,23,456.50'),123456.5);
 assert.equal(parseLocalizedNumber('10,00,00,000'),100000000);
 for(const input of ['',null,' ','1,5','1.234,50','1e5','-5','123,45,678','1.234'])assert.ok(Number.isNaN(parseLocalizedNumber(input)),String(input));
 assert.throws(()=>calculateLanguageTool('compound-interest',{...defaultValues('compound-interest'),principal:''}));
 assert.throws(()=>calculateLanguageTool('emergency-fund',{...defaultValues('emergency-fund'),months:2.5}));
});
test('handoff expires, ignores unknown fields, validates choices and does not trust future state',()=>{
 const now=Date.now(),saved={at:now,kind:'compound-interest',values:{'compound-interest':{...defaultValues('compound-interest'),principal:12345,secret:'not retained'},salary:{...defaultValues('salary'),inputPeriod:'nonsense'}}};
 const restored=readLanguageState(JSON.stringify(saved),now);
 assert.equal(restored.values['compound-interest'].principal,12345);assert.equal(restored.values['compound-interest'].secret,undefined);assert.equal(restored.values.salary,undefined);
 assert.equal(readLanguageState(JSON.stringify(saved),now+1800001),null);
 assert.equal(readLanguageState(JSON.stringify(saved),now-1),null);
 assert.equal(readLanguageState('{broken',now),null);
});
