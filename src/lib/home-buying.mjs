/** General planning arithmetic. No lending, scheme or LMI eligibility decision. */
export function homeDeposit({price,deposit,valuation=price,financedCosts=0}) {
  const values={price,deposit,valuation,financedCosts};
  for(const [name,value] of Object.entries(values)) {
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100000000) throw new RangeError('Enter valid amounts between $0 and $100 million.');
    if((name==='price'||name==='valuation')&&value===0) throw new RangeError('The property price and valuation must be above $0.');
  }
  if(deposit>price) throw new RangeError('The deposit towards the price cannot exceed the purchase price.');
  const loan=price-deposit+financedCosts;
  const lvr=loan/valuation*100;
  return {loan,lvr,depositPercent:deposit/price*100,additionalFor80:Math.max(0,loan-valuation*.8),above80:loan>valuation*.8};
}
