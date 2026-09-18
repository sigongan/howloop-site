# Tax companion release

The public `/tax-return` guide works without a paid API. It is a guided educational checklist, not an AI-generated tax return or personal tax advice. Expense amounts are entered only in the browser for arithmetic and exports. No amounts are sent to the server. No TFNs, documents or account credentials are collected. Answers stay in page memory unless the visitor explicitly saves a draft in this browser. Downloads are created locally. Drafts include selected answers, added expenses and the unfinished expense form; restoring validates the stored data and recomputes expense arithmetic. The clear button removes only this app's draft. The first release has general preparation paths labelled 2024–25 and 2025–26, without year-specific tax rates or refund calculations. The expense organiser computes paid cost × user-entered work share minus work-use reimbursement in cents, with date and amount validation. This is an amount to review, not a claim calculation. It exports CSV and includes entries in the text checklist. Outside-scope users receive ATO self-lodgment links, not a claim that they must pay an agent.

## Optional AI — disabled until configured

The Pages Function `/api/tax-explain` returns `enabled: false` unless all settings below are present. The client does not show the optional AI panel while disabled. GET makes no model request. No real API calls were used to validate this release; the endpoint tests mock external services.

Before enabling, confirm the operator's API budget and chosen model, review general tax education scope, and evaluate the configured model's responses against the examples and boundaries in `src/data/tax-guide.mjs`. Set a provider spend control and Cloudflare request rate limits for this endpoint; Turnstile alone is not a billing cap. Never assume an account budget alert stops usage. Do not enable until the live credential/model path has been tested privately.

Configure in Cloudflare Pages → howloop-site → Settings → Variables and Secrets, initially for Preview only:

- `OPENAI_API_KEY` as a **secret**; never a PUBLIC variable or repository file.
- `OPENAI_MODEL`: the API model selected for cost and tested behavior.
- `TURNSTILE_SITE_KEY`: the site key for the actual hostnames.
- `TURNSTILE_SECRET_KEY` as a **secret**.
- `TAX_AI_ENABLED=true` only after the above readiness work.

Redeploy after configuration. Each general question requires explicit user consent and a validated Turnstile token with matching host and action. The function bounds input/output, refuses obvious personal numbers, uses server-owned notes and source links, sets `store: false`, and does not store or log prompts. This does not guarantee zero retention by infrastructure or OpenAI, and automatic input screening cannot detect all personal data. The UI tells users what leaves the browser. Model answers are rendered as text, not HTML. The guide's checklist is never sent with the question.

Sources: https://developers.openai.com/api/docs/guides/text · https://developers.cloudflare.com/pages/functions/get-started/ · https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ · https://www.tpb.gov.au/tpb-gs-14-2011-digital-service-providers-and-tax-agent-services-act-2009

Run `node --test tests/tax-guide.test.mjs`, `npm run build`, and `npm run check:readiness`. Browser checks should cover validation, scope boundaries, back navigation, preserved selections, download content, print layout and a mobile viewport. Source content changes need an actual source review; do not refresh the source-check date automatically on builds.

## Three-step interface

The guided flow is Situation → Work expenses → Checklist. The first step combines year, occupation and scope questions; no status is preselected. Record review is part of the final checklist. Source explanations and examples remain available in expandable panels. Users may proceed without entering expenses; exports distinguish costs to review from deductions. Closing or refreshing the page clears unsaved entries. An explicitly saved draft can be restored on this browser; edits are not automatically saved.
