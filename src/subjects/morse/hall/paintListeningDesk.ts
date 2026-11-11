// The listening desk up close (roadmap A6): the Signal Tower desk where the Koch lessons, Instant
// Recognition, sending and the Codebook happen, seen from the operator's chair at night. A wooden
// receiver with a glowing tuning eye, headphones on their cord, a notepad of copied letters and a
// pencil, a brass straight key, a lamp with a glass chimney and a mug of tea; on the stone wall the
// Koch chart is pinned up, and an arched window looks out over the harbor at night. Painted in the
// browser (ADR 0025), deterministic, at 1920×1080; it sits behind those stations as a still image
// (HallBackdrop), so nothing in it is a button.

import { f, INK, line, OUT, poly, tabletop, type Pt } from '../../../core/city/paintKit.ts';
import { MORSE_CHARS } from '../code.ts';

export const LISTENING_DESK_STAGE = { width: 1920, height: 1080 } as const;

const TOP = 620;
const desk = tabletop([120, 1800, TOP], [-300, 2220, 1100]);
const BRASS = '#D9A548';
const STONE = ['#6E5E5A', '#75645C', '#665858', '#7B6A5E', '#6A5C5E'];

function defs(): string {
  return `<defs>
<linearGradient id="ld-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1236"/><stop offset=".7" stop-color="#2A2A5E"/><stop offset="1" stop-color="#3E3468"/></linearGradient>
<linearGradient id="ld-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C2A52"/><stop offset="1" stop-color="#0C1430"/></linearGradient>
<linearGradient id="ld-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A2A18"/><stop offset="1" stop-color="#6A3E22"/></linearGradient>
<linearGradient id="ld-box" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A4A2A"/><stop offset="1" stop-color="#4E2E1A"/></linearGradient>
<linearGradient id="ld-paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6EAC8"/><stop offset="1" stop-color="#DCC394"/></linearGradient>
<linearGradient id="ld-brass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A6224"/><stop offset=".35" stop-color="#F2CC74"/><stop offset=".6" stop-color="${BRASS}"/><stop offset="1" stop-color="#7A5420"/></linearGradient>
<radialGradient id="ld-eye" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#E8FFB0"/><stop offset=".7" stop-color="#9FD67E"/><stop offset="1" stop-color="#3E7A2E"/></radialGradient>
<radialGradient id="ld-flame" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#FFF6CC"/><stop offset=".5" stop-color="#FFC861"/><stop offset="1" stop-color="#E8742E"/></radialGradient>
<radialGradient id="ld-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1560 560) scale(820 560)"><stop offset="0" stop-color="#FFD27A" stop-opacity=".5"/><stop offset=".45" stop-color="#FFB347" stop-opacity=".15"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient>
<linearGradient id="ld-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E0A14" stop-opacity="0"/><stop offset="1" stop-color="#0E0A14" stop-opacity=".4"/></linearGradient>
</defs>`;
}

function wall(): string {
  // Rough stone blocks in courses, each row offset by half a block, the shades chosen in turn.
  const out: string[] = [`<rect x="0" y="0" width="1920" height="${TOP}" fill="#5E504E"/>`];
  let k = 0;
  for (let y = 0, row = 0; y < TOP; y += 60, row++) {
    for (let x = row % 2 ? -70 : 0; x < 1920; x += 140) {
      const c = STONE[(k = (k * 7 + 3) % 11) % STONE.length] ?? '#6E5E5A';
      out.push(
        `<rect x="${x + 3}" y="${y + 3}" width="134" height="54" rx="8" fill="${c}" stroke="#3A302E" stroke-width="2.5"/>`,
      );
    }
  }
  return out.join('');
}

