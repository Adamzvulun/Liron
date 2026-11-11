// The Radio Room (roadmap A5): a stone room high in the Signal Tower at night, in the city's
// painted style (ADR 0006, ADR 0025). A valve radio set glows on the operator's desk beside a
// telegraph key, headphones and the logbook; a map of the world with pinned contacts and a chart
// of the bands hang behind it, with QSL cards from far stations; a small window shows the aerial
// mast against the stars. Painted in the browser, deterministic, at 1920×1080, with one vanishing
// point. It sits behind the Radio Room and the Far Station as a still image (HallBackdrop), so
// nothing in it is a button.

import { f, INK, line, OUT, poly, type Pt } from './paintKit.ts';

export const RADIO_STAGE = { width: 1920, height: 1080 } as const;

const VP: Pt = [960, 420];
const L = 380;
const R = 1540;
const T = 140;
const B = 700;
const toward = ([x, y]: Pt, t: number): Pt => [VP[0] + (x - VP[0]) * t, VP[1] + (y - VP[1]) * t];
const floorAt = (x0: number, y: number): Pt => toward([x0, B], (y - VP[1]) / (B - VP[1]));
const BRASS = '#E0B05A';

function defs(): string {
  return `<defs>
<linearGradient id="rr-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A4E6A"/><stop offset="1" stop-color="#5E6380"/></linearGradient>
<linearGradient id="rr-side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2E3150"/><stop offset="1" stop-color="#474B68"/></linearGradient>
<linearGradient id="rr-side-r" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#2A2D4A"/><stop offset="1" stop-color="#434763"/></linearGradient>
<linearGradient id="rr-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4B2D1A"/><stop offset="1" stop-color="#6A3F22"/></linearGradient>
<linearGradient id="rr-ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E1A2E"/><stop offset="1" stop-color="#3A3048"/></linearGradient>
<linearGradient id="rr-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141A40"/><stop offset="1" stop-color="#3A3070"/></linearGradient>
<linearGradient id="rr-set" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A4A3A"/><stop offset="1" stop-color="#3A2E24"/></linearGradient>
<linearGradient id="rr-map" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3E3C0"/><stop offset="1" stop-color="#D9BE8A"/></linearGradient>
<radialGradient id="rr-dial" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#E8FFB0"/><stop offset=".7" stop-color="#9FD67E"/><stop offset="1" stop-color="#4E8A3A"/></radialGradient>
<radialGradient id="rr-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(970 560) scale(640 420)"><stop offset="0" stop-color="#FFC861" stop-opacity=".4"/><stop offset=".5" stop-color="#FFB347" stop-opacity=".12"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient>
<radialGradient id="rr-lamp" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1360 640) scale(380 300)"><stop offset="0" stop-color="#FFE7A0" stop-opacity=".45"/><stop offset="1" stop-color="#FFE7A0" stop-opacity="0"/></radialGradient>
<linearGradient id="rr-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E0C1E" stop-opacity=".05"/><stop offset="1" stop-color="#0E0C1E" stop-opacity=".35"/></linearGradient>
</defs>`;
}

