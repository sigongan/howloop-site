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

- `npm test`: **227/227 pass**.
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

### Checks not completed

- Full Astro type checking did **not run**: `@astrojs/check` is absent. The old
  command could print that error and exit zero; the new wrapper exits nonzero and
  never installs anything silently. Build and tests are separate checks.
- Visual browser QA of the local edited build was **blocked by the execution
  environment**, not passed: local Chromium could not create its socket, and the
  cloud browser could not open the localhost test URL. No alternate local route
  was used after the browser block. DOM tests do not establish responsive layout,
  real pointer hit targets, printing or download behavior in a browser.
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
