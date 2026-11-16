# Grounds: what is behind every screen

- **Status:** art direction, decided (2026-11-16), written by Claude as manager for [PLAN](../process/PLAN.md) task 1.5 (#313). It is the brief; the builder paints, screenshots and adjusts.
- **Adam's ask (2026-11-16):** "design everything so there are no blue backgrounds."
- **Builds on:** [ADR 0006](../decisions/0006-art-direction.md) (rich materials: stone, brass, lantern light) and [ADR 0025](../decisions/0025-city-painted-in-the-browser.md) (painted in the browser, no image files).

## 1. What the blue is

One rule in `src/core/theme.css`: `body { background: linear-gradient(180deg, var(--dusk) 0%, var(--night) 70%) }`, from `#33397a` to `#1e2636`. Every place that doesn't paint its own ground shows it: the sign-in screens, "Lost?", loading and error states, the space under a hall's painting on a phone, the Notice Board's surround, the edges of Your House and the Market, and the gaps between cards on any long page.

**What counts as a blue background** (my reading of Adam's sentence; he should say if he meant more): a flat color or plain gradient standing in for a place. A sky *inside a painting* is part of the painting and may be whatever the hour needs. So the square's dusk sky stays, and the navy page behind a card goes.

## 2. The principle

**Every screen stands on something.** A card never floats on a color; it lies on a table, hangs on a wall or stands on a floor that belongs to the place the player is in. The ground is quiet (it is behind text and cards all day) and warm (the city is lit by lamps, and the two guild colors, teal and terracotta, need a neutral that flatters both). Blue-gray is neither.

## 3. Four materials

Painted with CSS gradients only: no images, no SVG files, nothing to download. Each is one class that sets `background` in layers (a base, a slow large-scale variation so it isn't flat, a fine repeating pattern for the material, and a lamplight glow from the top center). Start from these values and adjust by eye.

| Class | Material | Base | Pattern | Used by |
|---|---|---|---|---|
| `ground--wood` | Dark walnut boards | `#2a1a10` to `#3a2416` | plank seams every ~96 px, a darker line 2 px wide; faint grain | **The default** (on `body`, replacing the gradient), the Notice Board's wall, Your House |
| `ground--stone` | The tower's flagstones | `#3b342d` to `#2c2620` | coursed blocks ~120 × 56 px with thin mortar lines `#1f1a16`; one brass inlay line under the painting | The Signal Tower and all its stations |
| `ground--earth` | The courtyard's packed earth and tile | `#5a3d27` to `#44301f` | square tiles ~72 px set diagonally, seams lighter (`#6d4c31`) | The Caravanserai and all its stations |
| `ground--cobble` | Street cobbles at dusk | `#4a3c33` to `#352a24` | offset rounded setts ~44 px via two radial-gradient layers | The Market, the square's letterbox edges, "Lost?" and error screens |

The lamplight is the same in all four: `radial-gradient(ellipse at 50% -10%, rgba(255, 211, 107, 0.16), transparent 60%)`. It is what makes four materials read as one city.

**Text straight on a ground** (loading lines, the "Back to the square" link) is `--vellum` or `--lamplight`. All four bases are dark enough for 4.5:1 with both; check with the method in HANDOFF item 82 anyway.

`--night` and `--dusk` stay as tokens only if a painting still uses them. Nothing outside a painter may use them as a background (a lint-style unit test over the CSS files can assert that).

## 4. Screen by screen

| Screen or state | Ground |
|---|---|
| Sign-in, "Choose a password", "Opening the gates…", "Not set up yet" | **The city gate at dusk**, painted like the halls (a painter module, drawn once): a stone arch with two lit lanterns, the doors ajar with warm light in the gap, and behind it a sunset sky that runs from ember (`#d9784f`) at the horizon through plum (`#4a2a3a`) to a dark warm brown at the top. No navy. The form is a parchment notice nailed to the left door. "Opening the gates…" is the same scene with the gap a little wider. On a phone the arch crops to the notice and one lantern. |
| "Lost?" (unknown address) | `ground--cobble`, with one painted thing: **a waymark post** (the city's namesake) with a lit lantern and a single arm pointing back. The button is the arm's text: "To the square". |
| Error boundary and save-failure screens | The same post with its lantern out. The words explain; the picture only sets the place. |
| The square, where the window is wider or taller than the painting | The painting's own lowest and outermost colors continue: `ground--cobble` below and at the sides. Never the page. |
| Signal Tower: under the painting on a phone, in a short window, and every station screen | `ground--stone`. The painting's floor meets it at a brass threshold line, so the cards below read as the next room down the stair. |
| Caravanserai: the same places | `ground--earth`, meeting the painting at a worn stone step. |
| Notice Board surround | `ground--wood`: the board hangs on a plank wall. |
| Your House | `ground--wood` below a plaster band (`#c9b089` to `#b89c74`, top third) on wide screens; wood only on a phone. |
| The Market | `ground--cobble`. |
| Dialogs' backdrop (level-up, rank-up, chest) | Stays a dark scrim, but warm: `rgba(20, 12, 6, 0.72)`, not a blue-black. |
| Long pages (grammar book, the road so far, Settings) | The place's ground runs the full scroll height (`background-attachment: scroll`, pattern repeating), so no band of plain color shows between or after cards. |

## 5. How to know it's done (task 1.5's test, made exact)

A browser test visits every route and state above at 320, 412 and 1280 pixels wide, takes a viewport screenshot (not `fullPage` on the phone project; see HANDOFF's trap), and samples pixels at the four edges, the corners and the midpoints between cards. **It fails if any sample is blue-led: `b > r + 12 and b > g + 12`.** Samples inside a painting's box are skipped (the box is read from the painting's element). This tests what Adam asked for, the absence of blue ground, without pinning exact colors that the painter may still tune.

Also required: each ground and the gate scene screenshotted and looked at on a phone and a desktop; no new network request (the grounds are CSS, the gate is a painter module in the startup or sign-in chunk); the speed budget of task 1.7 holds, with the gate scene painted once and cached like the halls.

## 6. What not to do

- No photographs, textures from files, or downloaded patterns (ADR 0025).
- No animated grounds. One lamplight flicker on the gate's lanterns at most, off under reduced motion.
- Don't recolor the guilds. Teal and terracotta stay the accents; the grounds are neutral.
- Don't make the grounds busy. If a pattern can be seen through a card's text at arm's length, halve its contrast.
