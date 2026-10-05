# Financial safety and discovery review — 6 October 2026

## Scope and baseline

Changes were prepared against verified main `faf4fb2f9db94a06d5f585464387c179d4781317`.
The earlier working directory was preserved; this change starts from a separate,
byte-verified main snapshot. Baseline: 194 passing tests and 69 generated routes.

This is an engineering and content-correction review. It is not a professional
financial review, verification of every provider's current terms, or a prediction
of Google approval. There is no new ad script, checkout, paid API or account access.

## Material calculation corrections

1. All automatic bank models and rate summaries now share conservative guards.
   A `BONUS` row described as a total rate is not added to the base. Prose-only
   caps, conflicting rate tiers and unmodelled expiry periods are rejected rather
   than converted into guessed numerical rules.
2. The fixed October snapshot fixtures preserve the previously unsafe cases:
   - ING Savings Maximiser: a prose $100,000 bonus cap was ignored by the bank
     picker even though the comparison rejected it. The conditional projection
     and combined-rate card are now unavailable; the supported base remains.
   - Defence Salute: a 5.50% row described as the total for the first 12 months
     was added to a 3.75% base and treated as permanent. This unsupported model
     is now unavailable, not replaced by a guessed offer.
   - RACQ's base-inclusive bonus wording and Teachers Mutual's conflicting base
     tier wording receive the same protection.
3. Structured account limits apply at opening and after every month's interest
   and contribution, including the final month. A plan that crosses a cap cannot
   silently auto-import a rate or keep a misleading graph.
4. Saved bank-derived rates require fresh, supported data. Stale, future, failed,
   missing or unsupported sources leave the rate unconfirmed and suppress the
   estimate until the visitor selects a supported account or enters a custom
   rate. The same provenance protection applies when switching providers or
   products. Genuinely user-entered saved rates remain intact.
5. General personal comparisons exclude explicit business-only and SMSF-only
   fixtures while preserving ordinary products with explicit dual eligibility.
6. Shared whole-balance tier boundaries select the upper tier. Unrounded balances
   falling into a fractional-cent gap are unsupported rather than assigned 0%.
7. Savings-goal and mortgage formulas use `log1p`/`expm1` to remain finite and
   continuous near a zero interest rate.

Public provider data is still dated, incomplete and subject to change. Source
data was not overwritten, retrieval dates were not advanced, and conditional
models still assume eligibility rather than assess it.

## Content and discovery

- Removed an unsupported educational qualification from the publisher
  description. No replacement credential or private biography was introduced.
- Recorded the material corrections publicly and updated methodology without
  implying that every financial-rule source was rechecked.
- Made two narrow corrections to the archived TFN guide: lawful recipients and
  eligibility for the Services Australia application path. The correction note
  explicitly says the whole archived guide was not reviewed again.
- Made the free cash-flow planner reachable from the complete tool directory,
  desktop/mobile “All tools” navigation and footer.
- Added an original fixed, replayable cash-flow walkthrough to the existing
  planner. With $400 opening cash, the listed example falls to −$525 before pay,
  despite finishing at $15,885. All inputs and limitations are visible in HTML;
  replay does not count as a visitor calculation or transmit financial inputs.
- Kept the working free planner indexable; excluded the unavailable paid concept
  using matching `noindex, follow` and sitemap rules. This is an honest unfinished-
  product decision, not an assertion that noindex guarantees AdSense compliance.
- Guide search remains hidden until JavaScript enhancement succeeds. Every guide
  link is available without JavaScript; enhanced search supports multiple words,
  announces counts and restores the library on Escape.

## Verification

- `npm test`: **228/228 pass**.
- `ASTRO_TELEMETRY_DISABLED=1 npm run build`: **pass**, 69 routes / 71 HTML files.
- `npm run check:readiness`: **pass**, 47 indexable/sitemap URLs, 17 money guides,
  116 bank snapshots, 609 products, 23 client-script syntax checks.
- Generated internal-fragment scan: **0 missing targets across 71 HTML files**.
- `git diff --check`: **pass**.
- Independent numerical review: 59,514 bank scenario calls across 574 fresh
  products, plus 156 production comparison cases. No non-finite result, negative
  interest, reconciliation, sorting or duplicate failure in that checked matrix.
