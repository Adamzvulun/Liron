// The Stranger at the Gate, the finale screen (task 4.2, #334): the innkeeper's table at night,
// the whole table round it. Every regular's keepsake is in its place (Salim's cup, Nasser's map,
// Leila's portrait over the table), lamps hang from the beam, the stranger sits on the bench at
// the end, and the guest book lies open with the pen beside it. Painted in the browser,
// deterministic, at 1200×800 (the shape of a picture on a card), in the city's style (ADR 0006,
// ADR 0025). The night is warm, never blue (Adam, v2.0).

import { f, INK, OUT, poly } from './paintKit.ts';

export const TABLE_STAGE = { width: 1200, height: 800 } as const;

const W = TABLE_STAGE.width;
const H = TABLE_STAGE.height;
/** The tabletop's back and front edges. */
const BACK = 470;
const FRONT = 600;

function defs(): string {
  return `<defs>
<linearGradient id="tb-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2218"/><stop offset="1" stop-color="#6A4028"/></linearGradient>
<linearGradient id="tb-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A8683A"/><stop offset="1" stop-color="#7A4422"/></linearGradient>
<linearGradient id="tb-front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A3018"/><stop offset="1" stop-color="#2E180C"/></linearGradient>
<linearGradient id="tb-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A2C1A"/><stop offset="1" stop-color="#24140C"/></linearGradient>
<radialGradient id="tb-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(600 380) scale(620 360)"><stop offset="0" stop-color="#FFC861" stop-opacity=".5"/><stop offset=".6" stop-color="#FFB347" stop-opacity=".14"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient>
<radialGradient id="tb-lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF6D0"/><stop offset=".6" stop-color="#FFC861"/><stop offset="1" stop-color="#C8781E"/></radialGradient>
<linearGradient id="tb-page" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F6E6C2"/><stop offset=".5" stop-color="#FFF4DA"/><stop offset="1" stop-color="#F0DDB4"/></linearGradient>
</defs>`;
}

function room(): string {
  let out = `<rect width="${W}" height="${H}" fill="url(#tb-wall)"/>`;
  // Stone courses on the back wall, and the arched window onto the night courtyard.
  for (let y = 60; y < BACK; y += 58)
    out += `<path d="M0 ${y} H${W}" stroke="${INK}" stroke-width="2" opacity=".25"/>`;
  out += `<path d="M960 330 V170 Q1040 70 1120 170 V330 Z" fill="#1C1018" ${OUT(4)}/>`;
  for (const [x, y] of [
    [1000, 150],
    [1060, 120],
    [1090, 190],
    [1030, 230],
  ] as const)
    out += `<circle cx="${x}" cy="${y}" r="2.4" fill="#FFE9C2" opacity=".8"/>`;
  out += `<rect y="${BACK - 40}" width="${W}" height="${H - BACK + 40}" fill="url(#tb-floor)"/>`;
  // The beam, and three lamps hanging from it.
  out += `<rect y="40" width="${W}" height="34" fill="#2A160C" ${OUT(3)}/>`;
  out += `<rect width="${W}" height="${H}" fill="url(#tb-glow)"/>`;
  for (const x of [300, 900]) {
    out += `<path d="M${x} 74 V140" stroke="${INK}" stroke-width="3"/>`;
    out += `<path d="M${x - 22} 140 H${x + 22} L${x + 14} 186 H${x - 14} Z" fill="url(#tb-lamp)" ${OUT(3)}/>`;
    out += `<path d="M${x - 26} 140 L${x} 124 L${x + 26} 140 Z" fill="#6A4220" ${OUT(3)}/>`;
  }
  return out;
}

/** Leila's portrait over the table, Nasser's map beside it. */
function wall(): string {
  let out = `<rect x="490" y="96" width="220" height="186" rx="6" fill="#8A5A2A" ${OUT(4)}/>`;
  out += `<rect x="506" y="112" width="188" height="154" fill="#E8C890"/>`;
  // The portrait, in Leila's hand: the innkeeper herself, flour and all, a red scarf.
  out += `<circle cx="600" cy="168" r="30" fill="#C88A5A" ${OUT(3)}/>`;
  out += `<path d="M548 266 Q552 214 600 208 Q648 214 652 266 Z" fill="#B5432F" ${OUT(3)}/>`;
  out += `<path d="M570 156 Q600 126 630 156" stroke="#3A2214" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  // The map, pinned up, with a dotted road across it.
  out += `<path d="${poly([
    [190, 230],
    [380, 220],
    [384, 360],
    [196, 372],
  ])}" fill="#E8D2A0" ${OUT(3)}/>`;
  out += `<path d="M214 340 Q260 280 300 300 T360 246" stroke="#8A3A22" stroke-width="3" stroke-dasharray="6 6" fill="none"/>`;
  for (const [x, y] of [
    [214, 340],
    [360, 246],
  ] as const)
    out += `<circle cx="${x}" cy="${y}" r="6" fill="#B5432F" ${OUT(2)}/>`;
  return out;
}

