# Visual concept v0 (2026-11-01)

- **Live canvas (private to Adam):** https://claude.ai/artifact/DTbvuq7ouyL9jSs8Ckh68Y
- **Status:** awaiting Adam's feedback (roadmap M0 item 0.3)
- **Art direction:** ADR 0006 (bold cartoon arena-town, heroic MMO tone). Inspired by the feel of classic browser-RPG town screens; no assets or layouts copied.

| Artboard | What it shows |
|---|---|
| `Main.dc.html` | **v3 (1920×1080, painted pass, preview: `city-v3.png`):** the city square in golden light, buildings ringed around a cobbled plaza with a brass waymark compass at its centre: Signal Tower, Caravanserai, Notice Board, Your House, Market, the locked Arena in the distance, your character, the HUD (level, XP, gold, gems, streak), and the Notice Board with day-one quests. **The Signal Tower and its quest are clickable.** |
| `SignalTower.dc.html` | Inside the tower. Left: guild rank, Elo ratings, speed settings. Center: "The Silent Beacon · Chapter I" lamp path in Koch order. Right: next lesson, Instant Recognition, sending practice (spacebar/tap key), locked Radio Room. |
| `StyleGuide.dc.html` | Palette, guild hues, type (Cinzel · Alegreya Sans · Noto Naskh Arabic · Noto Sans Hebrew), line/shape/light rules, components, do/don't. |

Design resolution is 1920×1080 (ADR 0006, amendment 2). The Signal Tower interior is still the v1 layout, scaled to fit, until its own depth pass. The real build is responsive. **Phone layout (#27, approved by Adam 2026-11-03):** held upright, the scene fills the height between a slim HUD and a dock of places and pans sideways from the compass; turned sideways it fills the screen like a desktop.

## How the city is made (v3)

> **Since #24 the app paints the city itself** from `src/core/city/painter.js`, a copy of `tools/city.js` ([ADR 0025](../../decisions/0025-city-painted-in-the-browser.md)). Change the art there; this tool stays as the design record.
The city art is **generated**, not hand-placed: `tools/city.js` draws every building from shared painters (gradient-shaded faces, one sun from the upper left, cast and contact shadows, scalloped roof tiles, plaster texture, perspective cobbles, depth haze). Change a rule once and every building follows it.

```bash
cd docs/design/concept-v0/tools
python3 assemble.py ../Main.dc.html /tmp/Main.dc.html   # rebuilds the scene, keeps the HUD from the given file
node render.js /tmp/Main.dc.html /tmp/city.png          # screenshot for review (needs Playwright)
```
