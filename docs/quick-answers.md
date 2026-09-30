# Prepared quick answers

The `/help/` directory and contextual panels use original prepared explanations, not AI-generated replies. Questions, examples, actions and sources are rendered in the initial HTML. Native details work without JavaScript; local search and topic filters appear after their script starts. Unknown searches show an honest empty result and a reset, rather than inventing an answer.

The search script makes no requests, stores no search terms and does not add them to URLs. No OpenAI configuration or paid API call is needed or changed. Calculator inputs, tax entries and uploaded documents are not used by this help feature. Numeric examples are hypothetical; calculator arithmetic remains in the existing deterministic tools.

Content lives in `src/data/quick-answers.mjs`, with independent source links and dates. Moneysmart pages were opened and reviewed on 30 September 2026. ATO dates preserve earlier source reviews recorded in the existing tax guide: direct and printable-page attempts during this work returned HTTP 403, so indexed extracts were not marked as a fresh live review. Do not update these dates on every build. Tax answers do not approve deductions, calculate refunds or lodge returns.

Validate local matching with `node --test tests/quick-answers.test.mjs`; build and run `npm run check:readiness`. Browser checks cover partial words, topic/query intersection, an unsupported question, reset, native keyboard disclosure, small-screen wrapping and links back to real tools.
