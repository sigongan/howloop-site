# Payday planner usability follow-up — 13 October 2026

Base: `facd646478d97bed5890a717585f360440bdaf1b`. The existing workspaces and newer homepage are preserved.

## Changes a visitor can use

- The homepage's rent-before-pay example now opens those same two entries in the planner: A$400 opening cash, A$650 rent on 12 October and A$2,200 pay on 14 October. The independent arithmetic is A$400 − A$650 = −A$250; then −A$250 + A$2,200 = A$1,950. These fixed illustrative dates are labelled as an example. The URL carries only a public preset ID, never a visitor's amounts.
- Returning visitors are told to restore their plan, update its first day, opening cash and payment dates, then recalculate and save explicitly. Restoring a past start date displays a reminder without changing the stored plan. The existing 13-week and timing examples remain available; the calculation engine is unchanged.
- Learn keeps the short visual explanation and tool action first, then opens the existing full guide by default. This improves discovery of the substantive explanation; it is not a claim that Google cannot read closed HTML details.

## Official-source wording follow-up

The negative-gearing policy note now says **at or after** 7:30 pm AEST on 12 May 2026 and specifies when the purchase contract was entered into, rather than settlement. [Tax Reform No. 1 Act 2026](https://www.legislation.gov.au/C2026A00049/asmade), Schedule 2, inserted section 26-155(2)(a) and (3), supports this boundary. A contract at 7:29 pm is before the boundary; one at 7:30 pm is at it. Other eligibility, property-type and transition rules still matter. The existing 2027–28 application date and 12 October source-check date are retained from the official-source review.

The latest bank manifest reports collection at 2026-10-11T23:43:37.194Z; [the scheduled refresh](https://github.com/sigongan/howloop-site/actions/runs/38185335007) succeeded. This change does not collect new bank quotes or replace bank snapshots.

## Release scope

Regression tests cover the exact preset result, existing example switching, saved-data preservation and reminder clearing. Build, readiness and rendered-browser checks are recorded with the pull request. No paid API, new tracking, financial transaction or AdSense review request is part of this release. Technical checks do not predict approval or earnings.
