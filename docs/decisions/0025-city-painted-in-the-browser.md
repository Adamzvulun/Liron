# 0025 — The city is painted in the browser from the concept's painter

- **Status:** Accepted (part of #24)
- **Date:** 2026-11-03
- **Builds on:** [0006](0006-art-direction.md) (art direction, 1920×1080 design size), concept v3 ([concept](../design/concept-v0/README.md))

## Context
#24 asks for the approved city v3 scene in the app at 1920×1080, scaled to fit any desktop window without distortion. It also asks us to decide between two ways of getting the art in:
- **(a)** move the generator (`docs/design/concept-v0/tools/city.js`) into the app;
- **(b)** export a static SVG at build time.

Measured on 2026-11-03:

| | Download (gzip) | Work in the browser |
|---|---|---|
| (a) painter in the app | **17 KB** of code | painting takes 57 ms (245 ms with the CPU slowed 4×) |
| (b) static SVG | **344 KB** of markup (1.28 MB raw) | none |

Both end up as the same ~5,300 SVG elements in the page, so rendering costs the same. The cobbles are most of it.

## Decision
- **(a): the painter moves into the app** as `src/core/city/painter.js`, wrapped in `paintCity()`. It is deterministic: the same seed gives the same scene on every call. It returns SVG markup per layer (sky, ground, mid, front), per place, and for the avatar. `City.tsx` positions those parts and adds the plaques as real HTML headings, so #25 can make them clickable.
  - The file stays plain JavaScript with a small type file (`painter.d.ts`); rewriting 600 lines of drawing code in TypeScript buys nothing.
  - The concept copy in `docs/` stays as the design record.
  - Gradient and filter ids are prefixed `wm-`, so they can't clash with the rest of the page.
- **Scaling (changed 2026-11-03 after Adam's review):** the 1920×1080 stage fills the window without distortion. Edges are cut off where the window's shape differs, at most 18% of the width or the height (`stageFit` in `layout.ts`). Height comes 70% off the top (sky), so the plaques at the bottom stay. Only windows further than that from 16:9, such as 5:4, show the scene's sky and ground colours around it. (The first version fitted the whole stage inside the window and left bands, which looked broken on wide windows.)
- **The Arena's flags are gone** (Adam found them distracting).
- **Which subject lives where** is a small map in `src/core/city/layout.ts` (`morse` → Signal Tower, `arabic` → Caravanserai). It matches subjects by id, so the city never imports a subject. The plaque shows the subject's own place name.
- **Motion:** the concept's ambient animations (smoke, flicker, steam, drifting clouds, swaying signs, pulsing lamp) all stop under `prefers-reduced-motion: reduce`.
- **Paint time is recorded** as the `city:paint` performance measure, so it can be checked in the browser's tools.

## Consequences
- **Changing the art** means editing `painter.js` (the concept tool is no longer the source).
- **If first paint ever gets slow,** the cobbles are the place to cut, by drawing fewer and larger stones; a static export stays possible because the painter is deterministic.
- **Phones:** on phones, the scene showed letterboxed until the phone layout was designed (#27). *Update:* #27 is done: on an upright phone the scene pans sideways (`useStage`) and its contents follow below as cards.

## Amendment (2026-11-05, #123): a still scene with small moving layers
**Why:** Adam found the square "super slow and laggy" on his PC in Chrome. Measured with a Chrome trace ([research](../research/dev-site-problems-2026-11-05.md#4-the-square-measured-again-before-fixing-it-123-2026-11-05-second-session)), the cost was not the filters themselves, which are drawn once and cached:
- The small ambient animations ran inside the SVG, under two full-stage blend modes (sun rays `screen`, grain `overlay`), so the compositor redrew the whole scene every frame.
- Hovering animated `filter: drop-shadow()` on a whole building, which re-rasterised it every frame.

**Options weighed:**
- **(B)** draw the scene once into a canvas;
- **(W)** ship pre-rendered WebP images;
- **(C)** keep the live SVG but make it still.

(B) froze a phone for 2.4 s while drawing. (W) adds 285–404 KB for phones and a generated file to keep in step with the painter. (C) was as fast as a bitmap with neither cost. **Adam chose (C)** on 2026-11-05.

**Decision:**
- **The painted scene is still.** `paintCity()` cuts every animated piece (lamps, flame, steam, smoke, clouds, the inn sign) out of the static markup with `anim(motion, box, svg, origin?)`. Layers and parts are now lists of *segments*, static markup and sprites in paint order, so whatever was drawn over a piece (the lantern's bars over its flame, the tower over a cloud) still is.
- **Each sprite is its own small HTML layer** (`.city__sprite`) that animates only `transform` and `opacity`. Both Chromium and WebKit move such a layer without repainting; WebKit doesn't composite animations of elements *inside* an SVG.
- **No blend modes.** The rays and grain use plain transparency (the rays' opacity went from .35 to .45 to keep their light). The screenshots compared frozen are near-identical.
- **Hover glow is drawn once:** each place has a `.city__glow` copy filtered to a gold silhouette (the old drop-shadow's colour and size), faded in by opacity. The plaque's glow is a box-shadow on a pseudo-element, also faded by opacity. The lift (`translateY(-6px)`) stays.
- **Two fixes on the way:**
  - The tower's halo had two `class` attributes, so it was never screen-blended. Its look is unchanged.
  - The inn sign rotated about a point far off its box (`transform-origin: 290px 520px` in its fill-box), so it slid about 30 px. It now swings from its bar.
- **Guard:** `tests/e2e/city-speed.spec.ts` checks that only sprites animate, only `transform`/`opacity`, with no blend modes and no hover filter. It also holds a frame budget at 4× CPU throttle (frame p95 ≤ 34 ms idle and hovering, idle compositor < 650 ms/s, hover raster < 90 ms/s). The old square fails it.

**Consequences:**
- **When adding motion to the scene:** wrap it in `anim()`, never a class inside the markup. Never put a blend mode or a CSS filter on anything in the stage.
- **The halls** (Signal Tower, Caravanserai) still use a hover `drop-shadow` on their stations. They measured smooth (60 fps idle), so they were left alone. If they ever lag, use the same glow approach.