function room(): string {
  const leftFoot = floorAt(L, 1080);
  const rightFoot = floorAt(R, 1080);
  const out: string[] = [];
  out.push(
    `<path d="${poly([
      [0, 0],
      [1920, 0],
      [R, T],
      [L, T],
    ])}" fill="url(#rr-ceil)"/>`,
  );
  out.push(
    `<path d="${poly([[0, 0], [L, T], [L, B], leftFoot, [0, 1080]])}" fill="url(#rr-side)"/>`,
  );
  out.push(
    `<path d="${poly([[1920, 0], [R, T], [R, B], rightFoot, [1920, 1080]])}" fill="url(#rr-side-r)"/>`,
  );
  out.push(`<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="url(#rr-wall)"/>`);
  const floor = poly([[L, B], [R, B], rightFoot, [1920, 1080], [0, 1080], leftFoot]);
  out.push(`<path d="${floor}" fill="url(#rr-floor)"/>`);
  // Stone courses on the back wall, each row offset by half a block.
  const blocks: string[] = [];
  for (let y = T + 44, row = 0; y < B; y += 44, row++) {
    blocks.push(`M${L} ${y} L${R} ${y}`);
    for (let x = L + (row % 2 ? 55 : 0); x < R; x += 110) blocks.push(`M${x} ${y - 44} L${x} ${y}`);
  }
  out.push(
    `<path d="${blocks.join(' ')}" stroke="#34374F" stroke-width="2.5" opacity=".7" fill="none"/>`,
  );
  // Courses on the side walls, running to the vanishing point.
  const sides: string[] = [];
  for (let y = T + 44; y < B; y += 44) {
    sides.push(line([[L, y], toward([L, y], 3)]));
    sides.push(line([[R, y], toward([R, y], 3)]));
  }
  out.push(
    `<path d="${sides.join(' ')}" stroke="#25283E" stroke-width="2.5" opacity=".7" fill="none"/>`,
  );
  // Floor boards.
  const boards: string[] = [];
  for (let x = L - 1260; x <= R + 1260; x += 100) boards.push(line([VP, floorAt(x, 1080)]));
  out.push(
    `<clipPath id="rr-floorclip"><path d="${floor}"/></clipPath>` +
      `<path d="${boards.join(' ')}" clip-path="url(#rr-floorclip)" stroke="#2E1A10" stroke-width="2.5" opacity=".6" fill="none"/>`,
  );
  // Ceiling beams.
  for (const x of [L, 760, 1160, R]) {
    const [nx] = toward([x, T], 3.2);
    out.push(
      `<path d="${poly([
        [x - 10, T],
        [x + 10, T],
        [nx + 32, -30],
        [nx - 32, -30],
      ])}" fill="#2E2030" ${OUT(2.5)}/>`,
    );
  }
  return out.join('');
}

function windowToTheMast(): string {
  // A small arched window: night sky, stars, the moon and the aerial mast with its wires.
  const x0 = 450;
  const x1 = 630;
  const r = (x1 - x0) / 2;
  const top = 210;
  const bottom = 460;
  const pane = `M${x0} ${bottom} L${x0} ${top + r} A${r} ${r} 0 0 1 ${x1} ${top + r} L${x1} ${bottom} Z`;
  const stars: Pt[] = [
    [480, 260],
    [600, 250],
    [520, 330],
    [610, 390],
    [470, 410],
  ];
  return (
    `<clipPath id="rr-pane"><path d="${pane}"/></clipPath>` +
    `<path d="${pane}" fill="url(#rr-night)"/>` +
    `<g clip-path="url(#rr-pane)">` +
    stars.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#FFF3C8"/>`).join('') +
    `<circle cx="500" cy="290" r="20" fill="#FFF3C8"/><circle cx="508" cy="284" r="17" fill="#1C2148"/>` +
    `<path d="M578 470 L578 250 M558 290 L598 290 M564 330 L592 330" stroke="#06051A" stroke-width="7"/>` +
    `<path d="M578 250 L450 330 M578 250 L640 320" stroke="#0E0C1E" stroke-width="2"/>` +
    `<circle cx="578" cy="246" r="5" fill="#FF6A4A"/>` +
    `</g>` +
    `<path d="${pane}" fill="none" stroke="#3A3048" stroke-width="16"/>` +
    `<path d="${pane}" fill="none" ${OUT(3)}/>` +
    `<path d="M${(x0 + x1) / 2} ${top} L${(x0 + x1) / 2} ${bottom}" stroke="#3A3048" stroke-width="8"/>` +
    `<rect x="${x0 - 16}" y="${bottom}" width="${x1 - x0 + 32}" height="18" rx="3" fill="#5A5F7A" ${OUT(2.5)}/>`
  );
}

