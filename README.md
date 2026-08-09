# Howloop

> How-to, on loop.

Short looping SVG animations that show how to fix everyday household and device
problems. Built with Astro, deployed on Cloudflare Pages, monetised with Google
AdSense.

Verified: `npm run build` produces 16 pages, ~590 KB total, zero runtime
dependencies beyond one 3 KB player script.

---

## 1. Run it locally

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in ./dist
npm run preview  # serve ./dist locally
```

Node 18+ required.

---

## 2. Get the domain

1. Cloudflare dashboard → **Domain Registration → Register Domain**
2. Search `howloop.com`. If it's taken, the fallbacks in order of preference:
   `howloop.co`, `gethowloop.com`, `howloop.app`, `howloop.io`
3. Once registered, update the domain in **two** places:
   - `src/consts.ts` → `SITE.url` and `SITE.domain`
   - `astro.config.mjs` → `site`
   - `public/robots.txt` → the `Sitemap:` line

Set up email forwarding for `hello@howloop.com` under Cloudflare → **Email →
Email Routing** (free). AdSense reviewers do check that the contact route works.

---

## 3. Deploy to Cloudflare Pages

```bash
git init && git add -A && git commit -m "Howloop v1"
gh repo create howloop --private --source=. --push   # or push to GitHub manually
```

Then in the Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect
to Git**:

| Setting | Value |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version env var | `NODE_VERSION` = `22` |

Add the custom domain under **Custom domains** once the build is green.
`public/_headers` already sets caching and security headers.

---

## 4. AdSense checklist

The site is built so that **no ad code is served until you switch it on.**

**Before applying:**

- [ ] Domain registered and connected, HTTPS live
- [ ] `hello@howloop.com` receiving mail
- [ ] 15–20 guides published (you have 6 — see `CONTENT-ROADMAP.md`)
- [ ] Site verified in Google Search Console, sitemap submitted
      (`https://howloop.com/sitemap-index.xml`)
- [ ] Some organic traffic arriving — AdSense rejects sites with none

Required pages are already written and linked in the footer: `/about`,
`/contact`, `/privacy`, `/terms`, `/editorial-policy`.

**After approval:**

1. Paste your publisher ID into `src/consts.ts`:
   ```ts
   adsensePublisherId: 'ca-pub-XXXXXXXXXXXXXXXX',
   ```
   That single line switches on the AdSense script in `<head>` **and** every
   `<AdSlot />` on the site. Leave it empty and nothing ad-related is emitted.

2. Create ad units in AdSense and put their slot IDs into the `slot` prop:
   ```astro
   <AdSlot layout="in-article" slot="1234567890" />
   ```

3. Add `public/ads.txt`:
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```

4. If you serve the EEA/UK, turn on a consent management platform in AdSense →
   Privacy & messaging. This is mandatory there, and `/privacy` already
   describes it.

---

## 5. Writing a new guide

Two files per guide.

**a) The animation** — `src/animations/YourThing.astro`

One SVG plus scoped CSS. The pattern is always the same: draw the default state,
then write rules for each step.

```css
/* the shape's resting state */
.yt .lid { transition: transform 0.7s cubic-bezier(0.65, 0, 0.35, 1); }

/* what it does on step 2 */
:global([data-step='2']) .yt .lid { transform: translateY(-40px); }
```

`AnimStage` puts `data-step="0…n"` on the stage wrapper and the CSS reacts. That
means every step is a real addressable state — it scrubs, pauses and loops for
free, and the caption can never fall out of sync with the drawing.

Colour convention: **green** = correct path, direction of flow, success.
**orange** = the part the reader physically touches. Ink linework for everything
else.

**b) The guide** — `src/content/guides/your-slug.mdx`

Copy an existing one. The `steps` array in the frontmatter is used four times:
the animation captions, the written step list, the sidebar, and the `HowTo`
structured data. Write it once, carefully.

```mdx
<AnimStage id="yt" label="…" steps={frontmatter.steps} pace={3000}>
  <YourThing />
</AnimStage>
```

Set `draft: true` to keep something out of the build.

---

## 6. Project structure

```
src/
  consts.ts              brand, nav, topics, AdSense ID — change things here
  content.config.ts      guide frontmatter schema
  content/guides/*.mdx   the guides
  animations/*.astro     one SVG animation per guide
  components/
    AnimStage.astro      the step player (the core of the site)
    AdSlot.astro         renders nothing until AdSense is switched on
    Callout.astro        tip / warn / stop boxes
    GuideCard.astro      listing card
    Header, Footer, Logo
  layouts/
    Base.astro           <head>, meta, OG, JSON-LD, AdSense loader
    Prose.astro          static pages
  pages/
    index, guides/, topics/[topic], about, contact, privacy, terms,
    editorial-policy, 404, rss.xml.js
public/
  favicon.svg  og-default.svg  robots.txt  _headers
```

---

## 7. Notes on the design

- **Warm paper, not white.** `#fbfaf7` with ink `#14171c`. Deliberately not
  another blue how-to site.
- **Two accents, each with a meaning.** Green `#0d9b6c` for motion and the
  correct path; orange `#ee6c1e` for the thing you act on. If a colour doesn't
  mean something, it's not in the palette.
- **One webfont**, Space Grotesk, headings only, `display=swap`. Body copy is the
  system stack, so first paint never waits.
- **Motion respects `prefers-reduced-motion`.** Autoplay is off for those users
  and every step stays reachable by button.
- **Animations only run on screen.** An `IntersectionObserver` stops the timer
  when the player scrolls out of view.
