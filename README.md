# Howloop — a little food playground

A dependency-free web playground and native iPhone prototype sharing one set of learning content. The public website is https://howloop.how. The web brand remains **Howloop** with a lemon mark and the Korean subtitle **어린이 식재료 놀이터**. The app's final public name will be chosen separately; the internal Xcode project is still FruitLab.

## Run the web playground

Node 22 or newer. No npm dependencies are required.

```sh
npm test
npm run build
npm run check:readiness
npm run dev
```

Open the local URL printed by the server. Deployment builds `dist/` with `npm run build` in the existing Cloudflare Pages project.

## Shared learning format

`shared/{lemon,apple,watermelon,orange,pear}.json` hold versioned English, Korean and Spanish content, seed-count assumptions, three discovery facts, four growth-story steps and origin notes. The web build copies these verbatim to `/content/`; the native prototype references its existing authored resources; the two new web fruits are not yet native app scenes. Content updates ship on the website when deployed and in the app with a new build. There is no remote app-content update service or account/progress syncing.

The repeatable experience is orchard (or a ground vine for watermelon) → tap fruit → rotate/pull open → seed discovery → short illustrated story. An optional three-piece puzzle uses the same fruit characters and supports drag, tap and keyboard input. A new ingredient needs reviewed learning content plus suitable visual geometry; vegetables are not all tree fruit and must receive an appropriate growing scene.

## Native prototype

Open `ios/FruitLab/FruitLab.xcodeproj`. See its README for clean simulator build and test commands. The prototype bundles the shared learning files for offline use. Device installation, App Store distribution and final app naming are separate work.

## Editorial and design

Stylized, original procedural 3D fruit and SVG orchard illustration. Each play model has five discoverable seeds; this is not a universal botanical count or an anatomy diagram. No knife interaction. Real food preparation needs an adult. Historical lemon origins are presented as uncertain rather than an exact ancient birthplace.

Primary references: UF/IFAS Lemon Growing in the Florida Home Landscape, Kew Plants of the World Online (Citrus × limon), University of Maryland apple and pear growing, University of Minnesota Flowers to Fruit. Links and limitations are visible in the grown-up section. Translations have not all received native-speaker review; no child usability study or expert review is claimed.

## Privacy and accessibility

Original synthesized effects are off by default and enabled only with the sound button. Background music has an independent Music button: original 16-bar instrumental arrangements for orchard exploration and the puzzle. Both are synthesized locally, require an explicit tap, and stop when the page is hidden; returning requires another tap. Music volume is adjustable in the help dialog. Leaf flutter, soft landings, seed sparkles and completion confetti respect reduced motion and stop in the background.

No ads, analytics scripts, accounts, uploads, voice recording, location, cookies or persistent play storage. Language and progress live in page memory. Hosting receives ordinary network requests; the privacy page explains this distinction. CSP and `no-transform` prevent third-party scripting and Cloudflare automatic analytics insertion. The website includes button/keyboard alternatives for gestures, reduced-motion styles, fallback illustration if WebGL is unavailable, and large controls.

## Replacement of the earlier site

This working tree replaces the former finance website. Finance pages, tools, data, scheduled bank refresh, advertising verification and financial API endpoints are absent. Old addresses return a 404 page linking to the new playground. Ordinary Git history is not rewritten.

## Read-together lessons and review readiness

The build creates five crawlable `/learn/{fruit}/` pages with English observation activities, parent prompts and primary sources. Their links select the matching playground fruit with `?fruit=`. These pages are educational content, not an approval guarantee. AdSense has not been resubmitted. Before any ads are enabled, revisit Google’s child age treatment, interaction placement and privacy disclosure requirements; the present public site still serves no advertising.