function harborWindow(): string {
  // An arched window: the night sky with the moon, the dark sea, the far shore and a ship's light.
  const x0 = 170;
  const x1 = 560;
  const r = (x1 - x0) / 2;
  const top = 60;
  const bottom = 470;
  const pane = `M${x0} ${bottom} L${x0} ${top + r} A${r} ${r} 0 0 1 ${x1} ${top + r} L${x1} ${bottom} Z`;
  const stars: Pt[] = [
    [230, 200],
    [300, 120],
    [470, 150],
    [520, 240],
    [260, 300],
    [400, 90],
  ];
  return (
    `<clipPath id="ld-pane"><path d="${pane}"/></clipPath>` +
    `<path d="${pane}" fill="url(#ld-night)"/>` +
    `<g clip-path="url(#ld-pane)">` +
    stars.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#FFF3C8"/>`).join('') +
    `<circle cx="440" cy="200" r="34" fill="#FFF3C8"/><circle cx="454" cy="190" r="30" fill="#1A1E48"/>` +
    `<rect x="${x0}" y="350" width="${x1 - x0}" height="${bottom - 350}" fill="url(#ld-sea)"/>` +
    `<path d="M${x0} 352 Q260 330 330 344 Q420 326 ${x1} 350 L${x1} 356 L${x0} 356 Z" fill="#141838"/>` +
    `<path d="M200 390 L260 390 M300 410 L380 410 M420 380 L500 380 M240 440 L330 440 M400 450 L480 450" stroke="#6A7AB0" stroke-width="2.5" opacity=".6"/>` +
    `<circle cx="300" cy="372" r="4" fill="#FFCF7A"/><path d="M300 376 L300 400" stroke="#FFCF7A" stroke-width="2" opacity=".5"/>` +
    `</g>` +
    `<path d="${pane}" fill="none" stroke="#3E3432" stroke-width="22"/>` +
    `<path d="${pane}" fill="none" ${OUT(3)}/>` +
    `<path d="M${(x0 + x1) / 2} ${top} L${(x0 + x1) / 2} ${bottom} M${x0} 300 L${x1} 300" stroke="#2E2422" stroke-width="7"/>` +
    `<rect x="${x0 - 22}" y="${bottom}" width="${x1 - x0 + 44}" height="22" rx="3" fill="#8A7A70" ${OUT(2.5)}/>`
  );
}

function kochChart(): string {
  // The Koch order the lessons teach (ADR 0028) on a pinned sheet, in five columns.
  const x0 = 1180;
  const y0 = 70;
  const w = 380;
  const h = 450;
  const out: string[] = [];
  out.push(
    `<path d="M${x0} ${y0} L${x0 + w} ${y0 + 8} L${x0 + w - 6} ${y0 + h} L${x0 + 6} ${y0 + h - 6} Z" fill="url(#ld-paper)" ${OUT(3)}/>`,
  );
  out.push(
    `<text x="${x0 + w / 2}" y="${y0 + 52}" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="700" fill="#4A2A18">Koch order</text>`,
  );
  out.push(`<path d="M${x0 + 40} ${y0 + 68} L${x0 + w - 40} ${y0 + 72}" ${OUT(2)}/>`);
  const cells: string[] = [];
  const rows = Math.ceil(MORSE_CHARS.length / 5);
  MORSE_CHARS.forEach(({ char }, i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    cells.push(
      `<text x="${x0 + 46 + col * 72}" y="${y0 + 108 + row * 36}" font-family="Georgia, serif" font-size="28" fill="${i < 2 ? '#8E2E2A' : '#3A2A1E'}">${char}</text>`,
    );
  });
  out.push(...cells);
  for (const [x, y] of [
    [x0 + 18, y0 + 16],
    [x0 + w - 18, y0 + 24],
  ] as const) {
    out.push(`<circle cx="${x}" cy="${y}" r="9" fill="#B03A2E" ${OUT(2)}/>`);
  }
  return out.join('');
}

function lantern(): string {
  // An oil lantern on a bracket above the desk.
  return (
    `<path d="M980 0 L980 70 L1040 70" ${OUT(5)} fill="none"/>` +
    `<path d="M1040 70 L1040 110" ${OUT(3)}/>` +
    `<path d="M1012 110 L1068 110 L1078 190 L1040 214 L1002 190 Z" fill="#FFD27A" ${OUT(3)}/>` +
    `<path d="M1012 110 L1040 96 L1068 110 M1002 190 L1078 190 M1040 110 L1040 214" ${OUT(2.5)} fill="none"/>`
  );
}

function deskTop(): string {
  const out: string[] = [];
  out.push(`<rect x="0" y="${TOP}" width="1920" height="${1080 - TOP}" fill="#2E2226"/>`);
  out.push(
    `<path d="${poly([desk.at(0, 0), desk.at(1, 0), desk.at(1, 1), desk.at(0, 1)])}" fill="url(#ld-wood)" ${OUT(3)}/>`,
  );
  const grain: string[] = [];
  for (let v = 0.05; v < 1; v += 0.065) grain.push(line([desk.at(0, v), desk.at(1, v)]));
  out.push(`<path d="${grain.join(' ')}" stroke="#2E180C" stroke-width="2" opacity=".45"/>`);
  // A leather writing pad down the middle, under the lesson cards.
  out.push(
    `<path d="${poly([desk.at(0.36, 0.08), desk.at(0.64, 0.08), desk.at(0.64, 1), desk.at(0.36, 1)])}" fill="#2E4A3A" ${OUT(2.5)}/>`,
  );
  return out.join('');
}

