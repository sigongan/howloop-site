# Weekly bank product refresh

The `Refresh bank products` GitHub Actions workflow requests public CDR product data every Monday at approximately 06:23 Australia/Brisbane (Sunday 20:23 UTC). It also runs when its workflow, updater or refresh tests change on main. Data-only commits do not trigger another refresh. The GitHub Actions page has a **Run workflow** button for a manual retry.

No customer account access, OpenAI key, paid data subscription or generative AI is involved. Calculations continue to run in the visitor's browser using the existing tested formulas. This is a weekly snapshot, not a real-time rate feed or a whole-market ranking.

## Publication checks

- Read the official CDR banking-brand register. Reject invalid or repeated IDs, fewer than 20 banking brands, or a fall of more than 20% from previous coverage.
- Fetch current transaction and savings products, with five concurrent banks, bounded pagination, 15-second request timeouts and up to three attempts for transient errors. Obvious business-only names and tailored products are excluded; the remaining set is not a verified retail-savings catalogue.
- Retrieve every candidate product detail before replacing that bank. Missing detail, malformed rates, pagination errors and provider failures preserve the earlier products and original retrieval date. A failed bank with no earlier products has no successful retrieval date.
- Reject the entire update if fewer than half of the registered banks refresh, fewer than 70% of previously covered banks refresh, or total product coverage falls below 70% of the prior snapshot. Unexpected large changes require investigation before publication.
- Run calculation/refresh tests, the static build and readiness checks before committing only bank JSON files. Cloudflare Pages builds the resulting commit through the existing GitHub integration. A failed build does not replace the live deployment.

The thresholds detect broad outages and unexpected data loss; they do not prove the bank's published terms are correct. The script does not infer bonus eligibility, invent absent rates or automatically rewrite financial guides and tax law.

## Dates and fallback

`fetchedAt` is the time of the overall refresh attempt that passed publication checks. Each bank's `checkedAt` is its last successful complete retrieval; `lastAttempt` records the latest attempt. `stale` means a failed refresh retained saved products. `unavailable` means there are no usable saved products. The calculator does not automatically apply rates from a failed, partial, undated or more-than-seven-day-old snapshot. Visitors can inspect the terms and enter a separately confirmed rate.

## Investigating failures

Open the repository's **Actions → Refresh bank products** run. Logs identify provider failures; the summary counts retrieved, retained and unavailable brands. A failed overall gate prevents the data commit. Fix the cause, then use **Run workflow** on main. Do not remove validation merely to make a failed run green. Never force-push over a newer main commit.

For local review, `npm run refresh:rates -- --output-dir <temporary-directory>` reads the current snapshots but writes the candidate dataset elsewhere. Without this option it updates the working copy. `npm test`, `npm run build` and `npm run check:readiness` must pass before publishing.

GitHub schedules can be delayed and public-repository schedules can be disabled after 60 days without repository activity. Failure notifications follow the repository owner's GitHub Actions notification settings. Check site retrieval dates and Actions status if an update is missed. A successful run is data retrieval, not an editorial review or an AdSense approval.

Sources: [CDR public product data](https://www.cdr.gov.au/for-providers/how-find-data-holders-product-data-request-service), [CDR standards](https://consumerdatastandardsaustralia.github.io/standards/), [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
