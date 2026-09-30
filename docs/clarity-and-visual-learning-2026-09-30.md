# Clearer free tools and visual learning — 30 September 2026

## User problem

Phone screenshots showed a large dark result card and excessive whitespace before calculator inputs. The homepage repeated promotional-looking panels, and longer education pages required too much reading before the key idea was clear.

## Release changes

- Homepage: plainly identifies free Australian money tools; its first chooser links directly to savings, take-home pay, home loans, tax preparation and lessons. Removed duplicate tool promotion panels. The working savings example uses a restrained light result surface. Bank-provider independence, the project's purpose, calculation methods and contact links are visible.
- Shared frame: compact 64px mobile header with full-size touch controls, soft neutral background and a light informational footer. The existing money-loop logo and routes remain.
- Calculators: mobile inputs precede a normal, static results section; paired fields share a row at 380px and above. Labels use simpler words, with 18px body/field text and 54px input targets. Savings and salary results use quiet white/mint/blue surfaces rather than dark neon emphasis. No formulas or input names changed.
- Visual learning: reusable compound-interest, full-offset and cash-salary/super stories. Every step is in server-rendered HTML. Readers can move manually or explicitly start a short animation sequence; Play becomes Pause while active and stops at the last step. Reduced-motion users retain manual controls without autoplay. No API calls, accounts or image/video services are required.
- Compound story uses an explicitly illustrative 10% yearly example: $100 → $110 → $121, with $10 then $11 interest. Its short check uses the same numbers. The full guide retains the separate original 5% example and its assumptions.
- Offset story shows $600,000 debt, $40,000 separate cash, and $560,000 used to work out interest. The actual debt remains labelled $600,000.
- Salary story explains package including super versus cash salary plus super without introducing new tax rates. Its short check tests that distinction; the full worked calculation remains optional.
- Learn landing: three illustrated entry points plus the searchable original library. Detailed explanations, original examples, sources and check dates remain in the HTML and accessible disclosures. Hash links open containing disclosures.
- Compound and mortgage calculators put the short picture lesson ahead of FAQ lists; further worked examples and formula explanations are optional disclosures.

## Verification

- 141 existing tests passed; no financial math was changed.
- Astro static build passed: 67 route pages; readiness check passed with 46 indexable sitemap URLs and 17 money guides.
- Browser at CSS width 391px: the homepage displayed four tool cards in two columns plus a lessons row. Calculator input labels and controls were 18px; paired inputs shared the same top position. Inputs precede the results, which are static.
- Browser at CSS width 320px: offset cash/debt illustrations and controls had no document horizontal overflow; main explanatory text was 18px.
- Browser numerical check: $1,000, no deposits, 0% interest, one year produced $1,000.
- Browser learning checks: Next showed $110 then $121; explicitly started playback reached step 3 and stopped with Replay; the compound quiz explained 10% of $110 = $11. The offset's final step kept actual loan debt $600,000. Source-link navigation opened the source disclosure.
- Static HTML inspection retained all three teaching steps, the full guide sections and original source-check dates. Component syntax, CSS parsing, client script syntax and a read-only lesson state-transition check passed.

These are usability and education changes, not a financial-policy refresh or AdSense approval claim. Bank collection dates and financial source-check dates were not changed. AdSense re-review was not submitted.
