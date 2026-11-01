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

## Consequences
- We need a style guide doc and a small set of reference illustrations before building screens (M1).
- SVG keeps everything crisp on phone and desktop, themeable, and versionable in git.
