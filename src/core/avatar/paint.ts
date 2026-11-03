import { HAIR_COLOURS, SKINS, type Look, type SlotId } from './looks.ts';

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
];

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
  if (wear('back') === 'cloak') {
    back += `<path d="M${cx - sh + 2} 136 Q${cx - sh - 22} 214 ${cx - sh - 16} 280 Q${cx} 292 ${cx + sh + 16} 280 Q${cx + sh + 22} 214 ${cx + sh - 2} 136 Z" fill="${g.lin(
      [
        [0, '#8A4C9A'],
        [0.6, '#5E2E70'],
        [1, '#2E1438'],
      ],
      1,
      1,
    )}" ${OUT()}/>`;
  }

  // ---- back hair (falls behind the shoulders)
  if (look.hair === 'long') {
    back += `<path d="M${cx - 40} 84 Q${cx - 50} 150 ${cx - 36} 166 Q${cx} 174 ${cx + 36} 166 Q${cx + 50} 150 ${cx + 40} 84 Z" fill="${hair}" ${OUT()}/>`;
  }

  // ---- legs (trousers, or breeches)
  const breeches = wear('legs') === 'breeches';
  const legFill = breeches
    ? g.lin([
        [0, '#C9A06A'],
        [1, '#7A5530'],
      ])
    : g.lin([
        [0, '#5A6A8A'],
        [1, '#26324A'],
      ]);
  const legW = sh * 0.36 + 5;
  for (const side of [-1, 1]) {
    const x0 = cx + side * 3;
    const x1 = cx + side * (legW + 4);
    const [l, r] = side < 0 ? [x1, x0] : [x0, x1];
    body += `<path d="M${l} 212 L${r} 212 L${r - side * 1} 290 Q${(l + r) / 2} 293 ${l + side * 1} 290 Z" fill="${legFill}" ${OUT(3)}/>`;
    if (breeches)
      body += `<path d="M${l + 1} 262 H${r - 1}" stroke="#5A3418" stroke-width="5"/><path d="M${l + 1} 262 H${r - 1}" stroke="${INK}" stroke-width="1.6" opacity=".6"/>`;
  }

  // ---- feet
  const boots = wear('feet') === 'boots';
  for (const side of [-1, 1]) {
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

  // ---- torso: plain linen shirt, or the tunic
  const tunic = wear('torso') === 'tunic';
  const hem = tunic ? 236 : 218;
  const torso = `M${cx - 12} 128 Q${cx} 132 ${cx + 12} 128 L${cx + sh} 140 Q${cx + sh + 4} 150 ${cx + sh - 2} 166 L${cx + sh - 6} ${hem} Q${cx} ${hem + 6} ${cx - sh + 6} ${hem} L${cx - sh + 2} 166 Q${cx - sh - 4} 150 ${cx - sh} 140 Z`;
  body += `<path d="M${cx - 9} 112 H${cx + 9} V136 H${cx - 9} Z" fill="${skinFlat}" ${OUT(3)}/>`;
  body += `<path d="${torso}" fill="${
    tunic
      ? g.lin(
          [
            [0, '#5FC0D2'],
            [0.5, '#2E8FA3'],
            [1, '#174E5A'],
          ],
          1,
          0.6,
        )
      : g.lin(
          [
            [0, '#FBF1D8'],
            [0.6, '#E6D3AE'],
            [1, '#A8916A'],
          ],
          1,
          0.6,
        )
  }" ${OUT()}/>`;
  if (tunic) {
    // collar, belt with a brass buckle
    body += `<path d="M${cx - 12} 129 L${cx} 150 L${cx + 12} 129" fill="none" stroke="#174E5A" stroke-width="3"/>`;
    body += `<path d="M${cx - sh + 4} 200 Q${cx} 205 ${cx + sh - 4} 200" stroke="${INK}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M${cx - sh + 4} 200 Q${cx} 205 ${cx + sh - 4} 200" stroke="#7A4A28" stroke-width="5" fill="none"/>`;
    body += `<rect x="${cx - 7}" y="195" width="14" height="13" rx="3" fill="${g.lin([
      [0, '#FFE39A'],
      [1, '#B07A2A'],
    ])}" stroke="${INK}" stroke-width="2.4"/>`;
  } else {
    body += `<path d="M${cx - 10} 129 Q${cx} 142 ${cx + 10} 129" fill="none" stroke="#A8916A" stroke-width="2.6"/>`;
    body += `<path d="M${cx - sh + 8} 212 Q${cx} 216 ${cx + sh - 8} 212" stroke="#A8916A" stroke-width="2.4" fill="none" opacity=".8"/>`;
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
  if (wear('back') === 'cloak') {
    body += `<path d="M${cx - 14} 130 Q${cx} 140 ${cx + 14} 130" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M${cx - 14} 130 Q${cx} 140 ${cx + 14} 130" stroke="#8A4C9A" stroke-width="4" fill="none"/><circle cx="${cx}" cy="138" r="5" fill="#FFD36B" stroke="${INK}" stroke-width="2"/>`;
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

  // ---- arms (sleeves) and big hands
  const sleeve = tunic ? '#2E8FA3' : '#E6D3AE';
  for (const [side, hand] of [
    [-1, handL],
    [1, handR],
  ] as const) {
    const s = cx + side * (sh - 3);
    const d = `M${s} 146 Q${s + side * 16} 176 ${hand[0]} ${hand[1] - 8}`;
    body += `<path d="${d}" stroke="${INK}" stroke-width="20" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${sleeve}" stroke-width="13" stroke-linecap="round" fill="none"/>`;
    body += `<circle cx="${hand[0]}" cy="${hand[1]}" r="10.5" fill="${skin}" ${OUT(3)}/>`;
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
  if (!wrap) front += hairFront(look.hair, cx, hair, hairT.light);

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
  } else if (wear('head') === 'headset') {
    front += `<path d="M${cx - 37} 84 Q${cx - 40} 36 ${cx} 36 Q${cx + 40} 36 ${cx + 37} 84" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${cx - 37} 84 Q${cx - 40} 36 ${cx} 36 Q${cx + 40} 36 ${cx + 37} 84" stroke="#7A8A9A" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    for (const side of [-1, 1])
      front += `<rect x="${cx + side * 38 - 9}" y="78" width="18" height="26" rx="7" fill="${g.lin([
        [0, '#5FC0D2'],
        [1, '#174E5A'],
      ])}" ${OUT(3)}/>`;
    front += `<path d="M${cx - 38} 100 Q${cx - 34} 118 ${cx - 14} 116" stroke="${INK}" stroke-width="3" fill="none"/><circle cx="${cx - 13}" cy="116" r="4" fill="#FFD36B" stroke="${INK}" stroke-width="2"/>`;
  }

  return `<defs>${g.defs.join('')}</defs>${back}${body}${front}`;
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
