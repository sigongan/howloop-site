const maxAge = 7 * 86400000;
export function bankFreshness(snapshot, now = Date.now()) {
  const timestamp = typeof snapshot.checkedAt === 'string' ? Date.parse(snapshot.checkedAt) : NaN;
  const age = now - timestamp;
  const hasDate = Number.isFinite(timestamp);
  const outdated = !hasDate || age < 0 || age > maxAge;
  const usable = !outdated && snapshot.status === 'available';
  const date = hasDate ? new Date(timestamp).toLocaleDateString('en-AU', {timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', year: 'numeric'}) : null;
  let note = date ? 'Retrieved ' + date + '.' : 'No successful retrieval recorded.';
  if (snapshot.status === 'stale' || snapshot.status === 'unavailable') note += ' Latest refresh failed; confirm current rates with the bank.';
  else if (snapshot.status === 'partial') note += ' Incomplete product data; confirm current rates with the bank.';
  if (hasDate && age > maxAge) note += ' More than 7 days old.';
  if (hasDate && age < 0) note += ' Retrieval date needs checking.';
  return {usable, date, note};
}