function receiver(): string {
  // A wooden receiver at the back left: a dial, two knobs and a tuning eye that glows green.
  const out: string[] = [];
  const [x, y] = desk.at(0.2, 0.12);
  const s = desk.scale(0.12);
  const w = 300 * s;
  const h = 170 * s;
  out.push(
    `<path d="M${f(x - w / 2)} ${f(y)} L${f(x - w / 2)} ${f(y - h)} L${f(x - w / 2 + 30 * s)} ${f(y - h - 30 * s)} L${f(x + w / 2 + 30 * s)} ${f(y - h - 30 * s)} L${f(x + w / 2 + 30 * s)} ${f(y - 30 * s)} L${f(x + w / 2)} ${f(y)} Z" fill="#3A2214" ${OUT(3)}/>`,
  );
  out.push(
    `<rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="url(#ld-box)" ${OUT(3)}/>`,
  );
  out.push(
    `<rect x="${f(x - w / 2 + 20 * s)}" y="${f(y - h + 20 * s)}" width="${f(150 * s)}" height="${f(70 * s)}" rx="6" fill="#F3E3C0" ${OUT(2.5)}/>`,
  );
  const ticks: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const tx = x - w / 2 + 34 * s + i * 12.2 * s;
    ticks.push(`M${f(tx)} ${f(y - h + 34 * s)} L${f(tx)} ${f(y - h + (i % 5 ? 46 : 54) * s)}`);
  }
  out.push(`<path d="${ticks.join(' ')}" stroke="${INK}" stroke-width="2"/>`);
  out.push(
    `<path d="M${f(x - w / 2 + 96 * s)} ${f(y - h + 28 * s)} L${f(x - w / 2 + 104 * s)} ${f(y - h + 82 * s)}" stroke="#B03A2E" stroke-width="3"/>`,
  );
  out.push(
    `<circle cx="${f(x + 90 * s)}" cy="${f(y - h + 56 * s)}" r="${f(26 * s)}" fill="url(#ld-eye)" ${OUT(2.5)}/>`,
  );
  for (const dx of [-90, -10, 90]) {
    out.push(
      `<circle cx="${f(x + dx * s)}" cy="${f(y - 40 * s)}" r="${f(18 * s)}" fill="#1E1410" ${OUT(2.5)}/>` +
        `<path d="M${f(x + dx * s)} ${f(y - 40 * s)} L${f(x + dx * s)} ${f(y - 56 * s)}" stroke="#E0B05A" stroke-width="3"/>`,
    );
  }
  return out.join('');
}

function headphones(): string {
  // A pair of headphones lying on the desk, their cord running back to the receiver.
  const out: string[] = [];
  const [x, y] = desk.at(0.17, 0.5);
  const s = desk.scale(0.5);
  const [rx, ry] = desk.at(0.27, 0.11);
  out.push(
    `<path d="M${f(x + 60 * s)} ${f(y + 10 * s)} C${f(x + 220 * s)} ${f(y + 60 * s)} ${f(rx + 40)} ${f(ry + 120)} ${f(rx)} ${f(ry - 20)}" stroke="#1A1210" stroke-width="5" fill="none"/>`,
  );
  out.push(
    `<path d="M${f(x - 120 * s)} ${f(y)} C${f(x - 140 * s)} ${f(y - 150 * s)} ${f(x + 140 * s)} ${f(y - 150 * s)} ${f(x + 120 * s)} ${f(y)}" stroke="${INK}" stroke-width="${f(16 * s)}" fill="none"/>`,
  );
  out.push(
    `<path d="M${f(x - 120 * s)} ${f(y)} C${f(x - 140 * s)} ${f(y - 150 * s)} ${f(x + 140 * s)} ${f(y - 150 * s)} ${f(x + 120 * s)} ${f(y)}" stroke="#8A6A4A" stroke-width="${f(9 * s)}" fill="none"/>`,
  );
  for (const dx of [-120, 120]) {
    out.push(
      `<ellipse cx="${f(x + dx * s)}" cy="${f(y)}" rx="${f(54 * s)}" ry="${f(36 * s)}" fill="#2A1C16" ${OUT(3)}/>` +
        `<ellipse cx="${f(x + dx * s)}" cy="${f(y - 6 * s)}" rx="${f(40 * s)}" ry="${f(24 * s)}" fill="url(#ld-brass)" ${OUT(2)}/>` +
        `<circle cx="${f(x + dx * s)}" cy="${f(y - 6 * s)}" r="${f(8 * s)}" fill="#3A2A1E"/>`,
    );
  }
  return out.join('');
}

