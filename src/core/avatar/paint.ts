import {
  DYES,
  HAIR_COLOURS,
  SCARVES,
  SKINS,
  type Look,
  type ScarfId,
  type SlotId,
} from './looks.ts';

// Paints the paper-doll avatar (#28) as SVG markup, in the city's style (ADR 0006 amendment 3):
// every surface a gradient lit from the upper left, ink outlines, a shadow cast to the lower
// right. Layers, back to front: back gear, back hair, legs, feet, torso, arms, hand gear,
// head, face, front hair, head gear. The figure stands in a 200×320 box, feet on y = 300.
//
// All values come from the tables in looks.ts (validated), never from free text, so the
// markup is safe to inject.

export const AVATAR_BOX = { width: 200, height: 320, feetY: 300 } as const;

const INK = '#2A170C';
const OUT = (w = 3.5) =>
  `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

type Stops = [number, string, number?][];

/** Builds gradients with ids unique to one painting, so several avatars can share a page. */
function gradients(prefix: string) {
  const defs: string[] = [];
  let n = 0;
  const stops = (s: Stops) =>
    s
      .map(
        ([o, c, a = 1]) =>
          `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}/>`,
      )
      .join('');
  return {
    defs,
    lin(s: Stops, x2 = 0.35, y2 = 1) {
      const id = `${prefix}g${++n}`;
      defs.push(
        `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops(s)}</linearGradient>`,
      );
      return `url(#${id})`;
    },
    rad(s: Stops, cx = 0.38, cy = 0.34, r = 0.75) {
      const id = `${prefix}r${++n}`;
      defs.push(
        `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(s)}</radialGradient>`,
      );
      return `url(#${id})`;
    },
  };
}

type Grads = ReturnType<typeof gradients>;

const WIDTH = { slim: 30, average: 36, broad: 44 } as const;

/** Gear ids this painter has art for. Locked items are drawn too, so rewards can be shown. */
export const PAINTED_GEAR = [
  'satchel',
  'cloak',
  'tunic',
  'breeches',
  'boots',
  'staff',
  'wrap',
  'headset',
  'tarboosh',
  'kufi',
  'shawl',
  'gold-sirwal',
  'slippers',
  'falcon',
  'waterskin',
  'sand-cat',
  'hedgehog',
  'fennec',
  'camel-calf',
  'sunhat',
  'turban',
  'vest',
  'robe',
  'coat',
  'sirwal',
  'silks',
  'sandals',
  'ridingboots',
  'flags',
  'scroll',
  'lamp',
  'bedroll',
  'oud',
  'banner',
  'ear-cups',
  'brass-key',
  'operator-coat',
  'night-lantern',
  'house-sash',
  'keffiyeh',
  'signal-cap',
  'ether-cloak',
  'olive-sprig',
  'dallah',
  'tatreez-vest',
  'story-cloak',
  'beacon-lens',
];

/** The cloaks on the back (ADR 0006), and the rank cloaks cut the same (#176, 2026-11-15). */
const CLOAKS: Record<string, readonly [string, string, string]> = {
  cloak: ['#8A4C9A', '#5E2E70', '#2E1438'],
  // Ghost of the Ether: pale as the night sky over the tower, with dots and dashes at the hem.
  'ether-cloak': ['#DDEBFA', '#8FB0D8', '#3A4E78'],
  // The storyteller's cloak: deep red, a gold hem.
  'story-cloak': ['#C8443A', '#8A1E1A', '#3A0A08'],
};

export interface PaintOptions {
  /** Unique per avatar on the page (React's useId). */
  idPrefix: string;
  /** The soft shadow on the ground; off where the scene paints its own. */
  shadow?: boolean;
}

