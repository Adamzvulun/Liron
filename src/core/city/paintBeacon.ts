// Forty Winters, the finale screen (task 4.2, #334): the lantern room at the top of the Signal
// Tower, at night. The tower's own beacon burns in its brass lens at the left; across the water
// the far station's beacon answers it from the headland, the two beams reaching for each other.
// The Guildmaster sits in the operator's chair at the right, her hand on the key, two cups of tea
// beside the set. Painted in the browser, deterministic, at 1200×800 (the shape of a picture on a
// card, so a phone sees all of it), in the city's style (ADR 0006, ADR 0025). The night is warm
// plum and umber, never blue (Adam, v2.0).

import { f, INK, OUT, poly, type Pt } from './paintKit.ts';

export const BEACON_STAGE = { width: 1200, height: 800 } as const;

const W = BEACON_STAGE.width;
const H = BEACON_STAGE.height;
/** Where the sea meets the sky. */
const HORIZON = 430;
/** The tower's own lamp, and the far one on the headland. */
const NEAR: Pt = [190, 330];
const FAR: Pt = [772, 356];
const AMBER = '#FFC861';

/** The same stars every time: a small deterministic scatter. */
function stars(): string {
  let seed = 40;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  let out = '';
  for (let i = 0; i < 70; i++) {
    const x = next() * W;
    const y = next() * (HORIZON - 60);
    const r = 0.8 + next() * 1.8;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#FFE9C2" opacity="${f(0.35 + next() * 0.6)}"/>`;
  }
  return out;
}

function defs(): string {
  return `<defs>
<linearGradient id="bc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140C18"/><stop offset=".7" stop-color="#2E1A2A"/><stop offset="1" stop-color="#4A2A30"/></linearGradient>
<linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C1A1E"/><stop offset="1" stop-color="#100A0C"/></linearGradient>
<radialGradient id="bc-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${NEAR[0]} ${NEAR[1]}) scale(330 300)"><stop offset="0" stop-color="${AMBER}" stop-opacity=".75"/><stop offset=".35" stop-color="#FFB347" stop-opacity=".25"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient>
<radialGradient id="bc-far" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${FAR[0]} ${FAR[1]}) scale(70 60)"><stop offset="0" stop-color="#FFF3C8"/><stop offset=".3" stop-color="${AMBER}" stop-opacity=".7"/><stop offset="1" stop-color="${AMBER}" stop-opacity="0"/></radialGradient>
<linearGradient id="bc-beam-near" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE7A0" stop-opacity=".55"/><stop offset="1" stop-color="#FFE7A0" stop-opacity="0"/></linearGradient>
<linearGradient id="bc-beam-far" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#FFE7A0" stop-opacity=".5"/><stop offset="1" stop-color="#FFE7A0" stop-opacity="0"/></linearGradient>
<linearGradient id="bc-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6A4630"/><stop offset="1" stop-color="#3A2418"/></linearGradient>
<linearGradient id="bc-desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9A6038"/><stop offset="1" stop-color="#4E2C16"/></linearGradient>
<linearGradient id="bc-brass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A5A20"/><stop offset=".5" stop-color="#F0C46A"/><stop offset="1" stop-color="#8A5A20"/></linearGradient>
<linearGradient id="bc-shawl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A4C7A"/><stop offset="1" stop-color="#4A2440"/></linearGradient>
<radialGradient id="bc-dial" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF0B8"/><stop offset=".7" stop-color="#F0B048"/><stop offset="1" stop-color="#8A5418"/></radialGradient>
</defs>`;
}

