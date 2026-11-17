# Problems Adam found on the dev site (2026-11-05)

Adam played the latest dev site and reported three problems:
1. It is "super slow and laggy".
2. Some translations of Arabic words are wrong.
3. Some English is spelled the British way ("practise").

This note records what Claude measured and found, so the fixes start from facts. The GitHub issues hold the work:
- #123: city square rendering.
- #124: loading and network.
- #125: Arabic translations.
- #126: American spelling.

## 1. Speed

### How it was measured
- **Tool:** Playwright's headless Chromium on the production build (`npm run build`, `vite preview`), with Chromium's CPU slowed 4× to stand in for a phone.
- **What was recorded:** frame times (`requestAnimationFrame`) and long tasks (`PerformanceObserver`) for 3 s on each screen, plus a run that moves the mouse over the city square.
- **Data:** Supabase was the e2e fake, which answers instantly, so network time is **not** in these numbers.
- **Caveat:** headless Chromium paints on the CPU without a GPU. A real phone will differ, which is why issue #123 asks Adam which screens and device felt slow.

| Screen | Desktop 1280×720, avg / p95 frame | Phone (Pixel 7 viewport), avg / p95 frame |
|---|---|---|
| City square, idle | **29.7 / 50 ms** (≈34 fps), 2 long tasks | 18.2 / 33 ms |
| City square, moving the mouse | **59.7 / 117 ms** (≈17 fps), 9 long tasks = 585 ms in ~2 s | 22.4 / 50 ms |
| Signal Tower, Caravanserai, scribe's table, Your House (idle) | 16.7 / 16.8 ms (steady 60 fps) | 16.7 / 16.8 ms |

**Conclusion: the city square is the slow screen. The halls are smooth when idle.**

### Why the square is slow (from the code)
1. **The whole scene is SVG filters.** `src/core/city/painter.js` paints the 1920×1080 scene as inline SVG with six filters:
   - **Plaster and grain over the full stage:** 4 `feTurbulence` primitives, in `fx-plaster` and `fx-grain`.
   - **Depth of field and blurs:** 8 `feGaussianBlur`, in `fx-dof`, `fx-b2`, `fx-b6` and `fx-b14`.
2. **Animations sit inside the filtered SVG.** `src/core/city/city.css` runs 9 infinite animations:
   - pulse, flicker, bob, drift and sway;
   - steam ×2 and smoke ×2.

   Each animated element sits under filtered layers, so the browser re-rasterises big filtered areas every frame. That explains why even the idle square misses frames.
3. **Hovering a building is costly.** It animates `filter: drop-shadow(0 0 18px …)` over 0.18 s on a whole building group, which means repainting a large filtered SVG on every frame of the transition.
4. **The stage is scaled with `transform: scale()`**. This is cheap on its own, but it is applied to a filtered SVG that the browser can't cache as one bitmap.

### Loading and network (measured by counting requests)
- **One JS bundle of 815 KB** (239 KB gzipped). It holds both subjects, every hall, the city painter, the slate and the coffee corner. Nothing is code-split, and Vite warns about it on every build.
- **Each question waits for two round trips** before its recording plays: a `POST /storage/v1/object/sign/…` and then the `GET`, one after the other, against Supabase. On the real network that is noticeable after every answer.
- **The private deck (4,823 items) loads in pages of 1,000 rows.** That is 5 requests in a row the first time a lesson opens in each visit.
- **A full page load fetches 4 things again:** the profile, wallet, today and time zone.

### Directions to research
These are not decided yet.

**Square:**
- Paint the static scene once into a bitmap: a pre-rendered WebP at build time, or the SVG drawn once into a `<canvas>`/`ImageBitmap`.
- Keep only the small animated parts (lamps, steam, smoke, banner) as separate layers that animate `transform`/`opacity` only.
- Replace the hover drop-shadow with a pre-painted glow that fades in with `opacity`.
- ADR 0025 ("city painted in the browser") would need an amendment.

**Bundle:**
- Use `React.lazy` per hall and subject screen, so the square loads only the square.

**Audio:**
- Sign all of a session's recordings in one request (`createSignedUrls`) when it starts, and preload the next question's recording.