export function paintAvatar(look: Look, { idPrefix, shadow = true }: PaintOptions): string {
  const g = gradients(idPrefix.replace(/[^a-zA-Z0-9_-]/g, ''));
  const skinT = SKINS.find((s) => s.id === look.skin) ?? SKINS[1];
  const hairT = HAIR_COLOURS.find((h) => h.id === look.hairColour) ?? HAIR_COLOURS[1];
  const wear = (slot: SlotId) => look.gear[slot];
  const sh = WIDTH[look.build];
  const cx = 100;
  const fy = AVATAR_BOX.feetY;

  const skin = g.rad([
    [0, skinT.light],
    [0.7, skinT.mid],
    [1, skinT.dark],
  ]);
  const skinFlat = g.lin([
    [0, skinT.mid],
    [1, skinT.dark],
  ]);
  const hair = g.lin([
    [0, hairT.light],
    [1, hairT.dark],
  ]);

  let back = '',
    body = '',
    front = '';

  // ---- shadow on the ground (sun upper left: falls to the lower right)
  if (shadow) {
    back += `<ellipse cx="${cx + 34}" cy="${fy + 4}" rx="62" ry="9" fill="${INK}" opacity=".22" transform="rotate(-6 ${cx + 34} ${fy + 4})"/>`;
    back += `<ellipse cx="${cx}" cy="${fy + 1}" rx="${sh + 6}" ry="6" fill="${INK}" opacity=".45"/>`;
  }

  // ---- back gear
  const cloak = CLOAKS[wear('back') ?? ''];
  if (cloak) {
    back += `<path d="M${cx - sh + 2} 136 Q${cx - sh - 22} 214 ${cx - sh - 16} 280 Q${cx} 292 ${cx + sh + 16} 280 Q${cx + sh + 22} 214 ${cx + sh - 2} 136 Z" fill="${g.lin(
      [
        [0, cloak[0]],
        [0.6, cloak[1]],
        [1, cloak[2]],
      ],
      1,
      1,
    )}" ${OUT()}/>`;
    const hemline = `M${cx - sh - 13} 276 Q${cx} 288 ${cx + sh + 13} 276`;
    if (wear('back') === 'ether-cloak')
      back += `<path d="${hemline}" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-dasharray="3 5 11 5" stroke-linecap="round" opacity=".9"/>`;
    if (wear('back') === 'story-cloak')
      back += `<path d="${hemline}" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="${hemline}" stroke="#FFD36B" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }

  if (wear('back') === 'bedroll') {
    // A rolled blanket across the shoulders, behind the head.
    back += `<rect x="${cx - sh - 24}" y="114" width="${2 * sh + 48}" height="26" rx="13" fill="${g.lin(
      [
        [0, '#D9785A'],
        [0.6, '#A8452E'],
        [1, '#5E2214'],
      ],
      0,
      1,
    )}" ${OUT(3)}/>`;
    for (const x of [-0.75, 0, 0.75])
      back += `<path d="M${cx + x * (sh + 16)} 115 V139" stroke="#F2D49A" stroke-width="4"/>`;
  }
  if (wear('back') === 'oud') {
    // The lute's round body peeks out at the viewer's left; its neck rises over the shoulder.
    back += `<path d="M${cx - 6} 168 L${cx - sh - 26} 70" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M${cx - 6} 168 L${cx - sh - 26} 70" stroke="#8A5530" stroke-width="7" stroke-linecap="round"/>`;
    back += `<path d="M${cx - sh - 26} 72 L${cx - sh - 40} 58" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M${cx - sh - 26} 72 L${cx - sh - 40} 58" stroke="#5A3418" stroke-width="5" stroke-linecap="round"/>`;
    back += `<ellipse cx="${cx - sh - 4}" cy="206" rx="26" ry="34" fill="${g.rad([
      [0, '#E0A060'],
      [0.6, '#A8642E'],
      [1, '#5A3010'],
    ])}" ${OUT()} transform="rotate(25 ${cx - sh - 4} 206)"/>`;
    back += `<circle cx="${cx - sh - 10}" cy="200" r="6" fill="${INK}" opacity=".7"/>`;
  }
  if (wear('back') === 'banner') {
    // A pole behind the viewer's right shoulder, with the guild's gold pennant.
    const px = cx + sh + 14;
    back += `<path d="M${px} 296 L${px + 4} 22" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M${px} 296 L${px + 4} 22" stroke="#B07A2A" stroke-width="5" stroke-linecap="round"/>`;
    back += `<path d="M${px + 4} 30 L${px + 56} 38 L${px + 42} 58 L${px + 56} 78 L${px + 4} 82 Z" fill="${g.lin(
      [
        [0, '#FFE39A'],
        [1, '#C8902A'],
      ],
    )}" ${OUT(3)}/>`;
    back += `<circle cx="${px + 24}" cy="56" r="9" fill="#2E8FA3" stroke="${INK}" stroke-width="2.4"/><circle cx="${px + 24}" cy="56" r="3.5" fill="#FFD36B"/>`;
    back += `<circle cx="${px + 4}" cy="20" r="6" fill="#FFD36B" stroke="${INK}" stroke-width="2.4"/>`;
  }

  // ---- back hair (falls behind the shoulders)
  if (look.hair === 'long' && !look.scarf) {
    back += `<path d="M${cx - 40} 84 Q${cx - 50} 150 ${cx - 36} 166 Q${cx} 174 ${cx + 36} 166 Q${cx + 50} 150 ${cx + 40} 84 Z" fill="${hair}" ${OUT()}/>`;
  }

  // ---- legs (trousers, breeches, sirwal or silks)
  const legs = wear('legs');
  const breeches = legs === 'breeches';
  const [legLight, legDark] =
    legs === 'breeches'
      ? ['#C9A06A', '#7A5530']
      : legs === 'sirwal'
        ? ['#E6D3AE', '#8A7A52']
        : legs === 'silks'
          ? ['#6A7AC8', '#1E2660']
          : legs === 'gold-sirwal'
            ? ['#D9605A', '#5E1418']
            : ['#5A6A8A', '#26324A'];
  const legFill = g.lin([
    [0, legLight],
    [1, legDark],
  ]);
  const legW = sh * 0.36 + 5;
  for (const side of [-1, 1]) {
    const x0 = cx + side * 3;
    const x1 = cx + side * (legW + 4);
    const [l, r] = side < 0 ? [x1, x0] : [x0, x1];
    if (legs === 'sirwal' || legs === 'gold-sirwal') {
      // Baggy, gathered at the ankle. The gold-stitched pair is crimson, with gold down the side.
      const gold = legs === 'gold-sirwal';
      body += `<path d="M${x0} 212 L${x1} 212 Q${x1 + side * 14} 252 ${x1 - side * 3} 282 L${x0 + side * 2} 282 Q${x0 - side * 4} 250 ${x0} 212 Z" fill="${legFill}" ${OUT(3)}/>`;
      if (gold)
        body += `<path d="M${x1 - side * 2} 218 Q${x1 + side * 8} 252 ${x1 - side * 4} 278" stroke="#FFD36B" stroke-width="3.2" fill="none" stroke-dasharray="1 5" stroke-linecap="round"/>`;
      body += `<path d="M${x1 - side * 4} 280 L${x0 + side * 3} 280 L${x0 + side * 3} 290 L${x1 - side * 4} 290 Z" fill="${gold ? '#E8A93A' : '#8A7A52'}" ${OUT(2.6)}/>`;
      continue;
    }
    body += `<path d="M${l} 212 L${r} 212 L${r - side * 1} 290 Q${(l + r) / 2} 293 ${l + side * 1} 290 Z" fill="${legFill}" ${OUT(3)}/>`;
    if (legs === 'silks')
      body += `<path d="M${x1 - side * 4} 216 L${x1 - side * 5} 286" stroke="#FFD36B" stroke-width="3.2" stroke-linecap="round"/>`;
    if (breeches)
      body += `<path d="M${l + 1} 262 H${r - 1}" stroke="#5A3418" stroke-width="5"/><path d="M${l + 1} 262 H${r - 1}" stroke="${INK}" stroke-width="1.6" opacity=".6"/>`;
  }

  // ---- feet
  const boots = wear('feet') === 'boots';
  const riding = wear('feet') === 'ridingboots';
  const sandals = wear('feet') === 'sandals';
  const slippers = wear('feet') === 'slippers';
  for (const side of [-1, 1]) {
    if (slippers) {
      // Gilded slippers, their toes pointed outward and curled up.
      const inner = cx + side * 2;
      const outer = cx + side * (legW + 8);
      body += `<path d="M${inner} 286 L${outer - side * 2} 286 Q${outer + side * 6} ${fy - 2} ${outer + side * 16} ${fy - 12} Q${outer + side * 14} ${fy + 2} ${outer} ${fy} L${inner} ${fy} Z" fill="${g.lin(
        [
          [0, '#FFE39A'],
          [1, '#B07A2A'],
        ],
      )}" ${OUT(2.6)}/>`;
      body += `<circle cx="${(inner + outer) / 2}" cy="292" r="3" fill="#C8302A" stroke="${INK}" stroke-width="1.6"/>`;
      continue;
    }
    if (sandals || riding) {
      const inner = cx + side * 2;
      const outer = cx + side * (legW + 10);
      const [l, r] = side < 0 ? [outer, inner] : [inner, outer];
      if (sandals) {
        body += `<path d="M${l + 3} 288 H${r - 3} Q${r + 2} ${fy - 4} ${r} ${fy} H${l} Q${l - 2} ${fy - 4} ${l + 3} 288 Z" fill="${skinFlat}" ${OUT(2.6)}/>`;
        body += `<path d="M${l - 1} ${fy} H${r + 1}" stroke="#5A3418" stroke-width="4" stroke-linecap="round"/><path d="M${l + 2} 292 L${r - 2} 296 M${r - 2} 292 L${l + 2} 296" stroke="#8A5530" stroke-width="3" stroke-linecap="round"/>`;
      } else {
        const top = 238;
        body += `<path d="M${l + 1} ${top} H${r - 1} Q${r + 2} ${fy - 4} ${r} ${fy} H${l} Q${l - 2} ${fy - 4} ${l + 1} ${top} Z" fill="${g.lin(
          [
            [0, '#4A3A34'],
            [1, '#120C0A'],
          ],
        )}" ${OUT(2.8)}/>`;
        body += `<path d="M${l} ${top + 3} H${r}" stroke="#7A5A44" stroke-width="7"/><rect x="${(l + r) / 2 - 5}" y="${top + 18}" width="10" height="9" rx="2" fill="#FFD36B" stroke="${INK}" stroke-width="2"/>`;
      }
      continue;
    }
    const inner = cx + side * 2;
    const outer = cx + side * (legW + 10);
    const [l, r] = side < 0 ? [outer, inner] : [inner, outer];
    const top = boots ? 262 : 284;
    body += `<path d="M${l + 2} ${top} H${r - 2} Q${r + 2} ${fy - 4} ${r} ${fy} H${l} Q${l - 2} ${fy - 4} ${l + 2} ${top} Z" fill="${
      boots
        ? g.lin([
            [0, '#9A5A34'],
            [1, '#3E2010'],
          ])
        : '#3A2414'
    }" ${OUT(2.8)}/>`;
    if (boots)
      body += `<path d="M${l + 1} ${fy - 6} H${r - 1}" stroke="#E0965A" stroke-width="4" stroke-linecap="round"/><path d="M${l + 2} ${top + 6} H${r - 2}" stroke="#5A3418" stroke-width="3"/>`;
  }

  // ---- torso: plain linen shirt, the tunic (in its dye), or a ware
  const top = wear('torso');
  const tunic = top === 'tunic';
  // The operator's coat is cut like the merchant's coat, in the tower's blue.
  const coat = top === 'coat' || top === 'operator-coat';
  const dye = DYES.find((d) => d.id === look.dye);
  const cloth = tunic
    ? dye
      ? ([dye.light, dye.mid, dye.dark] as const)
      : (['#5FC0D2', '#2E8FA3', '#174E5A'] as const)
    : top === 'robe'
      ? (['#6A7AC8', '#2E3A8A', '#141A44'] as const)
      : top === 'coat'
        ? (['#E0665A', '#A8302A', '#4A0E0C'] as const)
        : top === 'operator-coat'
          ? (['#6A9AE8', '#2A52A8', '#0C1A4A'] as const)
          : (['#FBF1D8', '#E6D3AE', '#A8916A'] as const);
  const hem = tunic ? 236 : top === 'robe' ? 266 : coat ? 258 : 218;
  const torso = `M${cx - 12} 128 Q${cx} 132 ${cx + 12} 128 L${cx + sh} 140 Q${cx + sh + 4} 150 ${cx + sh - 2} 166 L${cx + sh - 6} ${hem} Q${cx} ${hem + 6} ${cx - sh + 6} ${hem} L${cx - sh + 2} 166 Q${cx - sh - 4} 150 ${cx - sh} 140 Z`;
  body += `<path d="M${cx - 9} 112 H${cx + 9} V136 H${cx - 9} Z" fill="${skinFlat}" ${OUT(3)}/>`;
  body += `<path d="${torso}" fill="${g.lin(
    [
      [0, cloth[0]],
      [0.55, cloth[1]],
      [1, cloth[2]],
    ],
    1,
    0.6,
  )}" ${OUT()}/>`;
  const trim = (d: string) =>
    `<path d="${d}" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#FFD36B" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  if (top === 'robe') {
    body += trim(`M${cx} 132 L${cx} ${hem + 2}`);
    body += trim(`M${cx - sh + 7} ${hem - 2} Q${cx} ${hem + 4} ${cx + sh - 7} ${hem - 2}`);
    body += `<path d="M${cx - sh + 4} 198 Q${cx} 204 ${cx + sh - 4} 198" stroke="${INK}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M${cx - sh + 4} 198 Q${cx} 204 ${cx + sh - 4} 198" stroke="#E8A93A" stroke-width="6" fill="none"/>`;
  } else if (coat) {
    body += trim(`M${cx} 134 L${cx} ${hem + 2}`);
    for (const y of [160, 184, 208])
      body += `<circle cx="${cx + 7}" cy="${y}" r="4.5" fill="#FFD36B" stroke="${INK}" stroke-width="2"/>`;
    for (const side of [-1, 1])
      body += `<path d="M${cx + side * (sh - 12)} 134 Q${cx + side * (sh + 6)} 136 ${cx + side * (sh + 4)} 150" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${cx + side * (sh - 12)} 134 Q${cx + side * (sh + 6)} 136 ${cx + side * (sh + 4)} 150" stroke="#FFD36B" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    if (top === 'operator-coat')
      // The tower's spark, stitched in gold on the breast.
      body += `<path d="M${cx - 22} 150 L${cx - 14} 162 L${cx - 20} 164 L${cx - 10} 180" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${cx - 22} 150 L${cx - 14} 162 L${cx - 20} 164 L${cx - 10} 180" stroke="#FFD36B" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (top === 'vest' || top === 'tatreez-vest') {
    // Over the linen shirt: two dark panels with gold stitching. The local's vest is black, with
    // rows of red cross-stitch (tatreez) down each panel.
    const tatreez = top === 'tatreez-vest';
    for (const side of [-1, 1]) {
      const d = `M${cx + side * 11} 129 L${cx + side * sh} 140 Q${cx + side * (sh + 4)} 150 ${cx + side * (sh - 2)} 166 L${cx + side * (sh - 6)} 220 L${cx + side * 7} 222 L${cx + side * 5} 152 Z`;
      body += `<path d="${d}" fill="${g.lin(
        tatreez
          ? [
              [0, '#3A3238'],
              [1, '#141014'],
            ]
          : [
              [0, '#7A3A3A'],
              [1, '#3A1414'],
            ],
      )}" ${OUT(3)}/>`;
      if (!tatreez) {
        body += `<path d="M${cx + side * 10} 150 L${cx + side * 11} 214" stroke="#FFD36B" stroke-width="2.4" stroke-dasharray="4 4"/>`;
        continue;
      }
      for (let y = 156; y <= 208; y += 10)
        for (const dx of [12, 22]) {
          const x = cx + side * dx;
          body += `<path d="M${x - 3} ${y - 3} L${x + 3} ${y + 3} M${x + 3} ${y - 3} L${x - 3} ${y + 3}" stroke="#D8303A" stroke-width="2" stroke-linecap="round"/>`;
        }
    }
  }
  if (tunic) {
    // collar, belt with a brass buckle
    body += `<path d="M${cx - 12} 129 L${cx} 150 L${cx + 12} 129" fill="none" stroke="${cloth[2]}" stroke-width="3"/>`;
    body += `<path d="M${cx - sh + 4} 200 Q${cx} 205 ${cx + sh - 4} 200" stroke="${INK}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M${cx - sh + 4} 200 Q${cx} 205 ${cx + sh - 4} 200" stroke="#7A4A28" stroke-width="5" fill="none"/>`;
    body += `<rect x="${cx - 7}" y="195" width="14" height="13" rx="3" fill="${g.lin([
      [0, '#FFE39A'],
      [1, '#B07A2A'],
    ])}" stroke="${INK}" stroke-width="2.4"/>`;
  } else if (
    !top ||
    top === 'vest' ||
    top === 'tatreez-vest' ||
    top === 'house-sash' ||
    top === 'shawl'
  ) {
    body += `<path d="M${cx - 10} 129 Q${cx} 142 ${cx + 10} 129" fill="none" stroke="#A8916A" stroke-width="2.6"/>`;
    body += `<path d="M${cx - sh + 8} 212 Q${cx} 216 ${cx + sh - 8} 212" stroke="#A8916A" stroke-width="2.4" fill="none" opacity=".8"/>`;
  }

  if (top === 'shawl') {
    // A striped wool shawl over the linen shirt: round the neck and down the front, fringed.
    for (const side of [-1, 1]) {
      const d = `M${cx + side * 8} 127 Q${cx + side * (sh + 6)} 132 ${cx + side * (sh + 2)} 150 L${cx + side * (sh - 6)} 204 L${cx + side * (sh - 24)} 204 L${cx + side * 13} 150 Z`;
      body += `<path d="${d}" fill="${g.lin(
        [
          [0, '#E8A05A'],
          [1, '#8A4A1E'],
        ],
        0,
        1,
      )}" ${OUT(3)}/>`;
      for (const y of [168, 180])
        body += `<path d="M${cx + side * 15} ${y} L${cx + side * (sh - 1)} ${y + 2}" stroke="#5E1A12" stroke-width="3"/>`;
      body += `<path d="M${cx + side * 16} 174 L${cx + side * sh} 176" stroke="#FFD36B" stroke-width="2"/>`;
      for (let k = 0; k < 5; k++) {
        const x = cx + side * (sh - 23 + k * 4);
        body += `<path d="M${x} 204 V213" stroke="#8A4A1E" stroke-width="2" stroke-linecap="round"/>`;
      }
    }
  }

  if (top === 'house-sash') {
    // The house's embroidered sash: over the left shoulder, knotted at the right hip, tasseled.
    const sash = `M${cx + sh - 8} 136 L${cx - sh + 8} 206`;
    body += `<path d="${sash}" stroke="${INK}" stroke-width="21" stroke-linecap="round"/><path d="${sash}" stroke="${g.lin(
      [
        [0, '#E0665A'],
        [1, '#8A1E1A'],
      ],
      1,
      1,
    )}" stroke-width="15" stroke-linecap="round"/><path d="${sash}" stroke="#FFD36B" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>`;
    const [kx, ky] = [cx - sh + 8, 208];
    for (const dx of [-6, 0, 6])
      body += `<path d="M${kx} ${ky} L${kx + dx} ${ky + 26}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M${kx} ${ky} L${kx + dx} ${ky + 26}" stroke="#FFD36B" stroke-width="2.4" stroke-linecap="round"/>`;
    body += `<circle cx="${kx}" cy="${ky}" r="8" fill="#B8302A" stroke="${INK}" stroke-width="2.6"/>`;
  }

  // ---- satchel strap and bag (over the torso)
  if (wear('back') === 'satchel') {
    body += `<path d="M${cx - sh + 6} 138 L${cx + sh - 2} 206" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${cx - sh + 6} 138 L${cx + sh - 2} 206" stroke="#8A5530" stroke-width="5" stroke-linecap="round"/>`;
    body += `<path d="M${cx + sh - 12} 196 Q${cx + sh + 16} 192 ${cx + sh + 18} 200 L${cx + sh + 16} 226 Q${cx + sh + 2} 230 ${cx + sh - 12} 226 Z" fill="${g.lin(
      [
        [0, '#B07A4A'],
        [1, '#5A3418'],
      ],
      1,
      1,
    )}" ${OUT(3)}/><path d="M${cx + sh - 11} 204 Q${cx + sh + 4} 210 ${cx + sh + 17} 204" stroke="${INK}" stroke-width="2.2" fill="none"/>`;
  }
  if (wear('back') === 'waterskin') {
    // A goatskin water bag on a cord over the left shoulder, at the right hip (the viewer's left).
    const [bx, by] = [cx - sh - 4, 246];
    const cord = `M${cx + sh - 6} 138 L${bx + 4} ${by - 26}`;
    body += `<path d="${cord}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="${cord}" stroke="#C9A06A" stroke-width="3.4" stroke-linecap="round"/>`;
    body += `<path d="M${bx + 6} ${by - 18} Q${bx + 24} ${by - 4} ${bx + 18} ${by + 16} Q${bx} ${by + 30} ${bx - 16} ${by + 14} Q${bx - 20} ${by - 6} ${bx - 2} ${by - 16} Z" fill="${g.rad(
      [
        [0, '#C9905A'],
        [0.6, '#8A5530'],
        [1, '#4A2A12'],
      ],
    )}" ${OUT(3)}/>`;
    body += `<path d="M${bx - 2} ${by - 16} L${bx + 4} ${by - 26} L${bx + 10} ${by - 16}" fill="#5A3418" stroke="${INK}" stroke-width="2.4"/><circle cx="${bx + 4}" cy="${by - 27}" r="3.5" fill="#E8A93A" stroke="${INK}" stroke-width="1.8"/>`;
    body += `<path d="M${bx - 10} ${by + 2} Q${bx} ${by + 8} ${bx + 12} ${by}" stroke="${INK}" stroke-width="1.8" fill="none" opacity=".5"/>`;
  }
  if (cloak) {
    body += `<path d="M${cx - 14} 130 Q${cx} 140 ${cx + 14} 130" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M${cx - 14} 130 Q${cx} 140 ${cx + 14} 130" stroke="${cloak[0]}" stroke-width="4" fill="none"/><circle cx="${cx}" cy="138" r="5" fill="#FFD36B" stroke="${INK}" stroke-width="2"/>`;
  }

  // ---- staff (held in the right hand, the viewer's left; drawn behind the hand)
  const handL = [cx - sh - 8, 212] as const;
  const handR = [cx + sh + 8, 212] as const;
  if (wear('hand') === 'staff') {
    body += `<path d="M${handL[0] - 4} 96 L${handL[0] + 3} ${fy - 2}" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M${handL[0] - 4} 96 L${handL[0] + 3} ${fy - 2}" stroke="${g.lin(
      [
        [0, '#C08A55'],
        [1, '#6E4220'],
      ],
      1,
      0,
    )}" stroke-width="6" stroke-linecap="round"/><path d="M${handL[0] - 10} 104 Q${handL[0] - 4} 88 ${handL[0] + 4} 100" stroke="${INK}" stroke-width="3" fill="none"/>`;
  }

  if (wear('hand') === 'flags') {
    // A semaphore flag (red and yellow) on a short stick, held up in the right hand.
    body += `<path d="M${handL[0]} 214 L${handL[0] - 4} 140" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${handL[0]} 214 L${handL[0] - 4} 140" stroke="#C08A55" stroke-width="4" stroke-linecap="round"/>`;
    body += `<path d="M${handL[0] - 4} 142 L${handL[0] - 38} 146 L${handL[0] - 36} 176 L${handL[0] - 2} 172 Z" fill="#FFD36B" ${OUT(3)}/><path d="M${handL[0] - 4} 142 L${handL[0] - 36} 176 L${handL[0] - 2} 172 Z" fill="#C8302A"/>`;
    body += `<path d="M${handL[0] - 4} 142 L${handL[0] - 38} 146 L${handL[0] - 36} 176 L${handL[0] - 2} 172 Z" fill="none" ${OUT(3)}/>`;
  }
  if (wear('hand') === 'scroll') {
    // A rolled map, held across the left hand.
    const [hx, hy] = handR;
    body += `<rect x="${hx - 30}" y="${hy - 8}" width="44" height="16" rx="5" fill="${g.lin(
      [
        [0, '#FBF1D8'],
        [1, '#C9A87A'],
      ],
      0,
      1,
    )}" ${OUT(3)}/><path d="M${hx - 30} ${hy - 1} H${hx + 14}" stroke="#C8553D" stroke-width="2.4"/>`;
    for (const x of [hx - 32, hx + 12])
      body += `<rect x="${x}" y="${hy - 11}" width="6" height="22" rx="3" fill="#8A5530" stroke="${INK}" stroke-width="2.2"/>`;
  }

  // ---- arms (sleeves) and big hands
  const sleeve = tunic || top === 'robe' || coat ? cloth[1] : '#E6D3AE';
  for (const [side, hand] of [
    [-1, handL],
    [1, handR],
  ] as const) {
    const s = cx + side * (sh - 3);
    const d = `M${s} 146 Q${s + side * 16} 176 ${hand[0]} ${hand[1] - 8}`;
    body += `<path d="${d}" stroke="${INK}" stroke-width="20" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${sleeve}" stroke-width="13" stroke-linecap="round" fill="none"/>`;
    if (coat) {
      const cuff = `M${hand[0] - side * 8} ${hand[1] - 22} L${hand[0] + side * 3} ${hand[1] - 13}`;
      body += `<path d="${cuff}" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="${cuff}" stroke="#FFD36B" stroke-width="9" stroke-linecap="round"/>`;
    }
    body += `<circle cx="${hand[0]}" cy="${hand[1]}" r="10.5" fill="${skin}" ${OUT(3)}/>`;
  }
  if (wear('hand') === 'lamp') {
    // A brass signal lamp hanging from the left hand, its glass lit.
    const [hx, hy] = handR;
    body += `<path d="M${hx} ${hy + 6} V${hy + 18}" stroke="${INK}" stroke-width="4"/>`;
    body += `<path d="M${hx - 13} ${hy + 26} L${hx} ${hy + 16} L${hx + 13} ${hy + 26} Z" fill="#E8A93A" ${OUT(2.6)}/>`;
    body += `<rect x="${hx - 11}" y="${hy + 26}" width="22" height="26" rx="3" fill="${g.rad(
      [
        [0, '#FFF6C8'],
        [0.5, '#FFD36B'],
        [1, '#D9902A'],
      ],
      0.5,
      0.5,
      0.7,
    )}" ${OUT(2.6)}/><path d="M${hx} ${hy + 27} V${hy + 51}" stroke="#B07A2A" stroke-width="2"/>`;
    body += `<rect x="${hx - 14}" y="${hy + 50}" width="28" height="7" rx="2" fill="#B07A2A" ${OUT(2.4)}/>`;
  }

  if (wear('hand') === 'brass-key') {
    // The keyer's straight key, held out on its wooden base: a brass lever and a black knob.
    const [hx, hy] = handR;
    body += `<rect x="${hx - 24}" y="${hy + 12}" width="48" height="12" rx="3" fill="${g.lin(
      [
        [0, '#C08A55'],
        [1, '#5A3418'],
      ],
      0,
      1,
    )}" ${OUT(2.6)}/>`;
    body += `<path d="M${hx - 18} ${hy + 10} L${hx + 14} ${hy + 4}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${hx - 18} ${hy + 10} L${hx + 14} ${hy + 4}" stroke="#FFD36B" stroke-width="4" stroke-linecap="round"/>`;
    body += `<circle cx="${hx - 16}" cy="${hy + 12}" r="4" fill="#E8A93A" stroke="${INK}" stroke-width="2"/>`;
    body += `<ellipse cx="${hx + 18}" cy="${hy + 2}" rx="8" ry="6" fill="#2A1A14" stroke="${INK}" stroke-width="2.4"/><ellipse cx="${hx + 16}" cy="${hy}" rx="3" ry="2" fill="#7A6A64"/>`;
  }
  if (wear('hand') === 'night-lantern') {
    // The night watch's iron lantern, hanging from the left hand, its light cold and clear.
    const [hx, hy] = handR;
    body += `<path d="M${hx - 7} ${hy + 14} Q${hx} ${hy + 2} ${hx + 7} ${hy + 14}" stroke="${INK}" stroke-width="3.4" fill="none"/>`;
    body += `<path d="M${hx - 14} ${hy + 26} L${hx - 8} ${hy + 14} H${hx + 8} L${hx + 14} ${hy + 26} Z" fill="#3A3A44" ${OUT(2.6)}/>`;
    body += `<rect x="${hx - 12}" y="${hy + 26}" width="24" height="32" rx="3" fill="${g.rad(
      [
        [0, '#FFFFFF'],
        [0.5, '#CDE6FF'],
        [1, '#5A86B8'],
      ],
      0.5,
      0.5,
      0.7,
    )}" ${OUT(2.6)}/>`;
    for (const dx of [-5, 5])
      body += `<path d="M${hx + dx} ${hy + 27} V${hy + 57}" stroke="#3A3A44" stroke-width="2.6"/>`;
    body += `<rect x="${hx - 15}" y="${hy + 56}" width="30" height="8" rx="2" fill="#3A3A44" ${OUT(2.4)}/>`;
  }
  if (wear('hand') === 'beacon-lens') {
    // Keeper of the Beacon (Forty Winters): a round lens from the tower's lamp, ringed in brass
    // and held up by its handle, still glowing.
    const [hx, hy] = handR;
    body += `<path d="M${hx} ${hy + 8} L${hx + 4} ${hy - 22}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${hx} ${hy + 8} L${hx + 4} ${hy - 22}" stroke="#8A5A20" stroke-width="5" stroke-linecap="round"/>`;
    body += `<circle cx="${hx + 6}" cy="${hy - 46}" r="30" fill="${g.rad(
      [
        [0, '#FFFBEA'],
        [0.45, '#FFD36B'],
        [1, '#E8A93A'],
      ],
      0.5,
      0.5,
      0.6,
    )}" stroke="${INK}" stroke-width="3"/>`;
    body += `<circle cx="${hx + 6}" cy="${hy - 46}" r="30" fill="none" stroke="#F0C46A" stroke-width="5"/><circle cx="${hx + 6}" cy="${hy - 46}" r="33" fill="none" stroke="${INK}" stroke-width="2.4"/>`;
    for (const r of [10, 19])
      body += `<circle cx="${hx + 6}" cy="${hy - 46}" r="${r}" fill="none" stroke="#C88A2A" stroke-width="1.8" opacity=".7"/>`;
  }
  if (wear('hand') === 'olive-sprig') {
    // A neighbor's olive sprig: a twig in the left hand, silver-green leaves and two olives.
    const [hx, hy] = handR;
    body += `<path d="M${hx} ${hy + 6} Q${hx + 14} ${hy - 30} ${hx + 8} ${hy - 70}" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M${hx} ${hy + 6} Q${hx + 14} ${hy - 30} ${hx + 8} ${hy - 70}" stroke="#7A5A3A" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    for (const [lx, ly, rot] of [
      [14, -14, 40],
      [-2, -26, -40],
      [18, -38, 35],
      [2, -50, -35],
      [16, -60, 25],
      [6, -72, -10],
    ] as const)
      body += `<ellipse cx="${hx + lx}" cy="${hy + ly}" rx="12" ry="4.6" fill="#8FA878" stroke="${INK}" stroke-width="2" transform="rotate(${rot} ${hx + lx} ${hy + ly})"/>`;
    for (const [ox, oy] of [
      [18, -24],
      [0, -40],
      [16, -52],
    ] as const)
      body += `<circle cx="${hx + ox}" cy="${hy + oy}" r="4.6" fill="#3E4A24" stroke="${INK}" stroke-width="1.8"/>`;
  }
  if (wear('hand') === 'dallah') {
    // A friend's coffee pot (dallah): brass, a tall lid with a finial, a long curved spout.
    const [hx, hy] = handR;
    const brass = g.lin(
      [
        [0, '#FFF0B8'],
        [0.5, '#E8A93A'],
        [1, '#7A4A10'],
      ],
      1,
      0.3,
    );
    body += `<path d="M${hx + 12} ${hy + 6} Q${hx + 24} ${hy - 4} ${hx + 30} ${hy - 22}" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M${hx + 12} ${hy + 6} Q${hx + 24} ${hy - 4} ${hx + 30} ${hy - 22}" stroke="#E8A93A" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    body += `<path d="M${hx - 13} ${hy - 4} Q${hx - 18} ${hy + 18} ${hx - 10} ${hy + 30} H${hx + 10} Q${hx + 18} ${hy + 18} ${hx + 13} ${hy - 4} Z" fill="${brass}" ${OUT(2.6)}/>`;
    body += `<path d="M${hx - 9} ${hy - 4} L${hx - 6} ${hy - 20} H${hx + 6} L${hx + 9} ${hy - 4} Z" fill="${brass}" ${OUT(2.4)}/><circle cx="${hx}" cy="${hy - 24}" r="4" fill="#E8A93A" stroke="${INK}" stroke-width="2"/>`;
    body += `<path d="M${hx - 12} ${hy - 2} Q${hx - 24} ${hy + 8} ${hx - 12} ${hy + 20}" stroke="${INK}" stroke-width="3.4" fill="none"/>`;
  }

  if (wear('hand') === 'falcon') {
    // A falconer's leather glove on the left hand, and the falcon perched on it.
    const [hx, hy] = handR;
    body += `<g transform="translate(${hx} ${hy}) scale(1.3) translate(${-hx} ${-hy})">`;
    body += `<path d="M${hx - 12} ${hy - 4} Q${hx - 16} ${hy - 22} ${hx - 4} ${hy - 26} L${hx + 10} ${hy - 20} Q${hx + 14} ${hy - 6} ${hx + 10} ${hy + 4} Z" fill="#8A5530" ${OUT(2.6)}/>`;
    body += `<circle cx="${hx}" cy="${hy}" r="9" fill="#A8642E" ${OUT(2.4)}/>`;
    const [fx, fyy] = [hx + 2, hy - 34];
    // tail, body, wing, head, beak, eye, talons
    body += `<path d="M${fx - 6} ${fyy + 18} L${fx - 10} ${fyy + 40} L${fx + 2} ${fyy + 40} L${fx + 4} ${fyy + 18} Z" fill="#5A3A22" ${OUT(2.4)}/>`;
    body += `<ellipse cx="${fx}" cy="${fyy}" rx="13" ry="22" fill="${g.lin(
      [
        [0, '#E8D8B8'],
        [0.5, '#B89A6A'],
        [1, '#6A4A2A'],
      ],
      1,
      0,
    )}" ${OUT(2.8)}/>`;
    for (const dy of [-6, 2, 10])
      body += `<path d="M${fx - 4} ${fyy + dy} q2 3 4 0 q2 3 4 0" stroke="#5A3A22" stroke-width="1.6" fill="none"/>`;
    body += `<path d="M${fx - 12} ${fyy - 8} Q${fx - 22} ${fyy + 10} ${fx - 10} ${fyy + 28} Q${fx - 4} ${fyy + 8} ${fx - 12} ${fyy - 8} Z" fill="#6A4A2A" ${OUT(2.4)}/>`;
    body += `<circle cx="${fx + 2}" cy="${fyy - 26}" r="10" fill="#6A5A4A" ${OUT(2.6)}/><path d="M${fx - 2} ${fyy - 20} Q${fx + 4} ${fyy - 14} ${fx + 8} ${fyy - 22}" fill="#E8D8B8"/>`;
    body += `<path d="M${fx + 10} ${fyy - 29} L${fx + 18} ${fyy - 25} L${fx + 10} ${fyy - 21} Z" fill="#E8A93A" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`;
    body += `<circle cx="${fx + 5}" cy="${fyy - 28}" r="2.6" fill="${INK}"/><circle cx="${fx + 5.6}" cy="${fyy - 28.8}" r=".9" fill="#FFF"/>`;
    for (const dx of [-5, 4])
      body += `<path d="M${fx + dx} ${fyy + 20} V${fyy + 26}" stroke="#E8A93A" stroke-width="3" stroke-linecap="round"/>`;
    body += `</g>`;
  }

  // ---- head
  front += `<ellipse cx="${cx - 35}" cy="92" rx="6" ry="9" fill="${skinFlat}" ${OUT(3)}/><ellipse cx="${cx + 35}" cy="92" rx="6" ry="9" fill="${skinFlat}" ${OUT(3)}/>`;
  front += `<ellipse cx="${cx}" cy="86" rx="35" ry="38" fill="${skin}" ${OUT()}/>`;

  // ---- face
  front += face(look.face, cx);
  if (look.beard === 'stubble') {
    front += `<path d="M${cx - 30} 98 Q${cx - 26} 122 ${cx} 124 Q${cx + 26} 122 ${cx + 30} 98 Q${cx + 22} 112 ${cx} 112 Q${cx - 22} 112 ${cx - 30} 98 Z" fill="${hairT.dark}" opacity=".28"/>`;
  } else if (look.beard === 'full') {
    front += `<path d="M${cx - 33} 92 Q${cx - 30} 134 ${cx} 138 Q${cx + 30} 134 ${cx + 33} 92 Q${cx + 26} 108 ${cx + 14} 110 Q${cx} 104 ${cx - 14} 110 Q${cx - 26} 108 ${cx - 33} 92 Z" fill="${hair}" ${OUT(2.8)}/><path d="M${cx - 8} 117 Q${cx} 121 ${cx + 8} 117" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  }

  // ---- front hair (hidden under the wrap, except long hair at the sides)
  const wrap = wear('head') === 'wrap';
  const turban = wear('head') === 'turban';
  const keffiyeh = wear('head') === 'keffiyeh';
  if (look.scarf) front += headscarf(look.scarf, cx, g);
  else if (!wrap && !turban && !keffiyeh) front += hairFront(look.hair, cx, hair, hairT.light);

  // ---- head gear
  if (wrap) {
    const cloth = g.lin(
      [
        [0, '#F2D49A'],
        [0.55, '#D9A85E'],
        [1, '#8A5A2A'],
      ],
      1,
      1,
    );
    front += `<path d="M${cx + 30} 70 Q${cx + 50} 110 ${cx + 40} 150 Q${cx + 30} 152 ${cx + 26} 146 Q${cx + 34} 112 ${cx + 22} 84 Z" fill="${cloth}" ${OUT(3)}/>`;
    front += `<path d="M${cx + 33} 96 Q${cx + 42} 120 ${cx + 36} 146" stroke="#C8553D" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    front += `<path d="M${cx - 38} 82 Q${cx - 42} 40 ${cx} 38 Q${cx + 42} 40 ${cx + 38} 82 Q${cx + 20} 70 ${cx} 70 Q${cx - 20} 70 ${cx - 38} 82 Z" fill="${cloth}" ${OUT()}/>`;
    front += `<path d="M${cx - 34} 66 Q${cx} 56 ${cx + 34} 66 M${cx - 28} 52 Q${cx + 4} 44 ${cx + 30} 54" stroke="#8A5A2A" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>`;
    front += `<path d="M${cx - 38} 80 Q${cx} 66 ${cx + 38} 80" stroke="#C8553D" stroke-width="5" fill="none"/>`;
  } else if (keffiyeh) {
    // White with the red check, falling to the shoulders, held by the black agal.
    const cloth = g.lin(
      [
        [0, '#FFFFFF'],
        [0.6, '#F2E6D8'],
        [1, '#B8A890'],
      ],
      1,
      1,
    );
    for (const side of [-1, 1])
      front += `<path d="M${cx + side * 30} 72 Q${cx + side * 52} 108 ${cx + side * 48} 150 L${cx + side * 28} 146 Q${cx + side * 34} 112 ${cx + side * 26} 86 Z" fill="${cloth}" ${OUT(3)}/><path d="M${cx + side * 40} 104 L${cx + side * 36} 144 M${cx + side * 46} 112 L${cx + side * 43} 146" stroke="#C8302A" stroke-width="2.2" stroke-dasharray="3 4"/>`;
    front += `<path d="M${cx - 40} 84 Q${cx - 46} 36 ${cx} 34 Q${cx + 46} 36 ${cx + 40} 84 Q${cx + 20} 70 ${cx} 70 Q${cx - 20} 70 ${cx - 40} 84 Z" fill="${cloth}" ${OUT()}/>`;
    front += `<path d="M${cx - 30} 50 Q${cx} 40 ${cx + 30} 50 M${cx - 36} 64 Q${cx} 52 ${cx + 36} 64 M${cx - 16} 40 L${cx - 22} 74 M${cx + 16} 40 L${cx + 22} 74 M${cx} 36 V70" stroke="#C8302A" stroke-width="2.2" fill="none" stroke-dasharray="3 4"/>`;
    for (const y of [58, 66])
      front += `<path d="M${cx - 39} ${y + 10} Q${cx} ${y - 10} ${cx + 39} ${y + 10}" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  } else if (wear('head') === 'ear-cups') {
    // Brass ear-cups on a leather band.
    front += `<path d="M${cx - 38} 86 Q${cx - 42} 34 ${cx} 34 Q${cx + 42} 34 ${cx + 38} 86" stroke="${INK}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M${cx - 38} 86 Q${cx - 42} 34 ${cx} 34 Q${cx + 42} 34 ${cx + 38} 86" stroke="#8A5530" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    for (const side of [-1, 1])
      front += `<circle cx="${cx + side * 39}" cy="92" r="14" fill="${g.rad([
        [0, '#FFF0B8'],
        [0.55, '#E8A93A'],
        [1, '#7A4A10'],
      ])}" ${OUT(3)}/><circle cx="${cx + side * 39}" cy="92" r="6" fill="#5A3418" stroke="${INK}" stroke-width="1.6"/>`;
  } else if (wear('head') === 'headset') {
    front += `<path d="M${cx - 37} 84 Q${cx - 40} 36 ${cx} 36 Q${cx + 40} 36 ${cx + 37} 84" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${cx - 37} 84 Q${cx - 40} 36 ${cx} 36 Q${cx + 40} 36 ${cx + 37} 84" stroke="#7A8A9A" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    for (const side of [-1, 1])
      front += `<rect x="${cx + side * 38 - 9}" y="78" width="18" height="26" rx="7" fill="${g.lin([
        [0, '#5FC0D2'],
        [1, '#174E5A'],
      ])}" ${OUT(3)}/>`;
    front += `<path d="M${cx - 38} 100 Q${cx - 34} 118 ${cx - 14} 116" stroke="${INK}" stroke-width="3" fill="none"/><circle cx="${cx - 13}" cy="116" r="4" fill="#FFD36B" stroke="${INK}" stroke-width="2"/>`;
  } else if (wear('head') === 'signal-cap') {
    // The signal master's peaked cap: tower blue, a black visor, the gold spark on the band.
    front += `<path d="M${cx - 36} 66 Q${cx - 40} 30 ${cx} 28 Q${cx + 40} 30 ${cx + 36} 66 Z" fill="${g.lin(
      [
        [0, '#6A9AE8'],
        [0.6, '#2A52A8'],
        [1, '#0C1A4A'],
      ],
      1,
      0.4,
    )}" ${OUT()}/>`;
    front += `<path d="M${cx - 36} 64 H${cx + 36}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M${cx - 34} 64 H${cx + 34}" stroke="#FFD36B" stroke-width="4"/>`;
    front += `<path d="M${cx - 34} 68 Q${cx} 84 ${cx + 34} 68 Q${cx} 76 ${cx - 34} 68 Z" fill="#141A2A" ${OUT(2.4)}/>`;
    front += `<path d="M${cx - 4} 38 L${cx + 4} 48 L${cx - 2} 50 L${cx + 6} 60" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${cx - 4} 38 L${cx + 4} 48 L${cx - 2} 50 L${cx + 6} 60" stroke="#FFD36B" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (turban) {
    const cloth = g.lin(
      [
        [0, '#FFFFFF'],
        [0.5, '#F2E6CC'],
        [1, '#A8916A'],
      ],
      1,
      1,
    );
    front += `<path d="M${cx - 41} 84 Q${cx - 50} 28 ${cx} 24 Q${cx + 50} 28 ${cx + 41} 84 Q${cx + 20} 68 ${cx} 68 Q${cx - 20} 68 ${cx - 41} 84 Z" fill="${cloth}" ${OUT()}/>`;
    front += `<path d="M${cx - 38} 70 Q${cx - 4} 34 ${cx + 36} 46 M${cx - 40} 54 Q${cx} 30 ${cx + 30} 34 M${cx - 30} 76 Q${cx + 10} 50 ${cx + 40} 66" stroke="#A8916A" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>`;
    front += `<path d="M${cx} 64 Q${cx - 4} 40 ${cx + 6} 26" stroke="#3E7A4A" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    front += `<ellipse cx="${cx}" cy="62" rx="7" ry="8" fill="#3EB87A" stroke="${INK}" stroke-width="2.4"/><circle cx="${cx - 2}" cy="59" r="2" fill="#FFF"/>`;
  } else if (wear('head') === 'tarboosh') {
    front += `<path d="M${cx - 25} 58 L${cx - 19} 22 Q${cx} 18 ${cx + 19} 22 L${cx + 25} 58 Q${cx} 64 ${cx - 25} 58 Z" fill="${g.lin(
      [
        [0, '#E8604A'],
        [0.6, '#B8302A'],
        [1, '#5E1210'],
      ],
      1,
      0.4,
    )}" ${OUT()}/>`;
    front += `<path d="M${cx} 21 Q${cx + 22} 22 ${cx + 26} 42" stroke="${INK}" stroke-width="3" fill="none"/><path d="M${cx + 22} 40 L${cx + 30} 40 L${cx + 32} 58 L${cx + 20} 58 Z" fill="${INK}"/>`;
  } else if (wear('head') === 'kufi') {
    // A round cap on the crown, with an embroidered band.
    front += `<path d="M${cx - 31} 64 Q${cx - 33} 38 ${cx} 36 Q${cx + 33} 38 ${cx + 31} 64 Q${cx} 56 ${cx - 31} 64 Z" fill="${g.lin(
      [
        [0, '#FFFFFF'],
        [0.6, '#F2E6CC'],
        [1, '#A8916A'],
      ],
      1,
      1,
    )}" ${OUT()}/>`;
    front += `<path d="M${cx - 30} 60 Q${cx} 50 ${cx + 30} 60" stroke="#3E7A4A" stroke-width="6" fill="none"/><path d="M${cx - 28} 59 Q${cx} 49 ${cx + 28} 59" stroke="#FFD36B" stroke-width="2.4" fill="none" stroke-dasharray="3 4"/>`;
    front += `<path d="M${cx - 18} 44 Q${cx} 38 ${cx + 18} 44" stroke="#A8916A" stroke-width="1.8" fill="none" stroke-dasharray="2 4"/>`;
  } else if (wear('head') === 'sunhat') {
    const straw = g.lin(
      [
        [0, '#FBE7A8'],
        [0.6, '#E0B860'],
        [1, '#8A6A2A'],
      ],
      1,
      1,
    );
    front += `<ellipse cx="${cx}" cy="58" rx="62" ry="13" fill="${straw}" ${OUT()}/>`;
    front += `<path d="M${cx - 30} 58 Q${cx - 32} 20 ${cx} 18 Q${cx + 32} 20 ${cx + 30} 58 Q${cx} 64 ${cx - 30} 58 Z" fill="${straw}" ${OUT()}/>`;
    front += `<path d="M${cx - 30} 50 Q${cx} 56 ${cx + 30} 50" stroke="#C8553D" stroke-width="6" fill="none"/>`;
  }

  // ---- the companion, sitting at your feet (the viewer's right)
  const pet = wear('pet');
  // It stays inside the 200-wide box: the camel calf, the widest, sits a little further in.
  const petX = cx + (pet === 'camel-calf' ? 54 : 60);
  if (pet) front += `<g transform="translate(${petX} ${fy}) scale(.95)">${companion(pet, g)}</g>`;

  return `<defs>${g.defs.join('')}</defs>${back}${body}${front}`;
}

