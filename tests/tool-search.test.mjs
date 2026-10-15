import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { initToolSearch } from '../src/scripts/tool-search.mjs';

function fixture() {
  const dom = new JSDOM(`<div data-tool-finder>
    <form data-tool-controls hidden><input type="search" data-tool-query><button type="button" data-tool-clear hidden>Clear</button></form>
    <p data-tool-status role="status"></p><nav data-tool-topics><a href="#pay">Pay</a></nav>
    <section id="pay" data-tool-group><a href="/calculators/salary/" data-tool-search="Pay after tax salary wages super take-home">Salary</a><a href="/tools/cash-flow/" data-tool-search="Payday bills cash flow budget">Bills</a></section>
    <section data-tool-group><a href="/calculators/mortgage/" data-tool-search="Mortgage offset home loan repayments">Mortgage</a></section>
    <div data-tool-empty hidden><p>No tools match.</p><button type="button" data-tool-reset>Show all tools</button></div>
  </div>`);
  const doc = dom.window.document;
  const root = doc.querySelector('[data-tool-finder]');
  const input = doc.querySelector('input');
  const query = value => { input.value = value; input.dispatchEvent(new dom.window.Event('input')); };
  const visible = () => [...root.querySelectorAll('[data-tool-search]')].filter(card => !card.hidden).map(card => card.textContent);
  return {dom,doc,root,input,query,visible};
}

test('all tools remain navigable without JS; search only appears when operational', () => {
  const f=fixture();
  assert.equal(f.doc.querySelector('[data-tool-controls]').hidden,true);
  assert.deepEqual(f.visible(),['Salary','Bills','Mortgage']);
  assert.ok([...f.root.querySelectorAll('[data-tool-search]')].every(card=>card.hasAttribute('href')));
  initToolSearch(f.root);
  assert.equal(f.doc.querySelector('[data-tool-controls]').hidden,false);
  assert.equal(f.doc.querySelector('[data-tool-status]').textContent,'3 free tools. No account needed.');
  f.dom.window.close();
});

test('search finds multiple words in any order and handles punctuation and accent marks', () => {
  const f=fixture();initToolSearch(f.root);
  f.query(' SUPER   sálary ');
  assert.deepEqual(f.visible(),['Salary']);
  assert.equal(f.doc.querySelector('[data-tool-status]').textContent,'1 tool found.');
  assert.equal(f.doc.querySelectorAll('[data-tool-group]')[1].hidden,true);
  assert.equal(f.doc.querySelector('[data-tool-topics]').hidden,true);
  f.query('take-home');
  assert.deepEqual(f.visible(),['Salary']);
  f.query('LOAN home');
  assert.deepEqual(f.visible(),['Mortgage']);
  f.dom.window.close();
});

test('empty searches announce no results; reset restores all groups and puts focus in search', () => {
  const f=fixture();initToolSearch(f.root);
  f.query('unavailable tool');
  assert.equal(f.doc.querySelector('[data-tool-status]').textContent,'0 tools found.');
  assert.equal(f.doc.querySelector('[data-tool-empty]').hidden,false);
  assert.deepEqual(f.visible(),[]);
  f.doc.querySelector('[data-tool-reset]').click();
  assert.equal(f.input.value,'');
  assert.equal(f.doc.activeElement,f.input);
  assert.deepEqual(f.visible(),['Salary','Bills','Mortgage']);
  assert.equal(f.doc.querySelector('[data-tool-empty]').hidden,true);
  assert.ok([...f.doc.querySelectorAll('[data-tool-group]')].every(group=>!group.hidden));
  assert.equal(f.doc.querySelector('[data-tool-topics]').hidden,false);
  f.dom.window.close();
});

test('Clear, Escape and the native search clear event restore every tool', () => {
  const f=fixture();initToolSearch(f.root);f.input.focus();
  f.query('salary');
  assert.equal(f.doc.querySelector('[data-tool-clear]').hidden,false);
  f.doc.querySelector('[data-tool-clear]').click();
  assert.equal(f.visible().length,3);
  assert.equal(f.doc.querySelector('[data-tool-clear]').hidden,true);
  f.query('mortgage');
  f.input.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'Escape',cancelable:true}));
  assert.equal(f.input.value,'');
  assert.equal(f.doc.activeElement,f.input);
  assert.equal(f.visible().length,3);
  f.query('budget');f.query('');
  assert.equal(f.visible().length,3);
  f.dom.window.close();
});

test('Enter does not submit a search to the server and repeated initialization is safe', () => {
  const f=fixture();initToolSearch(f.root);initToolSearch(f.root);
  const event = new f.dom.window.Event('submit',{cancelable:true});
  f.doc.querySelector('form').dispatchEvent(event);
  assert.equal(event.defaultPrevented,true);
  f.query('budget');
  assert.deepEqual(f.visible(),['Bills']);
  f.doc.querySelector('form').remove();
  assert.doesNotThrow(()=>initToolSearch(f.root));
  f.dom.window.close();
});