function notepad(): string {
  // A notepad at the front left with copied letters in pencil, and the pencil beside it.
  const out: string[] = [];
  const corners = [
    desk.at(0.14, 0.7),
    desk.at(0.33, 0.68),
    desk.at(0.34, 1.02),
    desk.at(0.13, 1.04),
  ];
  out.push(`<path d="${poly(corners)}" fill="url(#ld-paper)" ${OUT(3)}/>`);
  const rows = ['K M K K M', 'M U K M U', 'R K U M R'];
  rows.forEach((row, i) => {
    const [tx, ty] = desk.at(0.165, 0.78 + i * 0.07);
    out.push(
      `<text x="${f(tx)}" y="${f(ty)}" font-family="Georgia, serif" font-style="italic" font-size="${f(34 + i * 4)}" letter-spacing="6" fill="#4A4A5A">${row}</text>`,
    );
  });
  const p0 = desk.at(0.31, 0.98);
  const p1 = desk.at(0.39, 0.74);
  out.push(
    `<path d="${line([p0, p1])}" stroke="${INK}" stroke-width="15" stroke-linecap="round"/>`,
  );
  out.push(
    `<path d="${line([p0, p1])}" stroke="#E0A030" stroke-width="10" stroke-linecap="round"/>`,
  );
  return out.join('');
}

function straightKey(): string {
  // A brass straight key on a wooden base, its wires running back.
  const out: string[] = [];
  const [x, y] = desk.at(0.66, 0.55);
  const s = desk.scale(0.55) * 1.1;
  out.push(
    `<path d="M${f(x - 30 * s)} ${f(y - 30 * s)} C${f(x - 60 * s)} ${f(y - 140 * s)} ${f(x - 20 * s)} ${f(y - 160 * s)} ${f(x - 80 * s)} ${f(y - 220 * s)}" stroke="#1A1210" stroke-width="4" fill="none"/>`,
  );
  out.push(
    `<path d="M${f(x - 150 * s)} ${f(y)} L${f(x - 130 * s)} ${f(y - 40 * s)} L${f(x + 150 * s)} ${f(y - 40 * s)} L${f(x + 170 * s)} ${f(y)} Z" fill="#5A341C" ${OUT(3)}/>`,
  );
  out.push(
    `<rect x="${f(x - 150 * s)}" y="${f(y)}" width="${f(320 * s)}" height="${f(22 * s)}" fill="#3A2214" ${OUT(2.5)}/>`,
  );
  out.push(
    `<path d="M${f(x - 110 * s)} ${f(y - 52 * s)} L${f(x + 110 * s)} ${f(y - 66 * s)} L${f(x + 112 * s)} ${f(y - 54 * s)} L${f(x - 108 * s)} ${f(y - 40 * s)} Z" fill="url(#ld-brass)" ${OUT(2.5)}/>`,
  );
  out.push(
    `<path d="M${f(x - 20 * s)} ${f(y - 40 * s)} L${f(x - 30 * s)} ${f(y - 80 * s)} L${f(x + 10 * s)} ${f(y - 80 * s)} L${f(x)} ${f(y - 40 * s)} Z" fill="url(#ld-brass)" ${OUT(2)}/>`,
  );
  out.push(
    `<ellipse cx="${f(x + 112 * s)}" cy="${f(y - 74 * s)}" rx="${f(34 * s)}" ry="${f(16 * s)}" fill="#1E1410" ${OUT(2.5)}/>` +
      `<path d="M${f(x + 80 * s)} ${f(y - 74 * s)} L${f(x + 82 * s)} ${f(y - 92 * s)} Q${f(x + 112 * s)} ${f(y - 104 * s)} ${f(x + 142 * s)} ${f(y - 92 * s)} L${f(x + 144 * s)} ${f(y - 74 * s)}" fill="#1E1410" ${OUT(2.5)}/>`,
  );
  for (const dx of [-120, 140]) {
    out.push(
      `<circle cx="${f(x + dx * s)}" cy="${f(y - 20 * s)}" r="${f(9 * s)}" fill="${BRASS}" ${OUT(2)}/>`,
    );
  }
  return out.join('');
}

