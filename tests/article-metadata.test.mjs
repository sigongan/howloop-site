import test from 'node:test';
import assert from 'node:assert/strict';
import {articleMetadata} from '../src/lib/article-metadata.mjs';
test('article metadata preserves edit dates and honest organizational authorship',()=>{
 const guide={slug:'sample',title:'An example',summary:'An explanation',datePublished:'2026-09-18',dateModified:'2026-09-27',sourcesChecked:'2026-10-12'};
 const result=articleMetadata(guide);
 assert.equal(result.author['@type'],'Organization');assert.equal(result.author.url,'https://howloop.how/about/#publisher');
 assert.equal(result.datePublished,guide.datePublished);assert.equal(result.dateModified,guide.dateModified);assert.notEqual(result.dateModified,guide.sourcesChecked);
 assert.equal(result.mainEntityOfPage['@id'],'https://howloop.how/learn/sample/');
 assert.doesNotThrow(()=>JSON.parse(JSON.stringify(result)));assert.equal(result.image,undefined);
});
