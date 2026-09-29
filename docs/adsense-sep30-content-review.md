# Howloop re-review preparation — 30 September 2026

The account’s site detail reports **Low value content**, with ads.txt authorized. Google did not identify an individual offending page. This is evidence of the review result, not evidence that a particular calculator or article caused it. Re-review has not been requested during this work.

## Benchmarks and their limits

- [Finance In Your Pocket](https://www.financeinyourpocket.com/about) publicly describes AdSense as support for its free finance tools. Its compound-interest page loads Google’s adsbygoogle script with publisher ID ca-pub-8433525895546261. During inspection, the ad slot was unfilled. Its private approval status cannot be independently established from this observation. Useful patterns: original worked comparisons, assumptions alongside results, an identified maintainer, and a clear path from explanation to tool.
- [The Calculator Site](https://www.thecalculatorsite.com/finance/calculators/compoundinterestcalculator.php) has worked examples, author/reviewer details, formulas, sources and feedback. Its footer identifies it as a Raptive partner site, so it is not evidence of AdSense approval. It is a usability and content benchmark.
- [Google’s page-readiness guidance](https://support.google.com/adsense/answer/7299563?hl=en) emphasizes unique relevant content and usable navigation. It does not set a required article count, word count or traffic minimum. Matching another site’s design or content volume does not establish approval eligibility.

No competitor prose or design was copied. Howloop’s examples use its own numerical models and scenarios for Australian household decisions.

## Improvements

- Three new original decision guides with adjustable, browser-only examples: bonus versus introductory savings rates; offset fees and rate-premium break-even; cash salary versus a package including super.
- Six calculator pages gain inline examples showing what their numbers mean, assumptions and a useful next step.
- Core calculation explanations are visible in static HTML; FAQs remain collapsible to keep the calculator easy to use.
- A three-step offset illustration explicitly preserves the $600,000 debt while showing a $560,000 interest-calculation balance.
- Homepage and Learn navigation surface the new comparisons.
- Fixed an unescaped apostrophe in the LVR client script.

## Source handling

For new guides, opened and read ASIC Moneysmart’s savings accounts, compound interest, mortgage offset accounts and superannuation guidance. Source review dates apply only to those linked sources. The 12% package example shows gross cash only and does not introduce a new PAYG scale. The existing offset guide retains its earlier source-check date while recording the illustration change.

Examples are hypothetical; they are not current bank offers, personal eligibility checks or rate forecasts. Actual bank data, its retrieval dates, provider failures, consent settings and analytics configuration are unchanged.

## Validation and re-review gate

Run `npm test`, `npm run build`, and `npm run check:readiness`. The comparison tests use independent closed-form future-value calculations and arithmetic checks. Inspect mobile inputs, invalid states, decimal-comma rate entry, and the LVR result in the browser. Confirm deployed pages, sitemap inclusion and client scripts before requesting re-review.

The technical gate cannot verify content quality to Google’s satisfaction, real visitor interest, private Search Console indexing, ownership, email delivery or AdSense approval. Do not label the site approved or guarantee a result. Re-review should wait until the remaining observed problems are resolved; the user has explicitly said it need not be submitted today.

## Further policy and static-content review, 30 September

The review found no evidence that generic legal paragraphs or mandatory article/word counts were missing. A concrete privacy gap was unconditional GA4 loading. Google's [EU user consent policy](https://www.google.com/about/company/user-consent-policy/) requires consent where legally required and clear withdrawal instructions. Optional GA4 now stays unloaded until analytics opt-in, with equally styled choices, device-only consent records, withdrawal controls and cookie cleanup. These controls concern analytics only; they do not replace a certified advertising CMP. Ads remain disabled.

The savings comparison now includes three dated account examples in its initial HTML, calculated with the existing model for $10,000, no added deposits and twelve months of base interest. Retrieval dates, conditions, costs and limits are readable before JavaScript. The interactive model rechecks freshness and replaces these examples. A failed data request retains the explicitly dated fallback; invalid user inputs clear results. Static examples are not a claim that rates remain current after publication.

Replaced two raw ATO JSON source links with verified reader-facing articles. Clothing guidance, mobile-device guidance and home-internet guidance were individually opened and checked on 30 September; only those source items receive a new review date. Added explicit checks for phone costs included in the WFH fixed rate and handset costs bundled with usage. Clarified that the $300 FAQ refers to the supported earlier income years. General review dates and supported tax years are unchanged.

Validation: 122 tests pass, 66 Astro pages build, and the technical gate passes. Browser checks cover analytics rejection, grant, withdrawal, persistence across pages and Korean mobile controls. No claim of Google approval or of the actual rejection cause is made for these privacy changes. Re-review remains deferred.
