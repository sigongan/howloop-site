const normalise=value=>String(value??'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const compact=value=>normalise(value).replaceAll(' ','');
const aliases={
 commbank:['commonwealth','commonwealth bank','cba'],
 'national australia bank':['nab'],
 'bank of queensland limited':['boq'],
 'st george bank':['saint george','st george'],
 'macquarie bank limited':['macq'],
};
const skipInitials=new Set(['of','the','limited','ltd']);
export function searchBanks(banks,query){
 const phrase=normalise(query);
 if(!phrase||!Array.isArray(banks))return [];
 const queryWords=phrase.split(' '),q=queryWords.join('');
 return banks.map(bank=>{
  const name=normalise(bank.name),words=name.split(' '),other=aliases[name]??[];
  const forms=[name,...other].map(compact);
  const initials=[words.map(word=>word[0]).join(''),words.filter(word=>!skipInitials.has(word)).map(word=>word[0]).join('')];
  const allWords=[...words,...other.flatMap(alias=>normalise(alias).split(' '))];
  let score=Infinity;
  if(forms.some(value=>value===q))score=0;
  else if(other.some(value=>compact(value).startsWith(q)))score=1;
  else if(compact(name).startsWith(q))score=2;
  else if(initials.some(value=>value.startsWith(q)))score=3;
  else if(queryWords.length>1&&queryWords.every(part=>allWords.some(word=>word.startsWith(part))))score=4;
  else if(allWords.some(word=>word.startsWith(q)))score=5;
  else if(forms.some(value=>value.includes(q)))score=6;
  return {bank,score};
 }).filter(result=>Number.isFinite(result.score))
  .sort((a,b)=>a.score-b.score||a.bank.name.localeCompare(b.bank.name,'en-AU'))
  .map(result=>result.bank);
}
