// The innkeeper's table up close (roadmap A6): the low table under the courtyard's left arcade
// where the word lessons and the regulars' trials happen, seen from the guest's cushion at dusk.
// Her guest book lies open with a reed pen and ink, round sesame bread sits on a cloth, a brass
// coffee pot and two cups wait beside an oil lamp and a bowl of dates, and through the arches the
// courtyard glows under the evening sky. Painted in the browser (ADR 0025), deterministic, at
// 1920×1080; it sits behind those stations as a still image (HallBackdrop), so nothing in it is a
// button.

import { f, INK, line, OUT, poly, tabletop, type Pt } from '../../../core/city/paintKit.ts';

export const INN_TABLE_STAGE = { width: 1920, height: 1080 } as const;

const TOP = 640;
const table = tabletop([150, 1770, TOP], [-260, 2180, 1100]);
const BRASS = '#D9A548';

function defs(): string {
  return `<defs>
<linearGradient id="it-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2A5A"/><stop offset=".45" stop-color="#7A4E78"/><stop offset=".8" stop-color="#E08A62"/><stop offset="1" stop-color="#F4BC78"/></linearGradient>
<linearGradient id="it-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B98E64"/><stop offset="1" stop-color="#8E6646"/></linearGradient>
<linearGradient id="it-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C48A62"/><stop offset="1" stop-color="#9A6A4C"/></linearGradient>
<linearGradient id="it-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E4026"/><stop offset="1" stop-color="#8E5732"/></linearGradient>
<linearGradient id="it-page" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F6E8C6"/><stop offset=".9" stop-color="#EAD5A6"/><stop offset="1" stop-color="#CDB081"/></linearGradient>
<linearGradient id="it-page-r" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#F6E8C6"/><stop offset=".9" stop-color="#EAD5A6"/><stop offset="1" stop-color="#CDB081"/></linearGradient>
<linearGradient id="it-brass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A6224"/><stop offset=".35" stop-color="#F2CC74"/><stop offset=".6" stop-color="${BRASS}"/><stop offset="1" stop-color="#7A5420"/></linearGradient>
<radialGradient id="it-flame" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#FFF6CC"/><stop offset=".5" stop-color="#FFC861"/><stop offset="1" stop-color="#E8742E"/></radialGradient>
<radialGradient id="it-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1500 600) scale(760 520)"><stop offset="0" stop-color="#FFD27A" stop-opacity=".5"/><stop offset=".45" stop-color="#FFB347" stop-opacity=".16"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient>
<radialGradient id="it-lantern" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(660 250) scale(260 220)"><stop offset="0" stop-color="#FFE29A" stop-opacity=".55"/><stop offset="1" stop-color="#FFE29A" stop-opacity="0"/></radialGradient>
<linearGradient id="it-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A0E14" stop-opacity="0"/><stop offset="1" stop-color="#1A0E14" stop-opacity=".35"/></linearGradient>
</defs>`;
}

// The three openings of the arcade and the piers between them.
const ARCHES: readonly [number, number][] = [
  [100, 560],
  [740, 1180],
  [1360, 1820],
];
const SPRING = 300;

function arcadeOpening([x0, x1]: [number, number]): string {
  const r = (x1 - x0) / 2;
  return `M${x0} ${TOP} L${x0} ${SPRING} A${r} ${r} 0 0 1 ${x1} ${SPRING} L${x1} ${TOP} Z`;
}

