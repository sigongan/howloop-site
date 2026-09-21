import index from '../data/banks.json';
const snapshots=import.meta.glob('../../public/data/banks/*.json',{eager:true,import:'default'});
export const comparisonData={
 fetchedAt:index.fetchedAt,
 bankCount:index.banks.length,
 banks:index.banks.map(bank=>{
  const snapshot:any=snapshots['../../public/data/banks/'+bank.id+'.json'];
  return {id:bank.id,name:bank.name,checkedAt:snapshot?.checkedAt??null,status:snapshot?.status??'unavailable',products:snapshot?.products??[]};
 })
};

