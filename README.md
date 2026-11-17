# Howloop — kitchen science, explained by a working chef

The public website is https://howloop.how: a text-first food-science site written by Jess Baek, a professional chef in Queensland, Australia. Each article answers one everyday cooking question (eggs, meat, fruit and veg, heat and browning, sauces and seasoning), explains the science in plain English and lists its sources.

The site is a static build with **no npm dependencies**, deployed by the existing Cloudflare Pages project (build command `npm run build`, output directory `dist`).

## Commands

Node 20 or newer.

```sh
npm test                 # unit tests (site renderer + archived playground)
npm run build            # builds dist/
npm run check:readiness  # AdSense/site-quality checks on dist/ (must pass before requesting review)
npm run dev              # serves dist/ on http://127.0.0.1:4325
```

## Where things live

| Path | What it is |
|---|---|
| `site/content/articles/*.md` | Articles. File name = URL slug (`/why-onions-make-you-cry/`). |
| `site/content/pages/*.md` | About, Contact, Privacy, Terms, Editorial policy. |
| `site/site.config.mjs` | Site name, author, AdSense publisher ID, topics and topic intros. |
| `site/static/` | Copied as-is: CSS, icons, share image, `_headers`, `_redirects`. |
| `scripts/build.mjs` | Static site generator (home, topics, articles, sitemap, RSS, robots, ads.txt). |
| `scripts/markdown.mjs` | Small Markdown renderer (headings, lists, tables, `:::callouts`, links). |
| `scripts/check.mjs` | Readiness checker: publisher code on every page, required policy pages, no broken internal links, ≥900 words per article, sources on every article, sitemap coverage. |
| `scripts/make-icons.py` | Regenerates favicon, logo PNG and default share image (needs Pillow). |

## Writing an article

Create `site/content/articles/<slug>.md`:

```markdown
---
title: Why Something Happens — and What to Do About It
description: One or two sentences (80–220 characters) used for search results and cards.
category: eggs            # eggs | meat | fruit-and-veg | heat | sauces-and-seasoning
order: 5                  # position within the topic
published: 2026-11-18
updated: 2026-12-01       # optional; set when you materially change an article
summary:
  - Three short "In short" bullets.
  - ...
---
Intro paragraph...

## Section heading

Body text. Use :::chef, :::tip or :::safety blocks for callouts.

## Sources

- Book, paper (with DOI link) or official page the claims rest on.
```

Keep articles original and useful: at least ~900 words of real explanation, sources for every factual claim, and no invented personal anecdotes or test results. Food-safety statements should match official guidance (FSANZ, USDA FSIS).

## AdSense

- Publisher: `ca-pub-9777958537717885` (set in `site/site.config.mjs`). Every page carries the `google-adsense-account` meta tag and the Auto ads script; `dist/ads.txt` is generated from the same ID.
- The privacy policy contains Google's required advertising-cookie disclosures and opt-out links.
- `_headers` deliberately has no restrictive `script-src` CSP, because AdSense loads scripts and frames from many Google domains.
- Turn on Google's consent message (AdSense → Privacy & messaging → European regulations) before serving ads to UK/EEA visitors.

## Archived: the children's fruit playground

The previous version of howloop.how — a WebGL fruit playground for children with an iPhone prototype — is kept in this repository but **is not deployed**. Image- and interaction-heavy pages with little text, aimed at children, are a poor fit for AdSense review.

- Web playground source: `playground/` (tests in `tests/` still run).
- Shared lesson content: `shared/*.json` (also used by `ios/FruitLab`).
- Local preview: `npm run build:playground && npm run dev:playground`.

Old playground URLs (`/learn/…`, `/grown-ups/`) redirect to the new site. Earlier versions (finance tools, Astro guides) remain in Git history.
