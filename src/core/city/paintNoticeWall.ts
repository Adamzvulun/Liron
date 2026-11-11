// The Notice Board's wall (roadmap A4): the guildhall's front at dusk, where the board hangs,
// in the city's painted style (ADR 0006, ADR 0025). A tiled eave, a timber-framed plaster wall,
// the guild's door under a lantern, a shuttered window, barrels, and a few stray notices pinned
// beside the board. The board itself is the screen's quest panel, styled as planks with pinned
// notes (notice-board.css), so the middle of the wall is left plain. Painted in the browser,
// deterministic, at 1920×1080, seen straight on. It sits behind the board as a still image
// (HallBackdrop), so nothing in it is a button.

import { f, INK, line, OUT, poly, type Pt } from './paintKit.ts';

export const NOTICE_WALL_STAGE = { width: 1920, height: 1080 } as const;

const EAVE = 190;
const BASE = 870;
const STREET = 950;

function defs(): string {
  return `<defs>
<linearGradient id="nw-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2A62"/><stop offset="1" stop-color="#8A4F7A"/></linearGradient>
<linearGradient id="nw-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B98F68"/><stop offset=".35" stop-color="#D9B68C"/><stop offset="1" stop-color="#C49A6E"/></linearGradient>
<linearGradient id="nw-tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C0583A"/><stop offset="1" stop-color="#8E3A28"/></linearGradient>
<linearGradient id="nw-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8C7A68"/><stop offset="1" stop-color="#6A5A4C"/></linearGradient>
<linearGradient id="nw-street" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A604A"/><stop offset="1" stop-color="#4E3A2C"/></linearGradient>
<linearGradient id="nw-door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6A3F22"/><stop offset="1" stop-color="#4B2D1A"/></linearGradient>
<radialGradient id="nw-lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFE7A0" stop-opacity=".6"/><stop offset=".45" stop-color="#FFC861" stop-opacity=".2"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient>
<radialGradient id="nw-board" cx=".5" cy=".45" r=".5"><stop offset="0" stop-color="#2A170C" stop-opacity=".28"/><stop offset="1" stop-color="#2A170C" stop-opacity="0"/></radialGradient>
<linearGradient id="nw-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A0E1E" stop-opacity=".15"/><stop offset="1" stop-color="#1A0E1E" stop-opacity=".4"/></linearGradient>
</defs>`;
}

function wall(): string {
  const out: string[] = [];
  out.push(`<rect width="1920" height="${EAVE}" fill="url(#nw-sky)"/>`);
  out.push(`<rect y="${EAVE}" width="1920" height="${BASE - EAVE}" fill="url(#nw-wall)"/>`);
  // A soft shadow where the board hangs, in the middle.
  out.push(
    `<rect x="460" y="${EAVE}" width="1000" height="${BASE - EAVE}" fill="url(#nw-board)"/>`,
  );
  // Timber framing: posts, a rail, and braces at the ends.
  const timber = '#6A3F22';
  for (const x of [60, 1860]) {
    out.push(
      `<rect x="${x - 18}" y="${EAVE}" width="36" height="${BASE - EAVE}" fill="${timber}" ${OUT()}/>`,
    );
  }
  out.push(`<rect x="0" y="${EAVE + 18}" width="1920" height="26" fill="${timber}" ${OUT()}/>`);
  for (const [x0, x1] of [
    [78, 240],
    [1842, 1680],
  ] as const) {
    out.push(
      `<path d="${poly([
        [x0, EAVE + 44],
        [x0, EAVE + 80],
        [x1, EAVE + 230],
        [x1, EAVE + 194],
      ])}" fill="${timber}" ${OUT(2.5)}/>`,
    );
  }
  // Cracks and patches in the plaster.
  out.push(
    `<path d="M520 300 l18 22 l-6 20 l14 18 M1380 640 l-16 18 l8 22 M700 780 l20 -12 l14 10" stroke="#8A6446" stroke-width="2.5" fill="none"/>`,
  );
  // Stone footing and the street.
  out.push(`<rect y="${BASE}" width="1920" height="${STREET - BASE}" fill="url(#nw-stone)"/>`);
  const stones: string[] = [];
  for (let x = 0, k = 0; x < 1920; x += 120, k++) {
    stones.push(`M${x} ${BASE} L${x} ${STREET}`);
    if (k % 2) stones.push(`M${x + 60} ${BASE + 40} L${x + 60} ${STREET}`);
  }
  stones.push(`M0 ${BASE + 40} L1920 ${BASE + 40}`);
  out.push(`<path d="${stones.join(' ')}" stroke="#4E4034" stroke-width="2.5" fill="none"/>`);
  out.push(
    `<path d="${line([
      [0, BASE],
      [1920, BASE],
    ])}" ${OUT(3)} fill="none"/>`,
  );
  out.push(`<rect y="${STREET}" width="1920" height="${1080 - STREET}" fill="url(#nw-street)"/>`);
  const cobbles: string[] = [];
  for (let row = 0; row < 4; row++) {
    const y = STREET + 18 + row * 34;
    for (let x = (row % 2) * 40; x < 1920; x += 80) {
      cobbles.push(`M${x + 8} ${y} Q${x + 40} ${y - 14} ${x + 72} ${y}`);
    }
  }
  out.push(
    `<path d="${cobbles.join(' ')}" stroke="#3A2A20" stroke-width="2" opacity=".6" fill="none"/>`,
  );
  return out.join('');
}

