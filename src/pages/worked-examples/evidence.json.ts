import {experimentEvidence} from '../../lib/worked-experiments.mjs';
export function GET(){return new Response(JSON.stringify(experimentEvidence(),null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});}