function worldMap(): string {
  // The world on parchment, contacts pinned with strings back to the tower.
  const x0 = 740;
  const y0 = 165;
  const w = 480;
  const h = 200;
  const out: string[] = [];
  out.push(
    `<rect x="${x0 - 14}" y="${y0 - 14}" width="${w + 28}" height="${h + 28}" rx="6" fill="#6A3F22" ${OUT()}/>`,
  );
  out.push(`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#rr-map)"/>`);
  const grid: string[] = [];
  for (let x = x0 + 60; x < x0 + w; x += 60) grid.push(`M${x} ${y0} L${x} ${y0 + h}`);
  for (let y = y0 + 54; y < y0 + h; y += 54) grid.push(`M${x0} ${y} L${x0 + w} ${y}`);
  out.push(`<path d="${grid.join(' ')}" stroke="#B89A6A" stroke-width="1.5" opacity=".8"/>`);
  // Made-up lands, not any real coastline.
  const lands = [
    `M${x0 + 40} ${y0 + 60} Q${x0 + 90} ${y0 + 30} ${x0 + 140} ${y0 + 60} Q${x0 + 170} ${y0 + 110} ${x0 + 130} ${y0 + 150} Q${x0 + 120} ${y0 + 210} ${x0 + 90} ${y0 + 230} Q${x0 + 60} ${y0 + 180} ${x0 + 70} ${y0 + 140} Q${x0 + 30} ${y0 + 110} ${x0 + 40} ${y0 + 60} Z`,
    `M${x0 + 210} ${y0 + 50} Q${x0 + 290} ${y0 + 20} ${x0 + 380} ${y0 + 50} Q${x0 + 440} ${y0 + 80} ${x0 + 420} ${y0 + 120} Q${x0 + 360} ${y0 + 130} ${x0 + 330} ${y0 + 170} Q${x0 + 300} ${y0 + 230} ${x0 + 270} ${y0 + 200} Q${x0 + 250} ${y0 + 150} ${x0 + 220} ${y0 + 130} Q${x0 + 190} ${y0 + 90} ${x0 + 210} ${y0 + 50} Z`,
    `M${x0 + 380} ${y0 + 190} Q${x0 + 420} ${y0 + 175} ${x0 + 450} ${y0 + 200} Q${x0 + 440} ${y0 + 235} ${x0 + 400} ${y0 + 235} Q${x0 + 370} ${y0 + 220} ${x0 + 380} ${y0 + 190} Z`,
  ];
  out.push(
    `<clipPath id="rr-mapclip"><rect x="${x0}" y="${y0}" width="${w}" height="${h}"/></clipPath>` +
      `<path d="${lands.join(' ')}" clip-path="url(#rr-mapclip)" fill="#9FB07A" stroke="#6A5A3A" stroke-width="2.5"/>`,
  );
  const home: Pt = [x0 + 300, y0 + 100];
  const pins: [Pt, string][] = [
    [[x0 + 100, y0 + 90], '#B5432F'],
    [[x0 + 110, y0 + 190], '#3F7F8C'],
    [[x0 + 390, y0 + 70], '#C98A2A'],
    [[x0 + 420, y0 + 210], '#5B3F7A'],
    [[x0 + 250, y0 + 170], '#A83A3E'],
  ];
  out.push(
    `<path d="${pins.map(([p]) => line([home, p])).join(' ')}" stroke="#B5432F" stroke-width="2" opacity=".8"/>`,
  );
  for (const [[x, y], c] of [...pins, [home, BRASS] as [Pt, string]]) {
    out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="7" fill="${c}" ${OUT(2)}/>`);
  }
  // The chart of the bands under it: one stripe per band, short waves to long.
  const bands = ['#B5432F', '#C98A2A', '#E0B05A', '#7A9A3A', '#3F7F8C', '#5B3F7A'];
  const bw = w / bands.length;
  out.push(
    `<rect x="${x0 - 6}" y="${y0 + h + 30}" width="${w + 12}" height="46" rx="4" fill="#F3E3C0" ${OUT(2.5)}/>`,
  );
  bands.forEach((c, i) => {
    out.push(
      `<rect x="${f(x0 + i * bw + 6)}" y="${y0 + h + 38}" width="${f(bw - 12)}" height="18" rx="3" fill="${c}"/>`,
    );
    out.push(
      `<rect x="${f(x0 + i * bw + 14)}" y="${y0 + h + 62}" width="${f(bw - 28)}" height="5" rx="2" fill="#8A6446"/>`,
    );
  });
  return out.join('');
}

function qslCards(): string {
  // Cards from stations worked, pinned up beside the map.
  const cards: [number, number, string, number][] = [
    [1270, 200, '#B5432F', -4],
    [1390, 230, '#3F7F8C', 5],
    [1290, 330, '#C98A2A', 3],
    [1410, 360, '#5B3F7A', -6],
    [1300, 460, '#7A9A3A', -2],
  ];
  return cards
    .map(
      ([x, y, c, rot]) =>
        `<g transform="rotate(${rot} ${x + 50} ${y + 35})">` +
        `<rect x="${x}" y="${y}" width="100" height="70" rx="3" fill="#F6EEDC" ${OUT(2.5)}/>` +
        `<rect x="${x + 8}" y="${y + 8}" width="38" height="26" fill="${c}"/>` +
        `<path d="M${x + 54} ${y + 14} L${x + 90} ${y + 14} M${x + 54} ${y + 26} L${x + 84} ${y + 26} M${x + 10} ${y + 48} L${x + 90} ${y + 48} M${x + 10} ${y + 58} L${x + 70} ${y + 58}" stroke="#8A6446" stroke-width="3" stroke-linecap="round"/>` +
        `<circle cx="${x + 50}" cy="${y + 6}" r="5" fill="${BRASS}" ${OUT(1.5)}/>` +
        `</g>`,
    )
    .join('');
}

function desk(): string {
  const out: string[] = [];
  const top: Pt[] = [
    [480, 630],
    [1440, 630],
    [1500, 720],
    [420, 720],
  ];
  out.push(
    `<path d="${poly([
      [420, 720],
      [1500, 720],
      [1500, 770],
      [420, 770],
    ])}" fill="#5E3820" ${OUT()}/>`,
  );
  for (const x of [440, 1460]) {
    out.push(`<rect x="${x}" y="770" width="34" height="170" fill="#4B2D1A" ${OUT(2.5)}/>`);
  }
  out.push(`<path d="${poly(top)}" fill="#8A5530" ${OUT()}/>`);
  // A drawer front.
  out.push(
    `<rect x="880" y="732" width="160" height="28" rx="3" fill="#6A3F22" ${OUT(2)}/><circle cx="960" cy="746" r="5" fill="${BRASS}"/>`,
  );
  return out.join('');
}