**Deck:**
- Cache it in the browser (IndexedDB) under its version, so it downloads once, not once per visit.

**Done (#124, 2026-11-05):**
- **Bundle:** each hall (the Caravanserai and the Signal Tower) is its own chunk, loaded when you go in. The first load is now 642 KB (188 KB gzipped), down from 815 KB (239 KB). The halls are 87 KB and 90 KB. The rest of the main chunk is mostly framework code (React, the Supabase client, zod). Splitting that further would not make the first load smaller, so we left it.
- **Audio:** a session's recordings (each word, plus the choices of the listening questions) are signed in one `createSignedUrls` request as soon as the session starts. After that, each question needs only the `GET`. The recording itself is not preloaded: the browser fetches it when it plays.
- **Deck:** the pack is kept in this browser's IndexedDB under its version, which is the row count and latest change of its items and lessons. A visit checks the version in two small requests and downloads the deck only when it changed. Signing out wipes the copy (ADR 0023 amendment).
- **Guard:** `e2e/loading.spec.ts` checks that the square loads no hall chunk, that a session makes one signing request, and that the deck loads once, even after a reload.
- **Not done:** the profile, wallet, today and time zone are still fetched on every page load. They are small and change often, so caching them isn't worth the risk of stale coins.

**Guard:**
- Add a frame-time budget test for the square in e2e, so a regression shows in CI.

**Real device:**
- Adam profiles one session on his phone. One option is Chrome remote debugging; Lighthouse on the dev URL is not possible while it sits behind Vercel login.

## 2. Arabic translations
The words in the lessons come straight from the Lingualism deck: each row's own Arabic, romanisation and English. The deck is private, so the dump used for this check is not in the repo. Looking at the 198 words of lessons 1–3 (`wordsFrom` in `src/subjects/arabic/words.ts`) and all 9 phrase sets shows several ways a learner sees a wrong or misleading meaning.

1. **The deck's English depends on its section, and we drop the section.**
   - وزير is glossed "queen" (the chess piece, from the games section; usually "minister").
   - بار is "a barbell", from the gym section.
   - بدّل is "to change gears", from driving.
   - زيتي is "olive", from colours (olive-green).
   - ميزان is "scale".

   Out of context these read as wrong.
2. **Words spelled the same: we keep whichever row comes first.**
   - `wordsFrom` drops a word if a word with the same letters was already kept.
   - So بابا shows "pope" (it also means dad), أمّي shows "illiterate" (it also means "my mom"), and مرا shows "wife" (also "woman").
3. **Conjugated verbs glossed as infinitives.**
   - بِدّو is "to want", but bíddu means "he wants".
   - نزّلت is "to have an abortion", but it is a feminine past form.
4. **Grammar tags leak into the romanisation.**
   - Examples: "lúwaz [pl.]", "názzalat [55] [f.]", "báddal [19]", "sāda [lit. plain]".
   - They appear in Latin choices and feed the "Said here:" Hebrew line, which turns them into nonsense.
5. **Gender is lost.**
   - إنْتَ and إنْتي are both glossed "you", so a choice between them can't be answered.
6. **Unsuitable words in early lessons.**
   - Lessons 1–3 include snot, excrement, urine, AIDS, an abortion verb, "pagan" and "death".
7. **Phrase glosses.**
   - الحمد لله is glossed "I'm fine." (literally "praise God"). يعطيك العافية is glossed with a description in brackets. The counting row "__ واحد، __ واحدة" keeps its blanks.
   - Same-meaning phrases are never offered as two choices (`sets.ts` removes duplicates), so the duplicate glosses don't break the coffee corner's Understand question.

**Direction:** review the lesson words as our own content:
- **The list:** a reviewed list in `content/arabic/` of the words we keep, with our own short glosses where the deck's need context.
  - Our glosses are our own text, so they can be public. The deck's stays private.
- **Clean-up:** strip the bracketed tags from the romanisation, tell homographs apart by their vowel marks, and leave verbs out until verbs are taught.
- **Review:** Adam (a Hebrew speaker learning Palestinian Arabic) checks the list.
- **Adam's report:** issue #125 asks Adam which words he saw that were wrong, so that his cases are covered first.

**Done (2026-11-05, #125):** `content/arabic/lesson-words.json` lists the 187 words of lessons 1–3 with our glosses and 17 left out with reasons. A second look corrected point 2: بابا, أمّي and مرا each have only one deck row, so the fix is our gloss, not picking another row. The real same-letter pairs differ by their marks (لُوَز/لوْز, برْد/برد, دُبّان/دِبّان) or are spelled identically (نِت, ملْيان, مُتلّت, مِن…). The first are kept as homographs, never shown bare; for the second one row is kept with both meanings in its gloss. Phrase sets carry our glosses where needed (`glosses` in `phrases.json`), and the counting row's blanks were already tidied (now tested). A test checks the list against the deck: every word in its lesson, used, and none missed. Waiting for Adam's review.

## 3. American spelling
The site mixes British and American spelling. The rank is "Traveler", but the wardrobe has "Traveller's tunic".

Visible British spellings in the app:
- **Practise:**
  - The buttons "Practise" and "Practise again" (scribe's table, coffee corner).
  - "Every letter learned · practise" (courtyard).
  - "Practise your letters" (Morse hall).
  - "Practise in the lessons" (Morse trial).
  - The daily contract "Practise N minutes today".
- **Traveller:** "Travellers call out words…" (the fountain), the wardrobe's default name "Traveller", the item "Traveller's tunic", and "A traveller from the south…" (`content/arabic/questline.json`).
- **Colour:** "Hair colour" (wardrobe).
- **Grey:** "Grey" (hair colour).

Code names such as `hairColour`, `analyseFist` and `CENTRE` are not seen by players. Renaming them is optional. A saved avatar stores `hairColour`, so renaming that key needs a fallback when reading old profiles.

Docs are also British in places, in 14 files ("romanisation", "colour", "practise").

**Direction:**
- Use American English in everything a player sees, and say so in CLAUDE.md's conventions.
- Fix the docs as they're touched.
- The e2e tests that click "Practise" (4 places) change with the button.

## 4. The square, measured again before fixing it (#123, 2026-11-05, second session)
The first measurement above used `requestAnimationFrame` gaps. Run again the same way (same build, 4× CPU throttle, 1 worker, 3 runs each), the idle square showed a steady 60 rAF frames per second on both viewports, not 34. The mouse-move run still dropped (desktop avg 29–33 ms, p95 50 ms). The first run's idle numbers were probably inflated by parallel test workers or by measuring straight after load; the method didn't say.

**rAF only sees the main thread.** In Chromium, the compositor and the raster workers draw the SVG on other threads, so an idle main thread can run at 60 fps while those threads are saturated. The second session therefore also recorded a Chrome trace for each run, and adds up:
- the compositor's frame drawing (`Display::DrawAndSwap` on `VizCompositorThread`);
- rasterising (`RasterTask`);
- main-thread frame work (`ProxyMain::BeginMainFrame`).

Each is given as **milliseconds of work per second of wall time** (1,000 = a whole core busy).

### What costs what (ablation: one ingredient switched off at a time)
Desktop 1280×720 and the Pixel 7 viewport, 4× CPU throttle, 3 s idle and 2 s of mouse movement over the buildings.

| Variant | Desktop idle, compositor ms/s | Desktop hover, fps | Desktop hover, raster ms/s | Phone idle, compositor ms/s |
|---|---|---|---|---|
| Today | **750–830** | **29–34** | 96–113 | 263–295 |
| No animations | 0 | 21–23 | 476–521 | 0 |
| No blend modes (`wm-screen`, `wm-overlay` → normal) | 265–274 | 46–47 | 238–270 | 82–87 |
| No front layer | 252–265 | 42–45 | 97–119 | 75–80 |
| No SVG filters | 723–798 | 30–35 | 49–52 | 257–277 |
| No hover drop-shadow | 781–865 | 45–60 | 139–156 | 278–288 |
| **Blend modes normal + no hover drop-shadow + `will-change` on places** (CSS only) | **324** | **59** | **2** | **103** |

**Findings:**
1. **Idle:** the square redraws every frame because something animates under two full-stage blend modes: the sun rays (`screen`) and the grain (`overlay`). Chromium composites the SVG's animations (since Chromium 89), so the cost lands on the compositor, not in paint. With nothing animating, the cost is zero. Most of it is the blend modes.
2. **Hover:** the `drop-shadow` filter on a whole building group re-rasterises it every frame of the transition. Without it, hover runs at 60 fps.
3. **The turbulence and blur filters are not the per-frame cost.** They are rasterised once and cached; switching them off saves little.
4. **The tower's halo has a bug:** it carries two `class` attributes (`wm-pulse` and `wm-screen`). Browsers keep the first, so the halo has never been screen-blended. The approved look is the unblended one.

### Prototypes of the leads
| Prototype | Desktop idle, compositor ms/s | Phone idle, compositor ms/s | Phone panning, compositor / main ms/s | One-time cost |
|---|---|---|---|---|
| Today | 814 | 288 | 365 / 198 | none |
| **(B) Bitmap:** the whole SVG drawn once into a `<canvas>`, 10 small animated layers on top | 83 | 48 | 102 / 764 | **main thread blocked 0.9 s (desktop) and 2.4 s (phone, 5.4 Mpx) while drawing** |
| **(C) Static live SVG:** the same SVG with no animations inside it, the same 10 animated layers on top | 139 | 35 | 65 / 115 | none |
| **(W) Pre-rendered WebP** (not run in the page; size only) | ≈ (B) | ≈ (B) | ≈ (B) | download 125–177 KB at 1×, 285–404 KB at 2× (phones need ≈1.6–2.1×) |

- **(B)'s one-time draw is a freeze on load.** Drawing an SVG into a canvas can't move to a worker.
- **(W) avoids the freeze** (images decode off the main thread), but it adds a generated image to keep in step with the painter, a large download on phones, and softness when a phone zooms past the image's resolution.
- **(C) is as fast as a bitmap in Chromium with neither cost.** A static SVG is rasterised once into tiles and kept, like a bitmap.

### Look
The scene with blend modes set to normal is nearly identical (screenshots compared at 1920×1080, frozen): the sun rays are a little dimmer, which an opacity bump restores, and the grain difference is invisible.

### What can't be measured here
**Safari.** Only Chromium is installed in this environment. Sources say WebKit has not composited animations of elements *inside* an SVG (they repaint), while transform/opacity animations on HTML elements are composited ([Igalia 2019](https://blogs.igalia.com/nzimmermann/posts/2019-12-12-3d-transformations/), [Igalia 2021](https://blogs.igalia.com/nzimmermann/posts/2021-10-29-layer-based-svg-engine/page/2/)). Chromium composites both ([Chrome blog](https://developer.chrome.com/blog/hardware-accelerated-animations)). So on an iPhone, today's square probably repaints the filtered SVG around each animated piece every frame, which is worse than these Chromium numbers. Moving the animated pieces into small HTML-level layers is the fix that holds in both engines.

### After the fix (#123, option C, same method)
Built as [ADR 0025's amendment](../decisions/0025-city-painted-in-the-browser.md#amendment-2026-11-05-123-a-still-scene-with-small-moving-layers) describes. Three runs each, 4× CPU throttle, 1 worker:

| | Before | After |
|---|---|---|
| Desktop idle, rAF avg / p95 | 16.7 / 17 ms | 16.7 / 17 ms |
| Desktop hover, rAF avg / p95 | 29–33 / 50 ms | **17 / 17 ms** |
| Desktop hover, frames drawn per second | 29–34 | **58–60** |
| Desktop hover, raster | 96–126 ms/s | **33–55 ms/s** |
| Desktop idle, compositor | 750–856 ms/s | **370–430 ms/s** |
| Phone idle, compositor | 263–295 ms/s | **121–133 ms/s** |

The remaining idle compositor work is the compositor redrawing the rectangle that spans all the moving lamps, through the still layers above them. Those layers must stay above the lamps, or the lantern bars and the tower wouldn't cover them. Per motion: the five pulsing lamps 229 ms/s, the two flickers 116, the clouds 167, smoke 56, steam and sign 13 each. This headless Chromium composites in software; on a machine with a GPU the same drawing is texture copies, so treat these numbers as an upper bound. The work that blocked frames on any machine (re-rasterising the building on hover, redoing blend passes) is gone.