/** A companion, drawn with its feet on (0, 0); it fits in about 60 by 64. */
function companion(id: string, g: Grads): string {
  const fur = (light: string, dark: string) =>
    g.lin(
      [
        [0, light],
        [1, dark],
      ],
      1,
      1,
    );
  const eye = (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="2.6" fill="${INK}"/><circle cx="${x + 0.8}" cy="${y - 0.8}" r=".9" fill="#FFF"/>`;
  switch (id) {
    case 'sand-cat': {
      // A sand cat sitting up: broad head, low ears, a ringed tail curled round the front.
      const f = fur('#F2D9A8', '#A8804A');
      return (
        `<path d="M-16 0 Q-18 -26 0 -30 Q18 -26 16 0 Z" fill="${f}" ${OUT(2.6)}/>` +
        `<path d="M14 -4 Q30 -6 26 -20" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M14 -4 Q30 -6 26 -20" stroke="#D9B47A" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M27 -12 l-5 1 M25 -18 l-5 -1" stroke="#5A3A1E" stroke-width="2"/>` +
        `<path d="M-15 -40 L-20 -54 L-6 -48 Z M15 -40 L20 -54 L6 -48 Z" fill="${f}" ${OUT(2.4)}/><path d="M-15 -44 L-17 -51 L-10 -48 Z M15 -44 L17 -51 L10 -48 Z" fill="#E89A8A"/>` +
        `<ellipse cx="0" cy="-38" rx="16" ry="13" fill="${f}" ${OUT(2.6)}/>` +
        eye(-6, -40) +
        eye(6, -40) +
        `<path d="M-2 -34 L2 -34 L0 -31 Z" fill="#C86A5A"/><path d="M-9 -33 L-18 -34 M-9 -31 L-18 -29 M9 -33 L18 -34 M9 -31 L18 -29" stroke="${INK}" stroke-width="1" opacity=".6"/>` +
        `<path d="M-8 0 V-8 M8 0 V-8" stroke="${INK}" stroke-width="2" opacity=".5"/>`
      );
    }
    case 'hedgehog': {
      // A desert hedgehog: a spiny dome, pale face and big ears, looking to the viewer's right.
      let spines = '';
      for (let k = 0; k < 9; k++) {
        const t = Math.PI * (0.08 + (k / 8) * 0.8);
        const [x, y] = [-4 - Math.cos(t) * 18, -10 - Math.sin(t) * 13];
        spines += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${(-Math.cos(t) * 7).toFixed(1)} ${(-Math.sin(t) * 7).toFixed(1)}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
      }
      return (
        spines +
        `<path d="M-24 0 Q-26 -26 -4 -26 Q12 -26 14 -10 L10 0 Z" fill="${fur('#8A6A4A', '#3A2A1A')}" ${OUT(2.6)}/>` +
        `<path d="M-18 -8 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l4 6" stroke="#C9A87A" stroke-width="1.6" fill="none" opacity=".7"/>` +
        `<ellipse cx="4" cy="-22" rx="5" ry="7" fill="#E8C9A0" ${OUT(2)}/>` +
        `<path d="M6 -2 Q4 -18 14 -16 Q24 -12 26 -6 Q20 0 6 -2 Z" fill="#F2DDB8" ${OUT(2.4)}/>` +
        eye(15, -11) +
        `<circle cx="26" cy="-6" r="2.6" fill="${INK}"/>`
      );
    }
    case 'fennec': {
      // A fennec fox sitting up: cream fur, huge ears, a black-tipped brush of a tail.
      const f = fur('#FBEBCB', '#C9A06A');
      return (
        `<path d="M10 -2 Q34 -2 30 -20" stroke="${INK}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M10 -2 Q34 -2 30 -20" stroke="#E8CC98" stroke-width="8.5" fill="none" stroke-linecap="round"/><circle cx="30" cy="-21" r="5" fill="${INK}"/>` +
        `<path d="M-13 0 Q-15 -24 0 -28 Q15 -24 13 0 Z" fill="${f}" ${OUT(2.6)}/>` +
        `<path d="M-4 -26 Q0 -10 4 -26" fill="#FFF8EA"/>` +
        `<path d="M-8 -40 L-24 -66 L-2 -48 Z M8 -40 L24 -66 L2 -48 Z" fill="${f}" ${OUT(2.4)}/><path d="M-9 -44 L-20 -60 L-5 -48 Z M9 -44 L20 -60 L5 -48 Z" fill="#F2B8A8"/>` +
        `<path d="M-12 -40 Q-12 -50 0 -50 Q12 -50 12 -40 Q8 -30 0 -27 Q-8 -30 -12 -40 Z" fill="${f}" ${OUT(2.6)}/>` +
        eye(-5, -41) +
        eye(5, -41) +
        `<circle cx="0" cy="-30" r="2.4" fill="${INK}"/>`
      );
    }
    case 'camel-calf': {
      // A young camel standing side-on, facing the viewer's right, with a striped saddle blanket.
      const f = fur('#E8C08A', '#9A6A3A');
      return (
        `<path d="M-14 -22 L-16 0 M-6 -22 L-6 0 M8 -22 L8 0 M16 -22 L18 0" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M-14 -22 L-16 0 M-6 -22 L-6 0 M8 -22 L8 0 M16 -22 L18 0" stroke="#C99A62" stroke-width="3.5" stroke-linecap="round"/>` +
        `<path d="M-22 -30 Q-22 -42 -8 -44 Q0 -58 10 -44 Q22 -42 22 -30 Q22 -18 0 -18 Q-22 -18 -22 -30 Z" fill="${f}" ${OUT(2.6)}/>` +
        `<path d="M-22 -32 Q-30 -30 -28 -22" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
        `<path d="M-6 -44 Q2 -50 10 -44 L10 -32 L-6 -32 Z" fill="#C8302A" stroke="${INK}" stroke-width="2"/><path d="M-6 -38 H10" stroke="#FFD36B" stroke-width="2.4"/>` +
        `<path d="M16 -36 Q26 -40 24 -54 L32 -56 Q32 -40 24 -30 Z" fill="${f}" ${OUT(2.4)}/>` +
        `<path d="M22 -56 Q24 -64 34 -62 Q42 -60 40 -54 Q36 -50 26 -52 Z" fill="${f}" ${OUT(2.4)}/><path d="M26 -61 L24 -66" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` +
        eye(31, -58)
      );
    }
    default:
      return '';
  }
}

function face(id: Look['face'], cx: number): string {
  const eye = (x: number, ry = 5.5) =>
    `<ellipse cx="${x}" cy="88" rx="4.2" ry="${ry}" fill="${INK}"/><circle cx="${x + 1.4}" cy="86" r="1.5" fill="#FFF"/>`;
  const cheeks = `<ellipse cx="${cx - 22}" cy="102" rx="6.5" ry="3.8" fill="#E8836A" opacity=".45"/><ellipse cx="${cx + 22}" cy="102" rx="6.5" ry="3.8" fill="#E8836A" opacity=".45"/>`;
  const nose = `<path d="M${cx + 1} 92 Q${cx + 5} 99 ${cx - 1} 101" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55"/>`;
  const line = (d: string, w = 3) =>
    `<path d="${d}" stroke="${INK}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  switch (id) {
    case 'cheerful':
      return (
        eye(cx - 13) +
        eye(cx + 13) +
        line(`M${cx - 19} 76 Q${cx - 13} 72 ${cx - 7} 75`, 2.6) +
        line(`M${cx + 7} 75 Q${cx + 13} 72 ${cx + 19} 76`, 2.6) +
        nose +
        line(`M${cx - 10} 108 Q${cx} 116 ${cx + 10} 108`) +
        cheeks
      );
    case 'determined':
      return (
        eye(cx - 13, 4.6) +
        eye(cx + 13, 4.6) +
        line(`M${cx - 21} 76 L${cx - 6} 80`, 3.4) +
        line(`M${cx + 6} 80 L${cx + 21} 76`, 3.4) +
        nose +
        line(`M${cx - 9} 110 Q${cx + 2} 112 ${cx + 10} 107`)
      );
    case 'calm':
      return (
        line(`M${cx - 18} 88 Q${cx - 13} 93 ${cx - 8} 88`) +
        line(`M${cx + 8} 88 Q${cx + 13} 93 ${cx + 18} 88`) +
        line(`M${cx - 19} 78 Q${cx - 13} 75 ${cx - 7} 78`, 2.4) +
        line(`M${cx + 7} 78 Q${cx + 13} 75 ${cx + 19} 78`, 2.4) +
        nose +
        line(`M${cx - 7} 108 Q${cx} 112 ${cx + 7} 108`, 2.6) +
        cheeks
      );
    case 'bold':
      return (
        eye(cx - 13, 6.5) +
        eye(cx + 13, 6.5) +
        line(`M${cx - 20} 74 Q${cx - 13} 69 ${cx - 6} 73`, 3) +
        line(`M${cx + 6} 73 Q${cx + 13} 69 ${cx + 20} 74`, 3) +
        nose +
        `<path d="M${cx - 12} 106 Q${cx} 108 ${cx + 12} 106 Q${cx + 10} 120 ${cx} 120 Q${cx - 10} 120 ${cx - 12} 106 Z" fill="#7A2A20" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M${cx - 9} 107.5 H${cx + 9}" stroke="#FFF" stroke-width="3"/>` +
        cheeks
      );
  }
}

