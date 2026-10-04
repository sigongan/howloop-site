# Payday Planner: first owned-product increment

Date: 4 October 2026. Status: product prototype and free working preview; no sale,
checkout, preorder, buyer count, paid delivery or revenue claim.

## Intended customer and job

A household whose take-home income arrives on different schedules can have a
positive monthly total but a cash shortage between paydays. The job is to put
known amounts and dates on one calendar and inspect the low points. This is a
factual calendar/arithmetic workflow, not product advice, affordability approval,
a tax/benefits calculation, or a recommendation about a suitable cash buffer.

## Implemented, free

- Original 91-day engine and 13 seven-day summaries, all in integer AUD cents.
- Mixed weekly, fortnightly, monthly and one-off schedules, up to 40 entries.
- Monthly anchors retain their original calendar day; short months clamp.
- Opening cash, customer-chosen buffer, daily ledger, weekly totals, end-of-day
  minimum and separate bills-before-pay conservative minimum.
- Synthetic sample, blank-plan flow, explicit calculation, strict validation,
  opt-in save/restore/delete of one browser-local plan, safe daily CSV and print.
- Static worked example and assumptions remain readable without JavaScript.
- Additive links from home, calculator directory, take-home pay, emergency fund
  and savings goal. Existing calculators, methods and bank data are unchanged.
- A clear product page with a proposed A$19 one-time price. It says the paid kit
  is not available and differentiates planned extras from the free preview.

## Proposed paid deliverable, not yet implemented

A downloadable, reusable offline kit, built from this same testable engine:

1. Side-by-side regular-pay and lower-pay scenarios with an editable baseline.
2. A self-contained offline working copy with explicit JSON plan backups and
   validated restoration, so customers can reopen and reuse their work.
3. A printable payday checklist plus tested, plain setup/refresh instructions.

The paid value is the complete repeatable workflow, not taking away existing
free calculator or CSV features. The exact format and final feature list still
need to be finished and tested before a payment link can describe them as ready.
A$19 is a price hypothesis, not established willingness to pay or an approved
transaction. Optional positive feedback is not revenue or a purchase.

## Sale gates remaining

- Finish and QA the paid deliverable and its instructions, including offline,
  backup/restore, scenario comparison, print and support-boundary checks.
- Select an existing or owner-approved checkout/delivery provider. This repository
  currently has no payment links, webhook handlers, customer access or fulfillment.
- Approve final price/currency, seller identity, transaction/tax handling, legal
  terms, consumer/refund disclosures, and support destination before activation.
- Account creation, provider agreements, persistent credentials and any fees must
  follow owner authorization. No such account, cost or access grant is included.
- Test real fulfillment using the provider's supported test mode, then verify a
  permitted real transaction/delivery path before claiming that sales work.
- Demonstrate that relevant people reach the offer. Existing impressions, generic
  traffic or prototype feedback cannot establish product demand.

## Measurement and privacy

Reuses the existing analytics choice (`howloop-analytics-choice-v1`) and existing
measurement ID from the consent component. The helper accepts only an allowlist:

- `planner_demo_open`: explicit invitation click; fixed placement
- `planner_offer_open`: explicit click from demo to product page
- `planner_demo_calculate`: explicit successful form submission after rendering
- `planner_interest_yes` / `planner_interest_not_yet`: optional product feedback

Payload is only fixed product ID, allowlisted placement, sample/custom mode and
origin+pathname without a query string or fragment. There are no amounts, output
balances, shortfall indicators, dates, labels, free text or email addresses.
The existing initial GA configuration also now overrides page_location with origin + pathname and reduces page_referrer to origin, stripping query strings, fragments and URL credentials. These fields are documented by Google: https://developers.google.com/analytics/devguides/collection/ga4/reference/config. No GA account setting or enhanced-measurement collection is enabled or expanded. Network payload inspection remains part of preview QA; unit tests establish the code guards, not delivery or all provider behavior.

The helper returns without creating a queue or data layer when consent is absent,
denied, withdrawn, unreadable or the existing analytics wrapper is unavailable.
Initial rendering, save/restore and loading a sample are not activation events.
Optional feedback can be repeated after a page reload; do not treat event totals
as unique prospective buyers. No mailing list or notification subscription exists.

Financial entries are memory-only until explicit local save. Saved data is not
encrypted and can be viewed by someone sharing the browser profile. Downloads
contain the user's data. Labels render as text, and CSV neutralises spreadsheet
formula prefixes. No bank logins, uploads, external financial-data service, paid
AI calls or new secrets are used.

## Verification

Run `npm ci`, `npm test`, `npm run build`, `npm run check:readiness`.
The cloud shell needs `ASTRO_TELEMETRY_DISABLED=1` for build because it cannot
create Astro's user-config directory; that environment flag is not a code change.
The existing `npm run check` needs @astrojs/check and TypeScript, which were not
configured in the repository; an installation prompt is not a passed typecheck.

New checks cover date boundaries, month ends/leap years, timezone independence,
an independent recurring-date oracle, exact cents, negative/opening/zero limits,
CSV injection, consent gating and payload allowlists, stale/invalid/corrected UI,
manual persistence, corrupt/blocked storage, replacement cancellation, row limits,
text-safe labels, no initial activation and idempotent controller initialization.

Browser inspection of the Cloudflare branch preview is required before production.
The local shell cannot launch Chromium sockets and the cloud browser blocks
localhost. No production merge/deploy is part of this initial review increment.

### Initial review outcome

- 194 tests pass after the print-scope regression was added; clean `npm ci` was
  also verified before the final CSS-only correction.
- Build: 69 generated routes. Readiness: 48 indexable URLs, 17 money guides,
  116 bank snapshots, 609 products and 23 client scripts; no failures.
- Cloudflare built commit `3c7ef8a` successfully at
  https://9272a67c.howloop-site.pages.dev. Independent browser QA passed product
  navigation, calculation/validation, safe label rendering, manual
  save/restore/delete/cancellation, consent choices and a real CSV download.
- Desktop visual inspection found no document-level horizontal overflow or
  site-script errors at the available 1180px viewport. Browser-extension metadata
  errors are separate from site code.
- Browser DevTools is blocked by organization policy. True 320px device emulation
  and network payload capture were not verified; code/DOM checks must not be
  described as a network privacy audit. Responsive rules are implemented, but
  mobile visual QA remains an explicit pre-production verification gap.
- A final print-scope correction limits global header/footer hiding to the
  cash-flow page and omits promotional invitations from print. It does not change
  the interaction/controller behavior reviewed on the original preview commit.