function lamp(): string {
  // A brass oil lamp with a glass chimney at the back right.
  const [x, y] = desk.at(0.92, 0.2);
  const s = desk.scale(0.16) * 1.15;
  return (
    `<ellipse cx="${f(x)}" cy="${f(y + 2)}" rx="${f(70 * s)}" ry="${f(14 * s)}" fill="#120A08" opacity=".45"/>` +
    `<path d="M${f(x - 56 * s)} ${f(y)} L${f(x - 30 * s)} ${f(y - 30 * s)} L${f(x + 30 * s)} ${f(y - 30 * s)} L${f(x + 56 * s)} ${f(y)} Z" fill="url(#ld-brass)" ${OUT(2.5)}/>` +
    `<path d="M${f(x - 10 * s)} ${f(y - 30 * s)} L${f(x - 10 * s)} ${f(y - 70 * s)} L${f(x + 10 * s)} ${f(y - 70 * s)} L${f(x + 10 * s)} ${f(y - 30 * s)} Z" fill="url(#ld-brass)" ${OUT(2)}/>` +
    `<ellipse cx="${f(x)}" cy="${f(y - 110 * s)}" rx="${f(64 * s)}" ry="${f(48 * s)}" fill="url(#ld-brass)" ${OUT(2.5)}/>` +
    `<path d="M${f(x - 26 * s)} ${f(y - 150 * s)} Q${f(x - 56 * s)} ${f(y - 220 * s)} ${f(x - 22 * s)} ${f(y - 300 * s)} L${f(x + 22 * s)} ${f(y - 300 * s)} Q${f(x + 56 * s)} ${f(y - 220 * s)} ${f(x + 26 * s)} ${f(y - 150 * s)} Z" fill="#FFF3D0" fill-opacity=".35" ${OUT(2.5)}/>` +
    `<path d="M${f(x)} ${f(y - 160 * s)} Q${f(x - 20 * s)} ${f(y - 200 * s)} ${f(x)} ${f(y - 240 * s)} Q${f(x + 20 * s)} ${f(y - 200 * s)} ${f(x)} ${f(y - 160 * s)} Z" fill="url(#ld-flame)"/>`
  );
}

function mug(): string {
  // A mug of tea at the front right, steam rising.
  const [x, y] = desk.at(0.845, 0.86);
  const s = desk.scale(0.86);
  return (
    `<path d="M${f(x + 60 * s)} ${f(y - 120 * s)} C${f(x + 120 * s)} ${f(y - 120 * s)} ${f(x + 120 * s)} ${f(y - 40 * s)} ${f(x + 56 * s)} ${f(y - 46 * s)}" stroke="${INK}" stroke-width="${f(22 * s)}" fill="none"/>` +
    `<path d="M${f(x + 60 * s)} ${f(y - 120 * s)} C${f(x + 120 * s)} ${f(y - 120 * s)} ${f(x + 120 * s)} ${f(y - 40 * s)} ${f(x + 56 * s)} ${f(y - 46 * s)}" stroke="#3E6A8A" stroke-width="${f(14 * s)}" fill="none"/>` +
    `<path d="M${f(x - 66 * s)} ${f(y - 150 * s)} L${f(x - 60 * s)} ${f(y)} Q${f(x)} ${f(y + 16 * s)} ${f(x + 60 * s)} ${f(y)} L${f(x + 66 * s)} ${f(y - 150 * s)} Z" fill="#3E6A8A" ${OUT(3)}/>` +
    `<ellipse cx="${f(x)}" cy="${f(y - 150 * s)}" rx="${f(66 * s)}" ry="${f(18 * s)}" fill="#7A3A1E" ${OUT(2.5)}/>` +
    `<path d="M${f(x - 20 * s)} ${f(y - 170 * s)} q-20 -40 0 -80 q20 -40 0 -80 M${f(x + 20 * s)} ${f(y - 180 * s)} q-20 -30 0 -60 q20 -30 0 -60" stroke="#F0E6D8" stroke-width="5" fill="none" opacity=".45" stroke-linecap="round"/>`
  );
}

/** The whole close-up, as SVG markup for a 1920×1080 stage. */
export function paintListeningDesk(): string {
  return (
    defs() +
    wall() +
    harborWindow() +
    kochChart() +
    lantern() +
    deskTop() +
    receiver() +
    headphones() +
    notepad() +
    straightKey() +
    lamp() +
    mug() +
    `<rect x="0" y="0" width="1920" height="1080" fill="url(#ld-glow)"/>` +
    `<rect x="0" y="${TOP}" width="1920" height="${1080 - TOP}" fill="url(#ld-shade)"/>`
  );
}