/** A headscarf: cloth around the face, over the hair and ears, falling to the shoulders. */
function headscarf(id: ScarfId, cx: number, g: Grads): string {
  const c = SCARVES.find((s) => s.id === id) ?? SCARVES[0];
  const cloth = g.lin(
    [
      [0, c.light],
      [1, c.dark],
    ],
    0.6,
    1,
  );
  const outer = `M${cx - 46} 156 Q${cx - 52} 104 ${cx - 45} 70 Q${cx - 40} 32 ${cx} 30 Q${cx + 40} 32 ${cx + 45} 70 Q${cx + 52} 104 ${cx + 46} 156 Q${cx + 26} 174 ${cx} 174 Q${cx - 26} 174 ${cx - 46} 156 Z`;
  const opening = `M${cx - 28} 90 Q${cx - 29} 54 ${cx} 53 Q${cx + 29} 54 ${cx + 28} 90 Q${cx + 26} 121 ${cx} 126 Q${cx - 26} 121 ${cx - 28} 90 Z`;
  return (
    `<path d="${outer} ${opening}" fill="${cloth}" fill-rule="evenodd" ${OUT()}/>` +
    // The folds: a band around the face, and the cloth gathering under the chin.
    `<path d="M${cx - 34} 88 Q${cx - 35} 46 ${cx} 45 Q${cx + 35} 46 ${cx + 34} 88" stroke="${c.dark}" stroke-width="2.4" fill="none" opacity=".55"/>` +
    `<path d="M${cx - 30} 138 Q${cx} 150 ${cx + 30} 138 M${cx - 38} 150 Q${cx} 164 ${cx + 38} 150" stroke="${c.dark}" stroke-width="2.4" fill="none" opacity=".55" stroke-linecap="round"/>` +
    `<circle cx="${cx + 24}" cy="128" r="3.2" fill="#E8C46A" stroke="${INK}" stroke-width="1.4"/>`
  );
}

