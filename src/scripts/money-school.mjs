export function initSchoolQuizzes(doc){
 for(const root of doc.querySelectorAll('[data-school-quiz]')){
  if(root.dataset.ready)continue;root.dataset.ready='true';
  const form=root.querySelector('form'),button=root.querySelector('[data-check]'),feedback=root.querySelector('[data-feedback]');
  button.hidden=false;
  form.addEventListener('submit',event=>{
   event.preventDefault();const answer=form.querySelector('input:checked');
   if(!answer){feedback.textContent='Choose an answer first. It is okay to have a guess.';form.querySelector('input').focus();return;}
   const correct=Number(answer.value)===Number(root.dataset.answer);
   feedback.textContent=correct?`You’ve got it! ${root.dataset.explanation}`:'Not quite yet. Read the picture and try again, or open the explanation below.';
   feedback.dataset.correct=String(correct);
  });
  form.addEventListener('change',()=>{feedback.textContent='';delete feedback.dataset.correct;});
 }
}
