# Howloop — Australian money tools

An Astro static site for howloop.how, retaining the existing GitHub → Cloudflare Pages flow.

## Run

Node 22; npm ci; npm run dev; npm run build (output: dist). Existing lockfile retained. No accounts, paid APIs or databases required.

## Features

- Four client-side calculators: compound interest with public bank base rates, mortgage and offset, savings goals, emergency funds.
- Public CDR banking-brand explorer, dated product snapshots, explicit unavailable and partial states.
- Six original money guides, methodology, about, contact, editorial, privacy and terms pages.
- Device-local opt-in plan save/restore/delete and CSV export.
- Previous guide URLs and existing private trading utilities remain intact; the new public navigation focuses on money education.

## Rate data

Run npm run refresh:rates to fetch the government CDR banking-brand register and available current transaction/savings product detail feeds. The collector writes src/data/banks.json and public/data/banks*.json. Commit updated snapshots and deploy via the existing workflow. It does not create a scheduled job. Retrieval dates are preserved when a feed fails, and the UI flags snapshots older than seven days. No claim of live rates or whole-market coverage.

Only unambiguous base variable rates and supported full-coverage dollar tiers are automatically modelled. Bonus/introductory components are displayed, not automatically combined. Manual rates remain constant for the projection. Product eligibility and fees must be checked with the provider. Product feeds may contain specialised products.

## AdSense preparation

Set PUBLIC_ADSENSE_PUBLISHER_ID to the actual ca-pub- plus 16-digit publisher ID to emit the Google verification meta tag and ads.txt. No placeholder ID is emitted. Ad serving stays disabled: verification is separate from loading ads. After approval, configure appropriate consent controls (including a Google-certified CMP where required), review actual privacy disclosures, and then implement ad serving deliberately. Never assume approval from page count or design.

Before requesting Google review: verify that hello@howloop.how actually receives mail, check all live pages, complete the account tasks, add the live domain to AdSense, and submit the sitemap in Search Console. Google makes the approval decision. This code cannot verify inbox delivery or complete account identity/payment tasks.

Official guidance:
- https://support.google.com/adsense/answer/7299563
- https://support.google.com/adsense/answer/7584263
- https://support.google.com/adsense/answer/1348695
- https://support.google.com/adsense/answer/13554116

## Verification

npm test runs the financial engine and existing trading-engine tests. npm run build generates all static routes. Calculator assumptions are published at /methodology. Browser QA should check custom rates, bank selection, invalid/zero inputs, save/restore/clear, CSV, and mobile layouts.

The Windows sandbox used to author this revision required a local WebAssembly esbuild adapter. That adaptation is confined to ignored node_modules and is not part of this project or its dependency manifest; normal Cloudflare/Linux builds use the existing native esbuild dependencies.