/** The long table, seen from its end, with the keepsakes and the open guest book. */
function table(): string {
  let out = `<path d="${poly([
    [120, BACK],
    [1080, BACK],
    [1160, FRONT],
    [40, FRONT],
  ])}" fill="url(#tb-top)" ${OUT(4)}/>`;
  out += `<path d="${poly([
    [40, FRONT],
    [1160, FRONT],
    [1160, FRONT + 40],
    [40, FRONT + 40],
  ])}" fill="url(#tb-front)" ${OUT(4)}/>`;
  for (const x of [90, 1110])
    out += `<rect x="${x - 16}" y="${FRONT + 40}" width="32" height="${H - FRONT - 40}" fill="#2E180C" ${OUT(3)}/>`;
  // Salim's cup, and others' cups along the table.
  for (const [x, y, s] of [
    [230, 500, 1],
    [430, 492, 0.85],
    [790, 494, 0.85],
    [960, 506, 1],
  ] as const) {
    out += `<path d="M${f(x - 16 * s)} ${f(y - 24 * s)} H${f(x + 16 * s)} L${f(x + 12 * s)} ${y} H${f(x - 12 * s)} Z" fill="#E8D8B8" ${OUT(2.6)}/>`;
  }
  out += `<path d="M216 470 q-6 -12 2 -22 q6 -10 -2 -20" stroke="#FFE9C2" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>`;
  // A brass coffee pot (the dallah) in the middle.
  out += `<path d="M690 500 Q680 460 698 440 L702 420 H714 L718 440 Q736 460 726 500 Z" fill="#E0A33A" ${OUT(3)}/><path d="M692 456 Q660 446 652 424" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M692 456 Q660 446 652 424" stroke="#E0A33A" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
  // The guest book, open at the front, the pen across it.
  out += `<path d="M470 586 L600 560 L730 586 L730 600 L600 578 L470 600 Z" fill="#5A3018" ${OUT(3)}/>`;
  out += `<path d="M478 582 L600 556 L600 574 L478 596 Z" fill="url(#tb-page)" ${OUT(2.6)}/><path d="M600 556 L722 582 L722 596 L600 574 Z" fill="url(#tb-page)" ${OUT(2.6)}/>`;
  for (let i = 0; i < 3; i++)
    out += `<path d="M${500 + i * 4} ${584 - i * 6} L${584} ${568 - i * 6}" stroke="#6A4A30" stroke-width="2" opacity=".7"/>`;
  out += `<path d="M640 590 L708 560" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M640 590 L708 560" stroke="#3A2214" stroke-width="3.4" stroke-linecap="round"/>`;
  return out;
}

/** A regular on the bench, seen from behind or the side: a head, shoulders and a color. */
function sitter(
  x: number,
  y: number,
  s: number,
  cloth: string,
  head = '#C88A5A',
  wrap = '',
): string {
  let out = `<path d="M${f(x - 44 * s)} ${f(y + 70 * s)} Q${f(x - 48 * s)} ${f(y + 6 * s)} ${x} ${f(y)} Q${f(x + 48 * s)} ${f(y + 6 * s)} ${f(x + 44 * s)} ${f(y + 70 * s)} Z" fill="${cloth}" ${OUT(3)}/>`;
  out += `<circle cx="${x}" cy="${f(y - 26 * s)} " r="${f(26 * s)}" fill="${head}" ${OUT(3)}/>`;
  if (wrap)
    out += `<path d="M${f(x - 27 * s)} ${f(y - 30 * s)} Q${x} ${f(y - 66 * s)} ${f(x + 27 * s)} ${f(y - 30 * s)} Z" fill="${wrap}" ${OUT(2.6)}/>`;
  return out;
}

/** The table's people: the regulars down both sides, the innkeeper, the stranger at the end. */
function people(): string {
  let out = '';
  // Down the far side, behind the table.
  out += sitter(300, 420, 0.8, '#3F7A4A', '#B07848', '#E8D8B8');
  out += sitter(430, 412, 0.72, '#6A3F6E', '#C88A5A');
  out += sitter(780, 412, 0.72, '#C98A2A', '#8A5A3A', '#F2E2C2');
  out += sitter(900, 420, 0.8, '#8E2E35', '#C88A5A');
  // The innkeeper, standing at the head, flour on her sleeves.
  out += `<path d="M560 470 Q556 380 600 370 Q644 380 640 470 Z" fill="#B5432F" ${OUT(3)}/><circle cx="600" cy="344" r="28" fill="#B07848" ${OUT(3)}/><path d="M572 340 Q600 300 628 340 Z" fill="#E8D8B8" ${OUT(2.6)}/>`;
  for (const x of [566, 634])
    out += `<circle cx="${x}" cy="436" r="9" fill="#F6EEDC" opacity=".8"/>`;
  return out;
}

/** Down the near side, their backs to us; the stranger on the bench at the end. */
function nearSide(): string {
  let out = sitter(250, 716, 1.3, '#4A6A3A', '#3A2214');
  out += sitter(470, 724, 1.2, '#7A3A5A', '#5A3A28', '#C98A2A');
  // The stranger, dust on the cloak, a pack at their feet, looking up the table.
  out += sitter(1010, 716, 1.3, '#8A7A62', '#C88A5A', '#6A5A48');
  out += `<rect x="1090" y="700" width="70" height="56" rx="12" fill="#6A4A30" ${OUT(3)}/>`;
  out += `<path d="M1100 700 Q1125 680 1150 700" stroke="${INK}" stroke-width="4" fill="none"/>`;
  return out;
}

export function paintTable(): string {
  return `${defs()}${room()}${wall()}${people()}${table()}${nearSide()}`;
}