function night(): string {
  let out = `<rect width="${W}" height="${HORIZON + 2}" fill="url(#bc-sky)"/>${stars()}`;
  out += `<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#bc-sea)"/>`;
  // The far shore: a low headland, the far station's tower on it.
  out += `<path d="${poly([
    [620, HORIZON + 4],
    [690, 400],
    [772, 390],
    [870, 394],
    [960, 398],
    [1060, 400],
    [1200, 396],
    [1200, HORIZON + 6],
  ])}" fill="#1A0E10"/>`;
  out += `<path d="${poly([
    [FAR[0] - 12, 394],
    [FAR[0] - 8, FAR[1] + 8],
    [FAR[0] + 8, FAR[1] + 8],
    [FAR[0] + 12, 394],
  ])}" fill="#2A1A18"/><rect x="${FAR[0] - 9}" y="${FAR[1] - 8}" width="18" height="14" rx="2" fill="#3A2420"/>`;
  // The two beams, reaching for each other over the water.
  out += `<path d="${poly([NEAR, [860, 300], [866, 350]])}" fill="url(#bc-beam-near)"/>`;
  out += `<path d="${poly([FAR, [300, 300], [292, 372]])}" fill="url(#bc-beam-far)"/>`;
  out += `<circle cx="${FAR[0]}" cy="${FAR[1]}" r="70" fill="url(#bc-far)"/>`;
  // Their light on the water: broken strokes under each lamp, closer ones longer.
  for (let i = 0; i < 9; i++) {
    const y = HORIZON + 12 + i * i * 4.2;
    const w = 14 + i * 9;
    out += `<path d="M${f(FAR[0] - w / 2 + (i % 2) * 8)} ${f(y)} h${f(w)}" stroke="${AMBER}" stroke-width="${f(1.4 + i * 0.35)}" stroke-linecap="round" opacity="${f(0.75 - i * 0.06)}"/>`;
    const nw = 20 + i * 14;
    out += `<path d="M${f(420 - nw / 2 - (i % 2) * 10)} ${f(y + 6)} h${f(nw)}" stroke="#FFE7A0" stroke-width="${f(1.6 + i * 0.4)}" stroke-linecap="round" opacity="${f(0.45 - i * 0.035)}"/>`;
  }
  return out;
}

/** The lantern room's glazing: iron mullions, a rail, and the stone parapet below. */
function room(): string {
  let out = '';
  for (const x of [330, 640, 1010]) {
    out += `<rect x="${x - 9}" y="0" width="18" height="560" fill="#24140E"/><rect x="${x - 3}" y="0" width="4" height="560" fill="#5A3A26" opacity=".7"/>`;
  }
  out += `<rect x="0" y="0" width="${W}" height="26" fill="#24140E"/>`;
  out += `<rect x="0" y="470" width="${W}" height="12" fill="#24140E"/>`;
  // The parapet, warm stone lit from the lamp.
  out += `<path d="${poly([
    [0, 548],
    [W, 548],
    [W, H],
    [0, H],
  ])}" fill="url(#bc-wall)" ${OUT(4)}/>`;
  for (let row = 0; row < 3; row++) {
    const y = 586 + row * 72;
    out += `<path d="M0 ${y} H${W}" stroke="${INK}" stroke-width="2.4" opacity=".55"/>`;
    for (let x = (row % 2) * 90; x < W; x += 180)
      out += `<path d="M${x} ${y - 38} V${y}" stroke="${INK}" stroke-width="2.4" opacity=".45"/>`;
  }
  return out;
}

/** The tower's own beacon: a tall brass lens on its pedestal, burning. */
function lamp(): string {
  const [x, y] = NEAR;
  let out = `<circle cx="${x}" cy="${y}" r="300" fill="url(#bc-glow)"/>`;
  out += `<path d="${poly([
    [x - 70, 640],
    [x - 52, 470],
    [x + 52, 470],
    [x + 70, 640],
  ])}" fill="url(#bc-brass)" ${OUT(4)}/>`;
  out += `<rect x="${x - 86}" y="636" width="172" height="26" rx="6" fill="#6A4220" ${OUT(4)}/>`;
  // The lens: stacked glass rings, bright at the middle.
  for (let i = 0; i < 7; i++) {
    const ry = 22;
    const cy = y - 120 + i * 40;
    const rx = 74 - Math.abs(i - 3) * 9;
    out += `<ellipse cx="${x}" cy="${f(cy)}" rx="${f(rx)}" ry="${ry}" fill="#FFF0C0" opacity="${f(0.55 + (3 - Math.abs(i - 3)) * 0.13)}" ${OUT(3)}/>`;
  }
  out += `<circle cx="${x}" cy="${y}" r="26" fill="#FFFBEA"/>`;
  out += `<path d="M${x - 40} ${y - 154} Q${x} ${y - 190} ${x + 40} ${y - 154}" fill="#6A4220" ${OUT(4)}/>`;
  return out;
}

