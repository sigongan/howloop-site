import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {lessons} from '../src/data/money-school.mjs';
import {initSchoolQuizzes} from '../src/scripts/money-school.mjs';
for(const lesson of lessons)test(`${lesson.slug}: empty, wrong, changed and correct answers stay local`,()=>{
 const html=`<section data-school-quiz data-answer="${lesson.answer}"><form>${lesson.options.map((option,i)=>`<label><input type="radio" name="answer" value="${i}">${option}</label>`).join('')}<button data-check hidden>Check</button><p data-feedback role="status"></p></form><details>${lesson.why}</details></section>`;
 const dom=new JSDOM(html,{url:`https://howloop.how/money-school/${lesson.slug}/`});const d=dom.window.document;
 const root=d.querySelector('[data-school-quiz]'),form=root.querySelector('form'),feedback=root.querySelector('[data-feedback]');root.dataset.explanation=lesson.why;
 assert.equal(root.querySelector('[data-check]').hidden,true);assert.ok(root.querySelector('details').textContent.includes(lesson.why));
 initSchoolQuizzes(d);initSchoolQuizzes(d);assert.equal(root.querySelector('[data-check]').hidden,false);
 const submit=()=>{const event=new dom.window.Event('submit',{cancelable:true});form.dispatchEvent(event);assert.equal(event.defaultPrevented,true);};
 submit();assert.match(feedback.textContent,/Choose an answer/);
 const radios=[...form.querySelectorAll('input')];radios[(lesson.answer+1)%3].checked=true;submit();assert.match(feedback.textContent,/Not quite yet/);
 radios[lesson.answer].checked=true;form.dispatchEvent(new dom.window.Event('change'));assert.equal(feedback.textContent,'');submit();assert.ok(feedback.textContent.includes(lesson.why));assert.equal(feedback.dataset.correct,'true');
 assert.equal(dom.window.localStorage.length,0);assert.equal(dom.window.sessionStorage.length,0);assert.equal(dom.window.location.search,'');dom.window.close();
});