function eave(): string {
  // A tiled roof edge over the wall, scalloped tile ends on its lip.
  const out: string[] = [];
  out.push(
    `<path d="${poly([
      [0, 70],
      [1920, 70],
      [1920, EAVE],
      [0, EAVE],
    ])}" fill="url(#nw-tile)" ${OUT()}/>`,
  );
  const rows: string[] = [];
  for (const y of [100, 130, 160]) rows.push(`M0 ${y} L1920 ${y}`);
  out.push(`<path d="${rows.join(' ')}" stroke="#6E2A1E" stroke-width="3" fill="none"/>`);
  const lip: string[] = [];
  for (let x = 0; x < 1920; x += 48)
    lip.push(`M${x} ${EAVE} Q${x + 24} ${EAVE + 26} ${x + 48} ${EAVE} Z`);
  out.push(`<path d="${lip.join(' ')}" fill="#A8462E" ${OUT(2.5)}/>`);
  // Rafter ends under the lip.
  for (let x = 120; x < 1920; x += 240) {
    out.push(
      `<rect x="${x - 12}" y="${EAVE + 2}" width="24" height="20" fill="#4B2D1A" ${OUT(2)}/>`,
    );
  }
  return out.join('');
}

function door(): string {
  // The guild's door, arched, studded, with a brass ring.
  const x0 = 150;
  const x1 = 410;
  const r = (x1 - x0) / 2;
  const top = 500;
  const arch = `M${x0} ${BASE} L${x0} ${top + r} A${r} ${r} 0 0 1 ${x1} ${top + r} L${x1} ${BASE} Z`;
  const out: string[] = [];
  out.push(
    `<path d="M${x0 - 26} ${BASE} L${x0 - 26} ${top + r} A${r + 26} ${r + 26} 0 0 1 ${x1 + 26} ${top + r} L${x1 + 26} ${BASE} Z" fill="#9C8A76" ${OUT()}/>`,
  );
  out.push(`<path d="${arch}" fill="url(#nw-door)" ${OUT()}/>`);
  const planks: string[] = [];
  for (let x = x0 + 52; x < x1; x += 52) planks.push(`M${x} ${top + 20} L${x} ${BASE}`);
  out.push(`<path d="${planks.join(' ')}" stroke="${INK}" stroke-width="2" opacity=".55"/>`);
  for (const y of [640, 790]) {
    out.push(`<rect x="${x0}" y="${y}" width="${x1 - x0}" height="16" fill="#3E2516" ${OUT(2)}/>`);
  }
  out.push(
    `<circle cx="${x1 - 50}" cy="720" r="18" fill="none" stroke="#E0B05A" stroke-width="6"/>`,
  );
  out.push(`<circle cx="${x1 - 50}" cy="702" r="6" fill="#E0B05A" ${OUT(1.5)}/>`);
  // The guild's crest over the door: two crossed keys on a shield.
  out.push(
    `<path d="M250 380 L310 380 L310 420 Q310 452 280 462 Q250 452 250 420 Z" fill="#265965" ${OUT()}/>` +
      `<path d="M262 444 L298 396 M298 444 L262 396" stroke="#E0B05A" stroke-width="6" stroke-linecap="round"/>`,
  );
  return out.join('');
}

function lantern(x: number, y: number): string {
  return (
    `<circle cx="${x}" cy="${y + 40}" r="210" fill="url(#nw-lamp)"/>` +
    `<path d="M${x - 50} ${y - 30} L${x} ${y - 30} L${x} ${y}" fill="none" ${OUT(5)}/>` +
    `<path d="M${x - 22} ${y} L${x + 22} ${y} L${x + 16} ${y + 14} L${x - 16} ${y + 14} Z" fill="#3E2516" ${OUT(2.5)}/>` +
    `<path d="M${x - 16} ${y + 14} L${x + 16} ${y + 14} L${x + 20} ${y + 66} L${x - 20} ${y + 66} Z" fill="#FFD36B" ${OUT(2.5)}/>` +
    `<path d="M${x} ${y + 14} L${x} ${y + 66}" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M${x - 26} ${y + 66} L${x + 26} ${y + 66} L${x + 18} ${y + 78} L${x - 18} ${y + 78} Z" fill="#3E2516" ${OUT(2.5)}/>` +
    `<circle cx="${x}" cy="${y + 42}" r="9" fill="#FFF3C8"/>`
  );
}