/** The operator's desk, the set, the key and two cups of tea. */
function desk(): string {
  let out = `<path d="${poly([
    [560, 622],
    [W, 612],
    [W, 668],
    [560, 676],
  ])}" fill="url(#bc-desk)" ${OUT(4)}/>`;
  out += `<path d="${poly([
    [576, 676],
    [606, 676],
    [606, H],
    [576, H],
  ])}" fill="#4E2C16" ${OUT(3)}/>`;
  // The set: a wooden cabinet with a glowing dial.
  out += `<rect x="1040" y="500" width="150" height="118" rx="8" fill="#5A3A22" ${OUT(4)}/>`;
  out += `<circle cx="1092" cy="556" r="30" fill="url(#bc-dial)" ${OUT(3)}/>`;
  out += `<path d="M1092 556 L1110 538" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  for (const cx of [1150, 1172])
    out += `<circle cx="${cx}" cy="590" r="8" fill="#2A1A14" ${OUT(2)}/>`;
  // Two cups, steam rising from one.
  for (const [cx, cy] of [
    [690, 610],
    [748, 606],
  ] as const) {
    out += `<path d="M${cx - 18} ${cy - 22} H${cx + 18} L${cx + 14} ${cy} H${cx - 14} Z" fill="#F2E2C2" ${OUT(3)}/>`;
    out += `<path d="M${cx + 17} ${cy - 16} q12 4 0 12" fill="none" ${OUT(3)}/>`;
  }
  out += `<path d="M686 580 q-8 -14 2 -26 q8 -12 -2 -24" stroke="#FFE9C2" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>`;
  return out;
}

/** The Guildmaster in the operator's chair, seen from behind, her hand on the key. */
function guildmaster(): string {
  const cx = 900;
  // The chair's back.
  let out = `<path d="${poly([
    [cx - 92, 700],
    [cx - 82, 520],
    [cx + 82, 520],
    [cx + 92, 700],
  ])}" fill="#5A321A" ${OUT(4)}/>`;
  // Her shoulders in a plum shawl, gray hair in a bun.
  out += `<path d="M${cx - 96} 640 Q${cx - 100} 512 ${cx - 40} 492 Q${cx} 482 ${cx + 40} 492 Q${cx + 100} 512 ${cx + 96} 640 Z" fill="url(#bc-shawl)" ${OUT(4)}/>`;
  out += `<ellipse cx="${cx}" cy="452" rx="44" ry="48" fill="#B8AFA6" ${OUT(4)}/>`;
  out += `<circle cx="${cx + 6}" cy="408" r="20" fill="#A49A90" ${OUT(3.4)}/>`;
  out += `<path d="M${cx - 30} 440 Q${cx} 424 ${cx + 30} 446" stroke="#8A7F76" stroke-width="3" fill="none"/>`;
  // Her right arm reaching down to the key on the desk.
  out += `<path d="M${cx - 80} 560 Q${cx - 150} 590 ${cx - 128} 618" stroke="${INK}" stroke-width="30" stroke-linecap="round" fill="none"/><path d="M${cx - 80} 560 Q${cx - 150} 590 ${cx - 128} 618" stroke="#6E3A62" stroke-width="22" stroke-linecap="round" fill="none"/>`;
  // The key: a brass lever on a dark base, her fingers on the knob.
  const kx = cx - 150;
  out += `<rect x="${kx - 40}" y="608" width="84" height="16" rx="4" fill="#3A2214" ${OUT(3)}/>`;
  out += `<path d="M${kx - 30} 606 L${kx + 26} 598" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${kx - 30} 606 L${kx + 26} 598" stroke="#F0C46A" stroke-width="5" stroke-linecap="round"/>`;
  out += `<circle cx="${kx + 22}" cy="616" r="12" fill="#D9A07A" ${OUT(3)}/>`;
  return out;
}

export function paintBeacon(): string {
  return `${defs()}${night()}${room()}${lamp()}${desk()}${guildmaster()}`;
}