function radioSet(): string {
  const out: string[] = [];
  const x0 = 800;
  const x1 = 1140;
  const y0 = 500;
  const y1 = 650;
  // The cabinet, a little wider at the front, and its valves glowing on top.
  for (const [i, x] of [860, 920, 980, 1040, 1080].entries()) {
    const h = i % 2 ? 46 : 58;
    out.push(
      `<circle cx="${x + 12}" cy="${y0 - h / 2}" r="30" fill="#FFB347" opacity=".22"/>` +
        `<rect x="${x}" y="${y0 - h}" width="24" height="${h}" rx="12" fill="#FFC861" ${OUT(2.5)}/>` +
        `<rect x="${x + 7}" y="${y0 - h + 12}" width="10" height="${h - 24}" rx="4" fill="#FF8A3A"/>`,
    );
  }
  out.push(
    `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="10" fill="url(#rr-set)" ${OUT()}/>`,
  );
  out.push(
    `<rect x="${x0 + 14}" y="${y0 + 14}" width="${x1 - x0 - 28}" height="${y1 - y0 - 28}" rx="6" fill="#2A2018" ${OUT(2)}/>`,
  );
  // The tuning dial, glowing green, with its scale.
  const [dx, dy] = [900, 574];
  out.push(`<circle cx="${dx}" cy="${dy}" r="56" fill="url(#rr-dial)" ${OUT(3)}/>`);
  const ticks: string[] = [];
  for (let k = 0; k < 16; k++) {
    const a = Math.PI * (0.8 + (1.4 * k) / 15);
    ticks.push(
      line([
        [dx + 44 * Math.cos(a), dy + 44 * Math.sin(a)],
        [dx + 52 * Math.cos(a), dy + 52 * Math.sin(a)],
      ]),
    );
  }
  out.push(`<path d="${ticks.join(' ')}" stroke="#2A4A1E" stroke-width="2.5"/>`);
  out.push(
    `<path d="${line([
      [dx, dy],
      [dx + 34, dy - 30],
    ])}" stroke="#B5432F" stroke-width="4" stroke-linecap="round"/>`,
  );
  // The signal meter.
  out.push(
    `<rect x="990" y="520" width="120" height="62" rx="6" fill="#F3E3C0" ${OUT(2.5)}/>` +
      `<path d="M1006 572 A44 44 0 0 1 1094 572" fill="none" stroke="#8A6446" stroke-width="3"/>` +
      `<path d="M1076 572 A26 26 0 0 1 1094 572" fill="none" stroke="#B5432F" stroke-width="5"/>` +
      `<path d="M1050 576 L1078 540" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  );
  // Knobs.
  for (const x of [1010, 1050, 1090]) {
    out.push(
      `<circle cx="${x}" cy="618" r="12" fill="#1E1812" ${OUT(2.5)}/><circle cx="${x}" cy="613" r="3" fill="${BRASS}"/>`,
    );
  }
  // The aerial lead up to the window.
  out.push(
    `<path d="M${x0 + 20} ${y0 + 10} Q700 380 640 430" fill="none" stroke="${INK}" stroke-width="4"/>`,
  );
  return out.join('');
}

function onTheDesk(): string {
  const out: string[] = [];
  // The open logbook, its lines filled in.
  out.push(
    `<path d="${poly([
      [520, 650],
      [640, 646],
      [646, 704],
      [508, 708],
    ])}" fill="#F6EEDC" ${OUT(2.5)}/>` +
      `<path d="${poly([
        [640, 646],
        [760, 652],
        [776, 710],
        [646, 704],
      ])}" fill="#EFE2C6" ${OUT(2.5)}/>`,
  );
  const lines: string[] = [];
  for (let k = 0; k < 4; k++) {
    lines.push(
      line([
        [530 - k * 2, 662 + k * 11],
        [628, 660 + k * 11],
      ]),
    );
    lines.push(
      line([
        [654, 660 + k * 11],
        [752 + k * 3, 664 + k * 11],
      ]),
    );
  }
  out.push(`<path d="${lines.join(' ')}" stroke="#8A6446" stroke-width="2"/>`);
  // Headphones on the desk.
  out.push(
    `<path d="M600 610 Q650 540 700 610" fill="none" stroke="#2A2018" stroke-width="8" stroke-linecap="round"/>` +
      `<ellipse cx="600" cy="618" rx="16" ry="20" fill="#3A2E24" ${OUT(2.5)}/>` +
      `<ellipse cx="700" cy="618" rx="16" ry="20" fill="#3A2E24" ${OUT(2.5)}/>`,
  );
  // The telegraph key: a base, a brass lever and a black knob.
  out.push(
    `<path d="${poly([
      [1180, 690],
      [1320, 690],
      [1330, 712],
      [1170, 712],
    ])}" fill="#4B2D1A" ${OUT(2.5)}/>` +
      `<path d="M1196 684 L1300 668" stroke="${BRASS}" stroke-width="8" stroke-linecap="round"/>` +
      `<path d="M1196 684 L1300 668" ${OUT(2)} fill="none"/>` +
      `<ellipse cx="1306" cy="664" rx="18" ry="9" fill="#1E1812" ${OUT(2)}/>` +
      `<circle cx="1220" cy="690" r="6" fill="${BRASS}" ${OUT(1.5)}/>`,
  );
  // A desk lamp on a jointed arm.
  out.push(
    `<ellipse cx="1400" cy="646" rx="34" ry="10" fill="#3A2E24" ${OUT(2.5)}/>` +
      `<path d="M1400 642 L1420 560 L1370 520" fill="none" stroke="#3A2E24" stroke-width="8" stroke-linecap="round"/>` +
      `<path d="M1330 520 L1400 500 L1410 540 Z" fill="#265965" ${OUT(2.5)}/>` +
      `<ellipse cx="1374" cy="538" rx="12" ry="6" fill="#FFF3C8"/>`,
  );
  return out.join('');
}

function clock(): string {
  // A wall clock on the right wall: operators log the time of every contact.
  const [cx, cy] = toward([R, 300], 1.35);
  return (
    `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="48" ry="56" fill="#F3E3C0" ${OUT(3)}/>` +
    `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="40" ry="48" fill="none" stroke="#8A6446" stroke-width="2"/>` +
    `<path d="M${f(cx)} ${f(cy)} L${f(cx)} ${f(cy - 34)} M${f(cx)} ${f(cy)} L${f(cx + 22)} ${f(cy + 10)}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
  );
}

/** The whole room, as SVG markup for a 1920×1080 stage. */
export function paintRadioRoom(): string {
  return (
    defs() +
    room() +
    windowToTheMast() +
    worldMap() +
    qslCards() +
    clock() +
    desk() +
    radioSet() +
    onTheDesk() +
    `<rect width="1920" height="1080" fill="url(#rr-glow)"/>` +
    `<rect width="1920" height="1080" fill="url(#rr-lamp)"/>` +
    `<rect width="1920" height="1080" fill="url(#rr-shade)"/>`
  );
}
