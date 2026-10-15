import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {initHomeLab} from '../src/scripts/home-lab.mjs';
function fixture(){
 const dom=new JSDOM(`<aside data-home-lab><form><div data-lab-controls hidden><input name="deposit" type="number" value="200"><input type="range" data-lab-slider min="0" max="1000" value="200"><button type="button" data-lab-years="1">1 year</button><button type="button" data-lab-years="5">5 years</button></div><p data-lab-error hidden></p></form><span data-lab-label></span><strong data-lab-total></strong><span data-lab-deposits></span><span data-lab-interest></span><p id="lab-assumptions"></p><div data-lab-chart></div><a data-lab-continue href="/calculators/compound-interest/">Continue</a></aside>`,{url:"https://howloop.test/"});
 const doc=dom.window.document;initHomeLab(doc);
 const edit=value=>{const el=doc.querySelector('[name=deposit]');el.value=value;el.dispatchEvent(new dom.window.Event('input'));};
 return{dom,doc,edit,text:s=>doc.querySelector(s).textContent};
}
test('savings playground separates independently checked deposits and compound interest',()=>{
 const f=fixture();assert.equal(f.text('[data-lab-total]'),'$14,481');assert.equal(f.text('[data-lab-deposits]'),'$13,000');assert.equal(f.text('[data-lab-interest]'),'$1,481');
 f.edit('250');assert.equal(f.text('[data-lab-total]'),'$17,796');assert.equal(f.text('[data-lab-deposits]'),'$16,000');assert.match(f.text('#lab-assumptions'),/\$250/);assert.equal(f.doc.querySelector('[data-lab-controls]').hidden,false);f.dom.window.close();
});
test('timeframe and slider update both the explanation and actual annual chart',()=>{
 const f=fixture();f.doc.querySelector('[data-lab-years="1"]').click();assert.equal(f.text('[data-lab-label]'),'Illustrative balance after 1 year');assert.equal(f.doc.querySelectorAll('[data-lab-chart]>div').length,1);
 const slider=f.doc.querySelector('[data-lab-slider]');slider.value='0';slider.dispatchEvent(new f.dom.window.Event('input'));assert.equal(f.text('[data-lab-total]'),'$1,041');assert.equal(f.text('[data-lab-deposits]'),'$1,000');f.dom.window.close();
});
test('empty and invalid inputs identify the previous estimate instead of implying an updated result',()=>{
 const f=fixture();for(const value of ['', '-1','10001']){f.edit(value);assert.equal(f.doc.querySelector('[data-lab-error]').hidden,false);assert.match(f.text('[data-lab-label]'),/Previous estimate/);}
 f.edit('0.49');assert.match(f.text('#lab-assumptions'), /\$0\.49 added/);
 f.edit('0');assert.equal(f.doc.querySelector('[data-lab-error]').hidden,true);assert.equal(f.text('[data-lab-total]'),'$1,221');assert.equal(f.doc.querySelector('[name=deposit]').hasAttribute('aria-invalid'),false);f.dom.window.close();
});

test('continuing carries the chosen example once without putting money in the URL',()=>{
 const f=fixture();f.edit('300.49');
 const link=f.doc.querySelector('[data-lab-continue]');link.addEventListener('click',e=>e.preventDefault());link.click();
 const draft=JSON.parse(f.dom.window.sessionStorage.getItem('howloop-quick-savings-v1'));assert.equal(draft.contribution,300.49);assert.equal(draft.principal,1000);assert.equal(draft.years,5);assert.equal(link.getAttribute('href'),'/calculators/compound-interest/');f.dom.window.close();
});
