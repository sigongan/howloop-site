const DAY=86400000;
function dateValue(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;
  const stamp=Date.parse(value+'T00:00:00Z');
  return Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)===value?stamp:NaN;
}
export function brisbaneDate(now=new Date()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Brisbane',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function reviewStatus(checked,days,today=brisbaneDate()){
  const start=dateValue(checked),current=dateValue(today);
  if(!Number.isFinite(start)||!Number.isFinite(current)||!Number.isInteger(days)||days<1||start>current)return {needsReview:true,due:null};
  const due=new Date(start+days*DAY).toISOString().slice(0,10);
  return {needsReview:current>=start+days*DAY,due};
}
export function policyLabel(policy,today=brisbaneDate()){
  if(policy.stage==='proposal')return 'Proposal · not in effect';
  if(policy.stage==='law-future')return dateValue(today)>=dateValue(policy.effectiveDate)?'Scheduled start reached · check current rules':'Law passed · starts '+formatDate(policy.effectiveDate);
  if(policy.endsAt&&dateValue(today)>dateValue(policy.endsAt))return 'Published end date passed · recheck';
  return 'In effect at last check';
}
export function formatDate(date){
  return Number.isFinite(dateValue(date))?new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric',timeZone:'Australia/Brisbane'}):'Date not verified';
}