function hairFront(id: Look['hair'], cx: number, fill: string, shine: string): string {
  const o = `fill="${fill}" ${OUT(3)}`;
  const gloss = (d: string) =>
    `<path d="${d}" stroke="${shine}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`;
  switch (id) {
    case 'crop':
      return (
        `<path d="M${cx - 37} 84 Q${cx - 42} 44 ${cx} 44 Q${cx + 42} 44 ${cx + 37} 86 Q${cx + 30} 62 ${cx + 8} 64 Q${cx - 12} 56 ${cx - 22} 70 Q${cx - 30} 64 ${cx - 37} 84 Z" ${o}/>` +
        gloss(`M${cx - 20} 52 Q${cx - 4} 46 ${cx + 14} 50`)
      );
    case 'swept':
      return (
        `<path d="M${cx - 37} 88 Q${cx - 44} 42 ${cx + 2} 42 Q${cx + 44} 42 ${cx + 38} 88 Q${cx + 34} 70 ${cx + 24} 64 Q${cx - 6} 82 ${cx - 26} 66 Q${cx - 32} 74 ${cx - 37} 88 Z" ${o}/>` +
        gloss(`M${cx - 18} 52 Q${cx + 6} 46 ${cx + 24} 56`)
      );
    case 'curly': {
      let d = '';
      const pts: [number, number][] = [
        [-36, 80],
        [-38, 64],
        [-30, 50],
        [-16, 42],
        [0, 40],
        [16, 42],
        [30, 50],
        [38, 64],
        [36, 80],
      ];
      for (const [x, y] of pts) d += `<circle cx="${cx + x}" cy="${y}" r="11" ${o}/>`;
      d += `<path d="M${cx - 30} 72 Q${cx} 52 ${cx + 30} 72 Q${cx} 62 ${cx - 30} 72 Z" fill="${fill}"/>`;
      d += `<ellipse cx="${cx}" cy="56" rx="30" ry="14" fill="${fill}"/>`;
      return d + gloss(`M${cx - 18} 46 Q${cx - 6} 40 ${cx + 6} 44`);
    }
    case 'long':
      return (
        `<path d="M${cx - 38} 96 Q${cx - 44} 42 ${cx} 42 Q${cx + 44} 42 ${cx + 38} 96 Q${cx + 32} 66 ${cx + 4} 60 Q${cx - 2} 70 ${cx - 24} 70 Q${cx - 34} 76 ${cx - 38} 96 Z" ${o}/>` +
        gloss(`M${cx - 20} 52 Q${cx - 2} 46 ${cx + 16} 52`)
      );
    case 'bun':
      return (
        `<circle cx="${cx + 4}" cy="38" r="15" ${o}/>` +
        `<path d="M${cx - 37} 84 Q${cx - 42} 46 ${cx} 46 Q${cx + 42} 46 ${cx + 37} 84 Q${cx + 26} 60 ${cx} 60 Q${cx - 26} 60 ${cx - 37} 84 Z" ${o}/>` +
        gloss(`M${cx - 18} 54 Q${cx} 50 ${cx + 18} 54`)
      );
    case 'shaved':
      return `<path d="M${cx - 35} 80 Q${cx - 38} 48 ${cx} 48 Q${cx + 38} 48 ${cx + 35} 80 Q${cx + 20} 62 ${cx} 62 Q${cx - 20} 62 ${cx - 35} 80 Z" fill="${fill}" opacity=".4"/>`;
  }
}