function windowWithShutters(): string {
  const x0 = 1530;
  const x1 = 1720;
  const y0 = 380;
  const y1 = 590;
  const out: string[] = [];
  out.push(
    `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#FFC861" ${OUT()}/>`,
  );
  out.push(
    `<path d="M${(x0 + x1) / 2} ${y0} L${(x0 + x1) / 2} ${y1} M${x0} ${(y0 + y1) / 2} L${x1} ${(y0 + y1) / 2}" stroke="#6A3F22" stroke-width="8"/>`,
  );
  // Shutters folded open, with slats.
  for (const [a, b] of [
    [x0 - 80, x0],
    [x1, x1 + 80],
  ] as const) {
    out.push(
      `<rect x="${a}" y="${y0}" width="${b - a}" height="${y1 - y0}" fill="#3F7F8C" ${OUT()}/>`,
    );
    const slats: string[] = [];
    for (let y = y0 + 20; y < y1; y += 22) slats.push(`M${a + 10} ${y} L${b - 10} ${y}`);
    out.push(`<path d="${slats.join(' ')}" stroke="#265965" stroke-width="4"/>`);
  }
  out.push(
    `<rect x="${x0 - 20}" y="${y1}" width="${x1 - x0 + 40}" height="18" rx="3" fill="#8A5530" ${OUT(2.5)}/>`,
  );
  // A pot of flowers on the sill.
  out.push(
    `<path d="M1600 ${y1} L1650 ${y1} L1644 ${y1 - 36} L1606 ${y1 - 36} Z" fill="#B5643A" ${OUT(2.5)}/>` +
      [1610, 1625, 1640]
        .map(
          (x, i) =>
            `<circle cx="${x}" cy="${y1 - 48 - (i % 2) * 10}" r="10" fill="${['#C0392B', '#E0B05A', '#A83A3E'][i]}" ${OUT(2)}/>`,
        )
        .join(''),
  );
  return out.join('');
}

function barrels(): string {
  const out: string[] = [];
  for (const [cx, w, h] of [
    [1590, 120, 150],
    [1730, 110, 130],
  ] as const) {
    const bottom = STREET + 30;
    const top = bottom - h;
    out.push(
      `<path d="M${cx - w / 2} ${top} Q${cx - w / 2 - 14} ${(top + bottom) / 2} ${cx - w / 2} ${bottom} L${cx + w / 2} ${bottom} Q${cx + w / 2 + 14} ${(top + bottom) / 2} ${cx + w / 2} ${top} Z" fill="#8A5530" ${OUT()}/>`,
    );
    for (const t of [0.2, 0.8]) {
      const y = top + (bottom - top) * t;
      out.push(
        `<path d="M${cx - w / 2 - 6} ${f(y)} L${cx + w / 2 + 6} ${f(y)}" stroke="#3E2516" stroke-width="7"/>`,
      );
    }
    out.push(`<ellipse cx="${cx}" cy="${top}" rx="${w / 2}" ry="12" fill="#A86E40" ${OUT(2.5)}/>`);
  }
  return out.join('');
}

function strayNotices(): string {
  // Old notices beside the board: torn parchment, pinned, a little crooked.
  const notes: [number, number, number, number, number][] = [
    [520, 330, 110, 140, -6],
    [600, 610, 90, 110, 5],
    [1310, 300, 120, 150, 4],
    [1350, 640, 100, 120, -5],
  ];
  return notes
    .map(([x, y, w, h, rot]) => {
      const pts: Pt[] = [
        [x, y],
        [x + w, y + 4],
        [x + w - 4, y + h * 0.6],
        [x + w + 3, y + h],
        [x + w * 0.4, y + h - 5],
        [x + 2, y + h + 3],
      ];
      const lines: string[] = [];
      for (let k = 0; k < 4; k++) {
        const ly = y + 34 + k * 22;
        if (ly < y + h - 14) lines.push(`M${x + 16} ${ly} L${x + w - 18 - (k % 2) * 20} ${ly}`);
      }
      return (
        `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})">` +
        `<path d="${poly(pts)}" fill="#EAD7AE" ${OUT(2.5)}/>` +
        `<path d="${lines.join(' ')}" stroke="#8A6446" stroke-width="4" stroke-linecap="round"/>` +
        `<circle cx="${x + w / 2}" cy="${y + 12}" r="7" fill="#E0B05A" ${OUT(2)}/>` +
        `</g>`
      );
    })
    .join('');
}

/** The whole wall, as SVG markup for a 1920×1080 stage. */
export function paintNoticeWall(): string {
  return (
    defs() +
    wall() +
    eave() +
    door() +
    windowWithShutters() +
    strayNotices() +
    barrels() +
    lantern(330, 300) +
    lantern(1630, 250) +
    `<rect width="1920" height="1080" fill="url(#nw-shade)"/>`
  );
}
