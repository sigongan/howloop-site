# Howloop: Antigravity / Gemini collaboration brief

Updated: 22 September 2026. This is a handoff document, not evidence that Gemini has reviewed the work.

## Product and current work

Howloop is a free Australian financial education and calculator site at https://howloop.how/. Repository: sigongan/howloop-site. Astro static build; GitHub main deploys through Cloudflare Pages. AdSense review was requested by the owner on 22 September 2026 and is pending. Do not submit another review or enable advertising as part of this task.

The owner wants a simple mobile interface, large readable text, useful calculators, and explanations that a financial beginner can understand. The latest request is to prioritise languages widely used at home in Australia. ABS 2021 Census data is the latest released population result; 2026 results start in June 2027. Prioritise Mandarin/Chinese, Arabic, Vietnamese, Cantonese/Chinese and Punjabi. Chinese simplified/traditional are script choices, not exact mappings to Mandarin/Cantonese. Spanish and Korean are additional requested/community options, not higher in the Census ranking.

This change adds language selection, five basic translated calculators, a compound-interest example, Arabic right-to-left layout and tab-local input preservation. These pages reuse the existing financial engines. Bank descriptions, terms and full English guides are explicitly labelled as English. Translation text is AI-assisted; there is no claim of human native-speaker certification. No runtime translation API or new third-party tracking is required.

## Workspaces and coordination

Codex's workspace: C:/Users/suwon/Documents/Codex/2026-09-18/hi/work/howloop-languages.
Baseline main: 65fae4ccc91214cad677cc3d5f62802378250d01.
Review branch: codex/australian-community-languages. Check the branch or merged pull request for the latest revision before starting.
Do not edit this active workspace at the same time as Codex. For a code review, read it without changing files. For fixes, use a separate checkout/branch from the published review commit. Do not reset the old howloop-finance folder: it contains unrelated uncommitted work. Never force-push or replace main.

## Bounded Gemini review task

1. Review src/data/languages/*.json against the English meanings. Prioritise Arabic, Punjabi, simplified/traditional Chinese and Vietnamese. Check that tax, super, interest, extra repayments and assumptions retain their meaning. Do not silently change formulas or claim professional translation approval.
2. Inspect mobile widths 320, 390 and 430px and desktop 1280px. Check long translated labels, Arabic direction, readable amounts, keyboard focus and language selection. Check 200% text sizing where supported.
3. Verify changing language preserves numbers, switching tools works, zero and invalid inputs are handled, and no private input enters URLs or network requests. Test both reduced-motion and disabled storage if practical.
4. Review static HTML language, canonical/alternate links, truthful language coverage and links to the English source tools. Do not invent page-count or word-count rules for AdSense.
5. Write findings to docs/reviews/gemini-language-review.md in your own checkout, or provide that report to the owner. Each finding should include severity, file, exact wording/problem, reproduction steps and a suggested correction. Distinguish a verified defect from a style preference. If no issue is found, state the actual scope checked.

Codex will reconcile findings, apply justified fixes and run the build/tests before any subsequent publication. A Gemini pass is additional review, not a substitute for independent calculation tests or language expertise.

## Sources

- https://www.abs.gov.au/statistics/people/people-and-communities/cultural-diversity-census/2021
- https://www.abs.gov.au/statistics/research/2026-census-topics-and-data-release-plan
- https://support.google.com/adsense/answer/9727?hl=en
- https://www.antigravity.google/docs/features

## Verification status

Recorded local verification on 22 September 2026:

- All 102 automated tests passed, including independent financial examples, translation-key completeness, Arabic/Punjabi numeral entry, supported grouping styles, invalid inputs and expiring handoff state.
- Static build passed. Readiness checks passed with 42 indexable pages and 42 matching sitemap entries. These checks do not predict AdSense approval.
- Browser checks covered all five calculator selections; a zero-interest loan; super-included pay; no-contribution emergency-fund messaging; invalid inputs; Korean-to-Chinese and Arabic-to-Punjabi input preservation; and original English mortgage-to-Korean transfer.
- Mobile screenshots and layout checks covered 320px Arabic/Punjabi, approximately 390px main-site navigation and desktop 1280px. The existing mobile Home loans link opened the correct calculator. Broader 430px/200% text, disabled-storage and native-speaker review remain useful review tasks; do not claim they were completed.
- Build and deployment status for the published commit is tracked on its GitHub pull request. This local record alone is not evidence of production deployment or a Gemini review.