- Independent controller review: nine bank-provenance scenarios using the real
  controller and generated calculator DOM passed, including fresh/stale/old/
  future/unsupported restores, custom recovery and provider/product switching.
- Committed regressions exercise the real controller against a fixed control
  fixture, including native DOM button submission, failed restores and caps.

### Hosted-preview browser checks

The separately authorized Cloudflare preview for commit `2aae6de` was opened at
`https://9af98574.howloop-site.pages.dev` in cloud Chrome. Actual pointer submission,
fixed-example replay, invalid-input recovery, keyboard submission, manual local
save, canceled and accepted restore, deletion and CSV download succeeded. Guide
search and product `noindex, follow` metadata matched the intended state. No ad or
analytics library appeared with essentials-only consent. The current 1180-pixel
viewport had no document overflow and was visually inspected. The independent
browser reviewer confirmed that ING's combined rate was unavailable and switching
to the unsupported Defence product cleared the calculation. Their empty-rate
wording observation was corrected in a narrow follow-up. The old bank-derived
estimate is now cleared immediately during revalidation, and a late bank response
cannot overwrite a newer custom rate. A deferred-response regression covers both
transitions. Editable planner tables are kept together before the separate fixed
case study.

### Checks not completed

- Full Astro type checking did **not run**: `@astrojs/check` is absent. The old
  command could print that error and exit zero; the new wrapper exits nonzero and
  never installs anything silently. Build and tests are separate checks.
- Visual browser QA of the local build was **blocked by the execution
  environment**, not passed: local Chromium could not create its socket, and the
  cloud browser could not open the localhost test URL. No alternate local route
  was used after the browser block. The hosted checks above are separate. Full mobile, print and JavaScript-disabled
  browser coverage remains to be completed before claiming those checks passed.
- This review does not verify current delivery to the public contact mailbox.

## Before production publication or re-review

1. Review the exact draft diff and any additional financial-audit findings.
2. Run independently authorized hosted-preview browser QA: bank selection and
   restore failures, manually entered rates, planner replay/update/cancel,
   save/restore/clear, CSV and print, mobile widths, navigation and JS-off content.
3. Verify a working public contact route and resolve the checker dependency gap
   if a full type-check pass is required for release.
4. After an authorized production deployment, verify the exact commit, pages,
   robots/canonicals/sitemap, metadata, and consent behavior on the live domain.
5. Only then consider Google indexing and AdSense review actions. Technical
   checks, traffic, article counts and these corrections do not guarantee approval.

## Reference sources

