# Visual concept v0 (2026-11-01)

- **Live canvas (private to Adam):** https://claude.ai/artifact/DTbvuq7ouyL9jSs8Ckh68Y
- **Status:** awaiting Adam's feedback (roadmap M0 item 0.3)
- **Art direction:** ADR 0006 (bold cartoon arena-town, heroic MMO tone). Inspired by the feel of classic browser-RPG town screens; no assets or layouts copied.

| Artboard | What it shows |
|---|---|
| `Main.dc.html` | **v2 (1920×1080, depth pass):** the city square in golden light, buildings ringed around the plaza: Signal Tower, Caravanserai, Your House, Market, the locked Arena, two empty guild plots, your character, the HUD (level, XP, gold, gems, streak), and the Notice Board with day-one quests. **The Signal Tower and its quest are clickable.** |
| `SignalTower.dc.html` | Inside the tower. Left: guild rank, Elo ratings, speed settings. Center: "The Silent Beacon · Chapter I" lamp path in Koch order. Right: next lesson, Instant Recognition, sending practice (spacebar/tap key), locked Radio Room. |
| `StyleGuide.dc.html` | Palette, guild hues, type (Cinzel · Alegreya Sans · Noto Naskh Arabic · Noto Sans Hebrew), line/shape/light rules, components, do/don't. |

Design resolution is 1920×1080 (ADR 0006, amendment 2). The Signal Tower interior is still the v1 layout, scaled to fit, until its own depth pass. The real build is responsive; the phone layout comes next once the look is approved.
