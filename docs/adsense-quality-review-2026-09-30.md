# Howloop quality and readiness review — 30 September 2026

## Evidence reviewed

The signed-in AdSense site detail page still reports **Needs attention / Low value content**. ads.txt is authorised. The reported update was 30 September 2026, 7:30 AM AEST. This does not identify a specific offending page or prove an exclusively automated review. No re-review was submitted during this work.

The current Google guidance prioritises useful original content, clear navigation, an accurate publisher identity and maintained content. It does not prescribe 20 articles, 1,500 words per article or a fixed traffic minimum. No approval outcome can be inferred from passing a technical checklist.

Primary pages opened/reviewed in this audit:

- https://support.google.com/adsense/answer/10015918?hl=en — useful, unique content and experience.
- https://support.google.com/adsense/answer/7299563?hl=en — site readiness and navigation.
- https://support.google.com/publisherpolicies/answer/11112688?hl=en — low-value inventory and content review.
- https://support.google.com/publisherpolicies/answer/10502938?hl=en — honest publisher and product representations.
- https://support.google.com/adsense/answer/1348695?hl=en — privacy disclosures.
- https://support.google.com/adsense/answer/13554116?hl=en — certified consent requirements for applicable ad audiences.
- https://support.google.com/adsense/answer/12176698?hl=en — site connection and crawler access.
- https://support.google.com/adsense/answer/9727?hl=en — supported languages.
- https://moneysmart.gov.au/banking/savings-accounts — bonus eligibility, introductory offers, fees and linked accounts. Page dated 30 July 2026.

The earlier benchmark review is in adsense-sep30-content-review.md. Visible advertising is evidence of advertising, not access to another publisher's private AdSense approval decision. Benchmark principles were used without copying prose or design wholesale.

## Changes made

1. A savings account with a supported bonus scenario now shows **base-rate interest and all-conditions-met interest side by side**, for identical inputs and periods. Bonus requirements are displayed before the long collapsed terms. A published structured deposit minimum is a reminder, not a pass/fail eligibility assessment.
2. Source eligibility and balance restrictions appear beside the comparison results and in server-rendered snapshot cards. Missing eligibility text remains explicitly unknown. Up to three excerpts are shown; the full supplied terms remain available. This is not a complete eligibility checklist.
3. Bank comparison search reuses the bank alias matcher. Partial queries such as common, CBA and common goal find relevant accounts while preserving the interest ranking. Account-name searches still work.
4. About explains the current free service, its operator background, AI assistance, source practices, and the absence of commissions or paid rankings. It does not invent a licensed reviewer or guarantee advice.
5. The 17 money guides use intentional next-reading links rather than the first two arbitrary guides from the same category.
6. Two legacy archive pages no longer render a five-step sidebar or structured-data URLs pointing to missing fragments. Regular five-step guides retain their valid targets.

No paid AI service was enabled. No calculator formulas, bank snapshot data or financial source-check dates were changed for this release. No advertising or consent-system activation was claimed.

## Verification

- 141 tests passed, including independent compound-interest examples and bank-search regression cases.
- Astro static build passed: 67 route pages, 69 HTML files including generated redirects.
- Readiness passed: 46 indexable/sitemap URLs, 17 money guides and client-script syntax checks.
- The rendered internal-fragment scan found zero missing targets (previously ten).
- Browser: conditional MoveBank results showed base interest $10.00 versus $579.86 for $10,000 over 12 months, before fees and tax; a $200 published deposit requirement remained visible against the $0 example contribution. This is an assumption-based illustration, not a claim that a user receives the bonus.
- Browser: common goal returned CommBank GoalSaver. Temporary 320- and 390-pixel viewport checks had no document horizontal overflow; bonus panels retained 18px body text and stacked figures.
- Static HTML includes the snapshot figures and source eligibility text without executing JavaScript.
- Independent read-only review compared 276 snapshot outcomes over 3, 6 and 12 months and found no blocking numerical or eligibility-representation defect.

## Search Console observation — not a visitor count

The 28-day Web Search report covered 31 August–27 September 2026: **16 clicks, 492 impressions, 3.3% CTR, average position 51.7**. Clicks are search interactions, not distinct visitors; owner activity cannot be identified from this report alone.

The submitted sitemap-index.xml had status **Success**, last read 30 September 2026, with 42 discovered pages. The current local sitemap contains 46 indexable URLs; Search Console counts and index coverage are processed asynchronously and do not establish that every current page is indexed.

The Page Indexing report was dated 21 September and showed 53 indexed / 23 excluded URLs. Two reported redirect errors were slashless /learn and /calculators/compound-interest URLs last crawled 18 September. Their validation was already started on 30 September before this audit. Direct browser visits currently redirect to the proper trailing-slash pages and display working content. No speculative redirect rewrite or redundant validation was performed.

## Remaining limits and next priorities

- The bank manifest was collected on 27 September UTC / 28 September Brisbane, not checked afresh on this release date. Provider feed failures and stale entries remain visible and excluded from automatic comparison where required. Do not relabel these as verified or fill gaps by guessing.
- Actual finance search discovery remains limited; older non-finance queries still appear. Priority is useful Australian finance examples and real user feedback, rather than fabricated traffic or extra near-duplicate articles.
- Request re-review only after inspecting the deployed experience and confirming the changes are meaningful. This review improves readiness; it does not certify approval or resolve an unpublished Google-specific reason.
