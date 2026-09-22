# Multilingual review response — 22 September 2026

The owner relayed an external review of the multilingual release. This follow-up addresses its five requested changes.

| Finding | Change |
| --- | --- |
| Decimal comma keyboards | Accept one comma followed by one or two fractional digits. Keep Australian and Indian grouped thousands intact, and reject malformed mixed separators. Update input hints in all eight languages. |
| Arabic year agreement | Use a labelled duration in years so the wording works for one, two, fractional and larger year values. The same one-year wording issue found in English and Spanish was corrected. |
| Narrow language menu | Use one column at widths of 360px and below, retaining scroll access to every language. |
| Enlarged illustration text | Replace fixed heights and clipping with minimum heights and wrapping. Allow the English-site header link to shrink and wrap at enlarged text sizes. |
| Arabic direction | Mirror the decorative navigation and button arrows on RTL pages only. |

Verification performed:
- All 103 automated tests passed, including a new decimal-comma calculation and language-state regression case. The final copy changes also passed the seven focused language tests.
- Astro built 63 pages successfully. Readiness and static language-page checks passed: 42 indexable pages and matching sitemap URLs, with language/direction/canonical/alternate metadata preserved.
- Browser: Spanish inputs 1000,25 / 0,00 / 4,5 / 1 produced AUD 1046.20 and retained their numeric meaning after switching to Vietnamese.
- Browser at a 320px CSS viewport: the language menu displayed one column; long English language labels remained readable.
- Browser: Arabic showed the revised 30-year duration and mirrored visible arrows.
- Local-only copies of the built English and Arabic pages used a 32px root font (200% of the normal 16px). At 320px, all three illustrated numbers were fully within their containers and the page did not overflow horizontally. These fixtures are in ignored build output and are not published.
- These checks exercise typed decimal-comma input and enlarged text, not a physical iPhone keyboard or a complete WCAG audit.

No financial formula, bank snapshot or advertising setting was changed.
