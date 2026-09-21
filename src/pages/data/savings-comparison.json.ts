import {comparisonData} from '../../lib/savings-comparison-data';
import {isSavingsCandidate} from '../../lib/savings-comparison.mjs';
export function GET(){
 const data={...comparisonData,banks:comparisonData.banks.map(bank=>({...bank,products:bank.products.filter(isSavingsCandidate)})).filter(bank=>bank.products.length)};
 return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json; charset=utf-8'}});
}

