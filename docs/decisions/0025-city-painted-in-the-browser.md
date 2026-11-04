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
