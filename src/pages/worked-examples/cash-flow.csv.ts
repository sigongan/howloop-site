import {timingExperiment} from '../../lib/worked-experiments.mjs';
import {exportCashFlowCsv} from '../../lib/cash-flow.mjs';
export function GET(){return new Response(exportCashFlowCsv(timingExperiment().original),{headers:{'Content-Type':'text/csv; charset=utf-8'}});}