- [Australian Consumer Data Standards: rate tiers](https://consumerdatastandardsaustralia.github.io/standards/#tocSbankingproductratetierv4)
- [ING's published Savings Maximiser rate/cap explanation](https://newsroom.ing.com.au/ing-gives-savers-another-lift/)
- [Defence Bank transaction and savings rates](https://www.defencebank.com.au/tools-and-advice/rates-fees-and-charges/transactions-and-savings-accounts/)
- [OAIC: your tax file number](https://www.oaic.gov.au/privacy/your-privacy-rights/your-personal-information/your-tax-file-number)
- [ATO: resident TFN application options](https://www.ato.gov.au/individuals-and-families/tax-file-number/apply-for-a-tfn/australian-residents-tfn-application)
- [ASIC Moneysmart: how to do a budget](https://moneysmart.gov.au/budgeting/how-to-do-a-budget)
- [Google: creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## Independent hosted-preview QA evidence

Tested 5 October 2026, approximately 22:41–22:47 UTC, using the authorized
`9af98574.howloop-site.pages.dev` preview associated with head
`2aae6de9eee4234b8a28401cbeea78321ee36a69`. The browser did not itself expose a
commit identifier. Cloud Chrome reported a 1180 × 757 CSS-pixel viewport. Only
synthetic values were entered; no account, payment or financial-data submission
was performed. No merge or production deployment was performed.

### Independently verified interactions

- ING Savings Maximiser displays the 0.01% base and 5.49% published bonus row
  separately. No combined offer is selectable. Continuing uses the supported
  base only: $10,000 opening plus $500 monthly for ten years yields $70,040.
- Switching from that imported rate to Defence Salute shows the 5.50% and 3.75%
  rows separately and withholds a bank projection. Closing the picker leaves the
  rate empty and removes the preceding result and graph. Entering an explicit
  custom 4.5% rate restores a clearly labelled custom projection of $91,269.
- A custom 4.5% plan was saved, changed to 1.25%, and restored successfully even
  with the unsupported Defence product selected. A fresh Alex.Bank bank-origin
  plan was also saved, changed to a custom rate, and restored to its supported
  4.5% base with the appropriate provenance status.
- Alex.Bank Savings enforces its $250,000 cap after interest. With no deposits
  over one year, a $239,000 opening balance produces $249,980. Increasing the
  opening balance to $239,100 crosses the cap in the final month and removes the
  result and graph. Reducing it again restores the supported result. The
  extra-$50 comparison is separately withheld when it would cross the cap.
- The calculator's CSV download completed. Its actual bytes report $239,000.00
  deposits, $10,979.62 interest and $249,979.62 balance, matching the displayed
  rounded result. Clearing the synthetic saved plan removes its Restore control.
- The opened navigation menu's All tools link reaches `/start/`, where the payday
  planner is available. The footer planner link also opens the correct page.
- Guide search `salary super` returns one relevant guide; Escape clears the
  search and restores all 17 guides.
- The About page no longer presents the unsupported qualification. The paid
  concept plainly states that it is unavailable to buy and its live DOM includes
  `noindex, follow`. The free planner has its production canonical and no robots
  noindex directive in the observed DOM.
- Optional analytics stayed visibly off. The observed planner script tags
  contained local application/consent modules and no Google Analytics or ad
  script. This was a DOM check, not a full network-transmission audit. Captured
  warning/error logs contained browser-extension diagnostics but no site-origin
  warning/error in the inspected log set.

### Findings and limits

- Two follow-up issues were reported to engineering: misleading “Rate unchanged”
  wording beside a cleared bank rate, and the preceding result remaining visible
  during an asynchronous saved-bank revalidation. Completed revalidation was
  correct. A later fix must be distinguished from the original preview tested
  here and rechecked against its own preview.
- The Print plan control was activated, but cloud Chrome exposed no native print
  dialog, rendered print preview or output file. Printing is **not passed**.
- The documented browser capabilities expose no viewport resizing, device
  emulation, JavaScript disabling or network interception. Physical mobile,
  actual JavaScript-disabled rendering, stale/failed/future snapshot restore,
  and artificially delayed-response browser cases were **not tested**. Existing
  controller regressions are separate evidence, not browser coverage.
- The initial pre-enhancement page states exposed the static example and guide
  links, but this is not a substitute for a sustained JavaScript-disabled test.
  Restricted-business/SMSF filtering and archived TFN wording were not separately
  exercised in this independent browser pass.

### Follow-up preview recheck

The immutable `https://fa930dac.howloop-site.pages.dev` preview for source commit
`db14310fde917f3cb890d2b95dc00c3681301925` was independently rechecked on
5 October 2026 at approximately 22:49–22:51 UTC:

- Starting a saved ING restore immediately showed a blank rate, the checking
  message, result placeholders and no graph. The completed supported restore
  then showed the 0.01% base and $70,040 example result.
- A real asynchronous interaction was exercised: after Restore cleared the rate,
  entering a custom 2.5% before completion preserved 2.5% and the $80,923 result
  after the bank response, rather than replacing it with ING's base rate.
- Switching imported ING to Defence Salute now explicitly says no bank rate is
  applied and leaves result/graph empty. Entering a custom 4.5% recovers the
  $91,269 example. The synthetic saved plan was cleared after testing.
- Planner replay still produces −$525 / $15,885 with 13 weekly and 91 daily rows.
  Its editable result tables now precede the separate fixed case study.
- About and the public correction record show the intended final wording.

The broader mobile, JavaScript-disabled and native-print limitations above remain
unverified. A documentation-only evidence update after this source commit does
not change any runtime files; production publication still requires exact-head
review and deployment verification.