function courtyard(): string {
  // What the arches frame: the evening sky, the far side of the courtyard with its own arches and
  // lit windows, the paving and the fountain.
  const out: string[] = [];
  out.push(`<rect x="0" y="0" width="1920" height="${TOP}" fill="url(#it-sky)"/>`);
  const stars: Pt[] = [
    [220, 120],
    [400, 70],
    [860, 110],
    [1010, 60],
    [1500, 90],
    [1700, 140],
    [1120, 160],
  ];
  out.push(...stars.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#FFF3C8"/>`));
  // The far wall of the courtyard, with a row of arches and windows lit from inside.
  out.push(`<rect x="0" y="330" width="1920" height="210" fill="url(#it-far)"/>`);
  out.push(`<path d="M0 330 L1920 330" ${OUT(3)}/>`);
  for (let x = 40; x < 1920; x += 180) {
    out.push(
      `<path d="M${x} 540 L${x} 470 A50 50 0 0 1 ${x + 100} 470 L${x + 100} 540 Z" fill="#5A3428" ${OUT(2.5)}/>`,
    );
    // A small lit window between each pair of arches, with a lattice.
    const wx = x + 140;
    out.push(
      `<path d="M${wx - 14} 420 L${wx - 14} 392 A14 14 0 0 1 ${wx + 14} 392 L${wx + 14} 420 Z" fill="#FFCF7A" ${OUT(2.5)}/>` +
        `<path d="M${wx} 378 L${wx} 420 M${wx - 14} 400 L${wx + 14} 400" stroke="#5A3428" stroke-width="2.5"/>`,
    );
  }
  // Paving, with its joints running toward us.
  out.push(`<rect x="0" y="540" width="1920" height="${TOP - 540}" fill="#B88A5E"/>`);
  const joints: string[] = [];
  for (let y = 560; y < TOP; y += 26) joints.push(`M0 ${y} L1920 ${y}`);
  for (let x = -400; x < 2400; x += 120)
    joints.push(
      line([
        [960 + (x - 960) * 0.5, 540],
        [x, TOP],
      ]),
    );
  out.push(`<path d="${joints.join(' ')}" stroke="#8A6040" stroke-width="2" opacity=".6"/>`);
  // The fountain, framed by the middle arch.
  out.push(`<ellipse cx="960" cy="590" rx="190" ry="34" fill="#7A5A44" ${OUT()}/>`);
  out.push(`<ellipse cx="960" cy="582" rx="168" ry="24" fill="#5C8FA0"/>`);
  out.push(`<path d="M940 584 L944 500 L976 500 L980 584 Z" fill="#A88A6C" ${OUT(2.5)}/>`);
  out.push(`<ellipse cx="960" cy="500" rx="54" ry="12" fill="#A88A6C" ${OUT(2.5)}/>`);
  out.push(
    `<path d="M960 498 Q930 450 900 560 M960 498 Q990 450 1020 560" stroke="#CDEAF0" stroke-width="4" fill="none" opacity=".8"/>`,
  );
  return out.join('');
}

function arcade(): string {
  // The arcade wall: plaster with stone courses, the three arches cut out of it, a carved band
  // along their edge and a lantern hanging from each pier.
  const out: string[] = [];
  const wall =
    `M0 0 L1920 0 L1920 ${TOP} L0 ${TOP} Z ` + ARCHES.map((a) => arcadeOpening(a)).join(' ');
  out.push(`<path d="${wall}" fill="url(#it-stone)" fill-rule="evenodd"/>`);
  const courses: string[] = [];
  for (let y = 40; y < TOP; y += 40) courses.push(`M0 ${y} L1920 ${y}`);
  out.push(
    `<clipPath id="it-wallclip"><path d="${wall}" clip-rule="evenodd"/></clipPath>` +
      `<path d="${courses.join(' ')}" clip-path="url(#it-wallclip)" stroke="#7A5638" stroke-width="2" opacity=".55"/>`,
  );
  for (const a of ARCHES) {
    out.push(`<path d="${arcadeOpening(a)}" fill="none" stroke="#E4C69A" stroke-width="22"/>`);
    out.push(`<path d="${arcadeOpening(a)}" fill="none" ${OUT(3)}/>`);
    // Alternating light and dark voussoirs, the ablaq of the region's arches.
    const r = (a[1] - a[0]) / 2;
    const cx = a[0] + r;
    for (let i = 0; i < 12; i++) {
      const t0 = Math.PI + (i * Math.PI) / 12;
      const t1 = Math.PI + ((i + 1) * Math.PI) / 12;
      const p = (t: number, rr: number): Pt => [cx + Math.cos(t) * rr, SPRING + Math.sin(t) * rr];
      out.push(
        `<path d="${poly([p(t0, r + 12), p(t1, r + 12), p(t1, r + 44), p(t0, r + 44)])}" fill="${i % 2 ? '#5E3A2A' : '#E8D2AE'}" ${OUT(2)}/>`,
      );
    }
  }
  for (const x of [650, 1270]) {
    out.push(`<path d="M${x} 0 L${x} 200" ${OUT(3)}/>`);
    out.push(
      `<path d="M${x - 26} 200 L${x + 26} 200 L${x + 34} 262 L${x} 290 L${x - 34} 262 Z" fill="#FFD27A" ${OUT(3)}/>`,
    );
    out.push(
      `<path d="M${x - 26} 200 L${x} 186 L${x + 26} 200 M${x - 34} 262 L${x + 34} 262 M${x} 200 L${x} 290" ${OUT(2.5)} fill="none"/>`,
    );
  }
  out.push(`<rect x="0" y="0" width="1920" height="${TOP}" fill="url(#it-lantern)"/>`);
  out.push(
    `<rect x="0" y="0" width="1920" height="${TOP}" fill="url(#it-lantern)" transform="translate(620 0)"/>`,
  );
  return out.join('');
}

function tableTop(): string {
  const out: string[] = [];
  // The floor of the arcade, a rug in the shadow either side of the table.
  out.push(`<rect x="0" y="${TOP}" width="1920" height="${1080 - TOP}" fill="#4A2A1E"/>`);
  out.push(
    `<path d="M0 ${TOP + 30} L1920 ${TOP + 30}" stroke="#8E2E2A" stroke-width="18" opacity=".7"/>`,
  );
  const corners = [table.at(0, 0), table.at(1, 0), table.at(1, 1), table.at(0, 1)];
  out.push(`<path d="${poly(corners)}" fill="url(#it-wood)" ${OUT(3)}/>`);
  // The grain runs across the table; a woven runner lies down its middle.
  const grain: string[] = [];
  for (let v = 0.06; v < 1; v += 0.07) grain.push(line([table.at(0, v), table.at(1, v)]));
  out.push(`<path d="${grain.join(' ')}" stroke="#5A321C" stroke-width="2" opacity=".45"/>`);
  out.push(
    `<path d="${poly([table.at(0.4, 0), table.at(0.6, 0), table.at(0.6, 1), table.at(0.4, 1)])}" fill="#8E2E2A" ${OUT(2.5)}/>`,
  );
  for (const [u, c] of [
    [0.415, '#E8C46A'],
    [0.44, '#2E3E6E'],
    [0.56, '#2E3E6E'],
    [0.585, '#E8C46A'],
  ] as const) {
    out.push(
      `<path d="${line([table.at(u, 0), table.at(u, 1)])}" stroke="${c}" stroke-width="5"/>`,
    );
  }
  return out.join('');
}

function guestBook(): string {
  // Two pages lying open, lines of handwriting (strokes, not real words), a reed pen and ink.
  const out: string[] = [];
  const page = (u0: number, u1: number, fill: string) =>
    `<path d="${poly([table.at(u0, 0.22), table.at(u1, 0.22), table.at(u1, 0.7), table.at(u0, 0.7)])}" fill="${fill}" ${OUT(3)}/>`;
  out.push(
    `<path d="${poly([table.at(0.07, 0.2), table.at(0.355, 0.2), table.at(0.355, 0.73), table.at(0.07, 0.73)])}" fill="#5A2418" ${OUT(3)}/>`,
  );
  out.push(page(0.08, 0.21, 'url(#it-page)'));
  out.push(page(0.21, 0.345, 'url(#it-page-r)'));
  const writing: string[] = [];
  for (const [u0, u1] of [
    [0.095, 0.2],
    [0.225, 0.33],
  ] as const) {
    for (let v = 0.28; v < 0.66; v += 0.055) {
      const a = table.at(u1, v);
      const b = table.at(u0 + (((v * 100) | 0) % 3) * 0.012, v);
      const s = table.scale(v) * 6;
      const pts: string[] = [];
      for (let i = 0, n = 9; i <= n; i++) {
        const x = a[0] + ((b[0] - a[0]) * i) / n;
        const y = a[1] + (i % 3 === 1 ? -s : i % 3 === 2 ? s * 0.4 : 0);
        pts.push(`${f(x)} ${f(y)}`);
      }
      writing.push('M' + pts.join(' L'));
    }
  }
  out.push(
    `<path d="${writing.join(' ')}" stroke="#3A2A4A" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".75"/>`,
  );
  out.push(`<path d="${line([table.at(0.21, 0.22), table.at(0.21, 0.7)])}" ${OUT(2.5)}/>`);
  // The reed pen across the right page and the ink pot beside the book.
  const pen0 = table.at(0.25, 0.78);
  const pen1 = table.at(0.36, 0.5);
  out.push(
    `<path d="${line([pen0, pen1])}" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>`,
  );
  out.push(
    `<path d="${line([pen0, pen1])}" stroke="#C9A066" stroke-width="7" stroke-linecap="round"/>`,
  );
  const [ix, iy] = table.at(0.375, 0.3);
  const is = table.scale(0.3);
  out.push(
    `<path d="M${f(ix - 26 * is)} ${f(iy)} L${f(ix - 22 * is)} ${f(iy - 40 * is)} L${f(ix + 22 * is)} ${f(iy - 40 * is)} L${f(ix + 26 * is)} ${f(iy)} Z" fill="#1E2A3E" ${OUT(2.5)}/>`,
  );
  out.push(
    `<ellipse cx="${f(ix)}" cy="${f(iy - 40 * is)}" rx="${f(22 * is)}" ry="${f(7 * is)}" fill="#0E1018" ${OUT(2)}/>`,
  );
  return out.join('');
}

function bread(): string {
  // Round sesame bread on a white cloth near the front.
  const out: string[] = [];
  const [cx, cy] = table.at(0.26, 0.9);
  const s = table.scale(0.9);
  out.push(
    `<path d="M${f(cx - 210 * s)} ${f(cy + 10)} L${f(cx - 120 * s)} ${f(cy - 70 * s)} L${f(cx + 200 * s)} ${f(cy - 60 * s)} L${f(cx + 150 * s)} ${f(cy + 40 * s)} Z" fill="#F2EADA" ${OUT(2.5)}/>`,
  );
  out.push(
    `<ellipse cx="${f(cx)}" cy="${f(cy - 18 * s)}" rx="${f(130 * s)}" ry="${f(46 * s)}" fill="#C9843E" ${OUT(3)}/>`,
  );
  out.push(
    `<ellipse cx="${f(cx)}" cy="${f(cy - 18 * s)}" rx="${f(62 * s)}" ry="${f(20 * s)}" fill="#6E4026" ${OUT(2.5)}/>`,
  );
  const seeds: string[] = [];
  for (let i = 0; i < 26; i++) {
    const t = i * 2.39996;
    const r = 0.62 + (0.3 * ((i * 7) % 5)) / 5;
    seeds.push(
      `<ellipse cx="${f(cx + Math.cos(t) * 100 * r * s)}" cy="${f(cy - 18 * s + Math.sin(t) * 34 * r * s)}" rx="3.5" ry="2" fill="#FFF0C8"/>`,
    );
  }
  out.push(...seeds);
  return out.join('');
}

function cup([cx, cy]: Pt, s: number): string {
  // A small handleless coffee cup with a gold band.
  return (
    `<path d="M${f(cx - 24 * s)} ${f(cy - 40 * s)} L${f(cx - 18 * s)} ${f(cy)} Q${f(cx)} ${f(cy + 8 * s)} ${f(cx + 18 * s)} ${f(cy)} L${f(cx + 24 * s)} ${f(cy - 40 * s)} Z" fill="#F4ECDC" ${OUT(2.5)}/>` +
    `<ellipse cx="${f(cx)}" cy="${f(cy - 40 * s)}" rx="${f(24 * s)}" ry="${f(7 * s)}" fill="#4A2A18" ${OUT(2)}/>` +
    `<path d="M${f(cx - 22 * s)} ${f(cy - 28 * s)} Q${f(cx)} ${f(cy - 22 * s)} ${f(cx + 22 * s)} ${f(cy - 28 * s)}" stroke="${BRASS}" stroke-width="4" fill="none"/>`
  );
}

function coffee(): string {
  // A brass dallah with its beak and lid, and two cups.
  const out: string[] = [];
  const [x, y] = table.at(0.72, 0.36);
  const s = table.scale(0.36) * 1.1;
  const body = `M${f(x - 70 * s)} ${f(y)} Q${f(x - 80 * s)} ${f(y - 80 * s)} ${f(x - 34 * s)} ${f(y - 110 * s)} L${f(x - 26 * s)} ${f(y - 170 * s)} L${f(x + 26 * s)} ${f(y - 170 * s)} L${f(x + 34 * s)} ${f(y - 110 * s)} Q${f(x + 80 * s)} ${f(y - 80 * s)} ${f(x + 70 * s)} ${f(y)} Z`;
  out.push(
    `<ellipse cx="${f(x)}" cy="${f(y + 4)}" rx="${f(90 * s)}" ry="${f(16 * s)}" fill="#2A1610" opacity=".4"/>`,
  );
  out.push(
    `<path d="M${f(x - 50 * s)} ${f(y - 100 * s)} Q${f(x - 110 * s)} ${f(y - 140 * s)} ${f(x - 150 * s)} ${f(y - 200 * s)} L${f(x - 128 * s)} ${f(y - 202 * s)} Q${f(x - 96 * s)} ${f(y - 156 * s)} ${f(x - 38 * s)} ${f(y - 120 * s)} Z" fill="url(#it-brass)" ${OUT(2.5)}/>`,
  );
  out.push(`<path d="${body}" fill="url(#it-brass)" ${OUT(3)}/>`);
  out.push(
    `<path d="M${f(x + 60 * s)} ${f(y - 40 * s)} Q${f(x + 120 * s)} ${f(y - 100 * s)} ${f(x + 34 * s)} ${f(y - 150 * s)}" stroke="${INK}" stroke-width="${f(16 * s)}" fill="none"/>`,
  );
  out.push(
    `<path d="M${f(x + 60 * s)} ${f(y - 40 * s)} Q${f(x + 120 * s)} ${f(y - 100 * s)} ${f(x + 34 * s)} ${f(y - 150 * s)}" stroke="${BRASS}" stroke-width="${f(10 * s)}" fill="none"/>`,
  );
  out.push(
    `<path d="M${f(x - 34 * s)} ${f(y - 170 * s)} Q${f(x)} ${f(y - 240 * s)} ${f(x + 34 * s)} ${f(y - 170 * s)} Z" fill="url(#it-brass)" ${OUT(2.5)}/>`,
  );
  out.push(
    `<circle cx="${f(x)}" cy="${f(y - 206 * s)}" r="${f(9 * s)}" fill="${BRASS}" ${OUT(2)}/>`,
  );
  out.push(
    `<path d="M${f(x - 74 * s)} ${f(y - 46 * s)} Q${f(x)} ${f(y - 30 * s)} ${f(x + 74 * s)} ${f(y - 46 * s)}" stroke="#7A5420" stroke-width="3" fill="none"/>`,
  );
  out.push(cup(table.at(0.665, 0.62), table.scale(0.62) * 1.6));
  out.push(cup(table.at(0.765, 0.66), table.scale(0.66) * 1.6));
  return out.join('');
}

function lamp(): string {
  // A brass oil lamp on the far right, its flame lighting that end of the table.
  const [x, y] = table.at(0.88, 0.2);
  const s = table.scale(0.2) * 1.2;
  return (
    `<ellipse cx="${f(x)}" cy="${f(y + 2)}" rx="${f(70 * s)}" ry="${f(14 * s)}" fill="#2A1610" opacity=".4"/>` +
    `<path d="M${f(x - 40 * s)} ${f(y)} L${f(x - 18 * s)} ${f(y - 30 * s)} L${f(x + 18 * s)} ${f(y - 30 * s)} L${f(x + 40 * s)} ${f(y)} Z" fill="url(#it-brass)" ${OUT(2.5)}/>` +
    `<path d="M${f(x - 10 * s)} ${f(y - 30 * s)} L${f(x - 8 * s)} ${f(y - 90 * s)} L${f(x + 8 * s)} ${f(y - 90 * s)} L${f(x + 10 * s)} ${f(y - 30 * s)} Z" fill="url(#it-brass)" ${OUT(2)}/>` +
    `<path d="M${f(x - 90 * s)} ${f(y - 100 * s)} Q${f(x - 40 * s)} ${f(y - 140 * s)} ${f(x + 60 * s)} ${f(y - 110 * s)} L${f(x + 110 * s)} ${f(y - 120 * s)} L${f(x + 70 * s)} ${f(y - 92 * s)} Q${f(x)} ${f(y - 76 * s)} ${f(x - 90 * s)} ${f(y - 100 * s)} Z" fill="url(#it-brass)" ${OUT(2.5)}/>` +
    `<path d="M${f(x + 104 * s)} ${f(y - 122 * s)} Q${f(x + 86 * s)} ${f(y - 170 * s)} ${f(x + 116 * s)} ${f(y - 200 * s)} Q${f(x + 136 * s)} ${f(y - 160 * s)} ${f(x + 104 * s)} ${f(y - 122 * s)} Z" fill="url(#it-flame)"/>`
  );
}

function dates(): string {
  // A blue glazed bowl of dates at the front right.
  const [x, y] = table.at(0.8, 0.92);
  const s = table.scale(0.92);
  const out: string[] = [];
  out.push(
    `<path d="M${f(x - 140 * s)} ${f(y - 50 * s)} Q${f(x)} ${f(y + 70 * s)} ${f(x + 140 * s)} ${f(y - 50 * s)} Z" fill="#2E5E8E" ${OUT(3)}/>`,
  );
  out.push(
    `<path d="M${f(x - 110 * s)} ${f(y - 20 * s)} Q${f(x)} ${f(y + 20 * s)} ${f(x + 110 * s)} ${f(y - 20 * s)}" stroke="#E8D2AE" stroke-width="5" fill="none"/>`,
  );
  out.push(
    `<ellipse cx="${f(x)}" cy="${f(y - 50 * s)}" rx="${f(140 * s)}" ry="${f(20 * s)}" fill="#1E3A5A" ${OUT(3)}/>`,
  );
  for (let i = 0; i < 9; i++) {
    const dx = (i - 4) * 28 * s;
    const dy = -50 * s - (4 - Math.abs(i - 4)) * 5 * s + (i % 2) * 8 * s;
    out.push(
      `<ellipse cx="${f(x + dx)}" cy="${f(y + dy)}" rx="${f(22 * s)}" ry="${f(13 * s)}" transform="rotate(${(i % 3) * 18 - 18} ${f(x + dx)} ${f(y + dy)})" fill="${i % 2 ? '#6A2A16' : '#7E3A1E'}" ${OUT(2)}/>`,
    );
  }
  return out.join('');
}

/** The whole close-up, as SVG markup for a 1920×1080 stage. */
export function paintInnTable(): string {
  return (
    defs() +
    courtyard() +
    arcade() +
    tableTop() +
    guestBook() +
    bread() +
    coffee() +
    lamp() +
    dates() +
    `<rect x="0" y="0" width="1920" height="1080" fill="url(#it-glow)"/>` +
    `<rect x="0" y="${TOP}" width="1920" height="${1080 - TOP}" fill="url(#it-shade)"/>`
  );
}
