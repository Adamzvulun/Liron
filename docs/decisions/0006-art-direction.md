# 0006 — Art direction: bold cartoon arena-town

- **Status:** Accepted
- **Date:** 2026-11-01

## Context
Adam chose the **Swords and Sandals** feel (option A in discovery 02): a cartoon town lobby, a customizable avatar, and chunky, warm game UI.

## Decision
- **Style:**
  - Bold cartoon with thick dark outlines and warm saturated colors.
  - Exaggerated proportions (big heads and hands) and chunky beveled buttons.
  - Parchment and wood UI panels, plus bouncy, juicy animations.
- **Inspired by, never copied.** We take the *feeling* only: no assets, characters, layouts, or names from that game, or any other. Our world is our own.
- **Production:**
  - Hand-authored **SVG** with a written style guide (palette, outline weight, shading rules, shape language).
  - Animation in CSS/JS. Move to PixiJS only if the lobby becomes a walkable scene.
- **Avatar:** a layered "paper-doll" SVG system:
  - Base layers: body, skin tone, face, hair.
  - Gear slots: head, torso, legs, feet, hand, back, plus a companion pet.

## Amendment (2026-11-01)
The tone moves from "cute" to **heroic-stylized MMO**: bold and colorful, but not childish. See discovery 04.

## Amendment 2 (2026-11-01): resolution and depth
- **Design resolution: 1920×1080** (standard desktop). The phone layout is derived from it.
- **Depth, after Adam's reference** (a classic browser-RPG town screen; principles only, nothing copied):
  1. **Low eye level, standing in the square.** Little sky; buildings fill the frame.
  2. **Buildings in a ring around a dirt plaza, turned toward the centre**, packed and overlapping.
  3. **Three depth bands:** large near buildings at the frame edges; mid buildings; small, hazy back rooftops (atmospheric perspective). A distant landmark (our locked Arena) fades in the haze.
  4. **Volume:** front faces light, side faces dark, roof planes shaded, plaster and stone texture, contact shadows.
  5. **Varied roof colours and chimneys** on each building. (Hanging icon banners were dropped at Adam's request, 2026-11-03.)
  6. **Dark foreground framing** at the bottom edge, plus a warm edge vignette.

## Amendment 3 (2026-11-01): painted rendering
Adam: v2 was "too simple, not enough blending, too blocky; lean into the artwork style of Swords & Sandals". Rendering rules, from studying that style (feel only, nothing copied):
1. **No flat fills.** Every surface carries a gradient: lit at the top-left, darker toward the bottom and away from the sun.
2. **One sun, upper left.** Faces turned left are lit, faces turned right are shaded; every object casts a soft shadow to the lower right and sits on a dark contact shadow.
3. **Soft, organic shapes.** Rounded corners, slightly bowed edges, scalloped tiles and awnings; no ruler-straight boxes.
4. **Texture and ambient occlusion.** Plaster and stone noise, darkening at the bottoms and edges of walls and under eaves.
5. **Blending through air.** Haze increases with distance, the distant Arena is silhouetted against the sun, and the foreground is blurred like a camera's depth of field.
6. **Glow is life.** Lit windows, lanterns and the tower lamp glow and bloom; a light grain and vignette tie the picture together.
7. **Generated, not hand-placed.** The scene is drawn by a script with shared painters (`docs/design/concept-v0/tools/`), so style rules apply everywhere at once.

## Consequences
- We need a style guide doc and a small set of reference illustrations before building screens (M1).
- SVG keeps everything crisp on phone and desktop, themeable, and versionable in git.
