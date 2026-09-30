import test from 'node:test';
import assert from 'node:assert/strict';
import {searchBanks,filterSavingsSearch} from '../src/lib/bank-search.mjs';

const banks=[
 {name:'CBA - CommBiz'}, {name:'CommBank'}, {name:'NATIONAL AUSTRALIA BANK'},
 {name:'Bank of Queensland Limited'}, {name:'Bank of Melbourne'},
 {name:'Great Southern Bank'}, {name:'ANZ Plus'}, {name:'ANZ'},
 {name:'Macquarie Bank Limited'}, {name:'HSBC Bank Australia Limited – Wholesale Banking'}
];
const first=query=>searchBanks(banks,query)[0]?.name;

test('a short name or common alias finds the personal bank first',()=>{
 for(const query of ['Common','Commonwealth','CBA','Comm bank'])assert.equal(first(query),'CommBank');
});
test('initials and abbreviations find the intended bank',()=>{
 assert.equal(first('NAB'),'NATIONAL AUSTRALIA BANK');
 assert.equal(first('BOQ'),'Bank of Queensland Limited');
 assert.equal(first('GSB'),'Great Southern Bank');
 assert.equal(first('macq'),'Macquarie Bank Limited');
});
test('a few words in any position find the right bank',()=>{
 assert.equal(first('bank mel'),'Bank of Melbourne');
 assert.equal(first('southern bank'),'Great Southern Bank');
 assert.deepEqual(searchBanks(banks,'anz').slice(0,2).map(bank=>bank.name),['ANZ','ANZ Plus']);
});
test('blank and unmatched queries do not suggest unrelated banks',()=>{
 assert.deepEqual(searchBanks(banks,''),[]);
 assert.deepEqual(searchBanks(banks,'zzzz'),[]);
});

test('short abbreviations do not match unrelated mid-word fragments',()=>{
 assert.deepEqual(searchBanks(banks,'CBA').map(bank=>bank.name),['CommBank','CBA - CommBiz']);
});

const rankedAccounts=[
 {bankName:'Great Southern Bank',product:{name:'Everyday Saver'}},
 {bankName:'CommBank',product:{name:'NetBank Saver'}},
 {bankName:'CommBank',product:{name:'GoalSaver'}},
 {bankName:'NATIONAL AUSTRALIA BANK',product:{name:'Reward Saver'}}
];
test('savings search finds partial bank aliases and initials without changing interest order',()=>{
 for(const query of ['common','CBA'])assert.deepEqual(filterSavingsSearch(rankedAccounts,query),rankedAccounts.slice(1,3));
 assert.deepEqual(filterSavingsSearch(rankedAccounts,'GSB'),rankedAccounts.slice(0,1));
 assert.deepEqual(filterSavingsSearch(rankedAccounts,'NAB'),rankedAccounts.slice(3));
});
test('savings search combines bank words and account names and handles clearing',()=>{
 assert.deepEqual(filterSavingsSearch(rankedAccounts,'common goal'),[rankedAccounts[2]]);
 assert.deepEqual(filterSavingsSearch(rankedAccounts,'reward'),[rankedAccounts[3]]);
 assert.deepEqual(filterSavingsSearch(rankedAccounts,'saver'),rankedAccounts);
 assert.deepEqual(filterSavingsSearch(rankedAccounts,''),rankedAccounts);
 assert.deepEqual(filterSavingsSearch(rankedAccounts,'zzzz'),[]);
});
