// The city square (issue #24), painted in the browser from the approved concept v3
// (docs/design/concept-v0/tools/city.js, moved here; the concept tool stays as the design record).
// Deterministic: every call paints the same scene from the same seed. Returns SVG markup per
// layer and per place; React positions them (City.tsx). ADR 0025.
export function paintCity() {
  // Waymark city v3 generator: painterly Flash-cartoon look (gradients everywhere,
  // one sun from the upper left, cast shadows, organic outlines, cobbles, depth haze).

  // ---------- utilities ----------
  let seed = 7;
  const rnd = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const R = (a, b) => a + (b - a) * rnd();
  const f = (n) => Math.round(n * 10) / 10;
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const toHex = (a) =>
    '#' +
    a
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');
  const mix = (a, b, t) => {
    const A = hex(a),
      B = hex(b);
    return toHex(A.map((v, i) => v + (B[i] - v) * t));
  };
  const HAZE = '#EBD6BC',
    INK = '#2A170C',
    WARM = '#FFF1CF',
    SHADE = '#3A2140';
  const lit = (c, t) => mix(c, WARM, t);
  const dk = (c, t) => mix(c, SHADE, t);
  const hz = (c, t) => (t ? mix(c, HAZE, t) : c);

  // Smooth closed/open path through points (Catmull-Rom -> cubic Bezier)
  function smooth(pts, closed = true, k = 1) {
    const n = pts.length;
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1),
        p1 = P(i),
        p2 = P(i + 1),
        p3 = P(i + 2);
      const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k];
      const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k];
      d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + (closed ? ' Z' : '');
  }
  // Hand-drawn polygon: rounded corners and slightly bowed edges
  function soft(pts, r = 6, bow = 1.2) {
    const n = pts.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = pts[(i - 1 + n) % n],
        b = pts[i],
        c = pts[(i + 1) % n];
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]),
        l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const r1 = Math.min(r, l1 / 2.2),
        r2 = Math.min(r, l2 / 2.2);
      const p = [b[0] + ((a[0] - b[0]) / l1) * r1, b[1] + ((a[1] - b[1]) / l1) * r1];
      const q = [b[0] + ((c[0] - b[0]) / l2) * r2, b[1] + ((c[1] - b[1]) / l2) * r2];
      if (i === 0) d += `M${f(p[0])} ${f(p[1])}`;
      else {
        // bowed edge from previous corner to p
        const m = [(d._last[0] + p[0]) / 2 + R(-bow, bow), (d._last[1] + p[1]) / 2 + R(-bow, bow)];
        d += ` Q${f(m[0])} ${f(m[1])} ${f(p[0])} ${f(p[1])}`;
      }
      d += ` Q${f(b[0])} ${f(b[1])} ${f(q[0])} ${f(q[1])}`;
      d = Object.assign(new String(d), { _last: q });
    }
    const first = d.match(/^M([\d.-]+) ([\d.-]+)/);
    const m = [
      (d._last[0] + +first[1]) / 2 + R(-bow, bow),
      (d._last[1] + +first[2]) / 2 + R(-bow, bow),
    ];
    return String(d) + ` Q${f(m[0])} ${f(m[1])} ${first[1]} ${first[2]} Z`;
  }
  const blob = (cx, cy, rx, ry, n = 9, j = 0.12) =>
    smooth(
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const s = 1 + R(-j, j);
        return [cx + Math.cos(a) * rx * s, cy + Math.sin(a) * ry * s];
      }),
    );

  // ---------- defs registry ----------
  const defs = [];
  let uid = 0;
  const id = (p) => `wm-${p}${++uid}`;
  // Animated pieces (#123, ADR 0025 amended). Each one is cut out of the static scene and
  // returned as its own small sprite, in paint order, so the page can animate it as a separate
  // layer (transform and opacity only) while the rest of the scene stays still and is drawn
  // once. `box` is the piece's own box on the stage; motions that scale or rotate turn about
  // the origin given (stage pixels), else about the box's centre.
  const sprites = [];
  function anim(motion, box, svg, origin) {
    sprites.push({ motion, box, svg, ...(origin ? { origin } : {}) });
    return `<!--wm-sprite:${sprites.length - 1}-->`;
  }
  /** Splits markup into static runs and the sprites cut out of it, in paint order. */
  const segments = (markup) =>
    markup
      .split(/<!--wm-sprite:(\d+)-->/)
      .map((part, i) => (i % 2 ? sprites[Number(part)] : part))
      .filter((part) => part !== '');
  function lin(stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1, extra = '') {
    const i = id('g');
    defs.push(
      `<linearGradient id="${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${extra}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}></stop>`).join('')}</linearGradient>`,
    );
    return `url(#${i})`;
  }
  function rad(stops, cx = 0.5, cy = 0.5, r = 0.5, extra = '') {
    const i = id('r');
    defs.push(
      `<radialGradient id="${i}" cx="${cx}" cy="${cy}" r="${r}"${extra}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}></stop>`).join('')}</radialGradient>`,
    );
    return `url(#${i})`;
  }
  defs.push(
    `<filter id="fx-b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"></feGaussianBlur></filter>`,
  );
  defs.push(
    `<filter id="fx-b6" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"></feGaussianBlur></filter>`,
  );
  defs.push(
    `<filter id="fx-b14" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="14"></feGaussianBlur></filter>`,
  );
  defs.push(
    `<filter id="fx-dof" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"></feGaussianBlur></filter>`,
  );
  defs.push(
    `<filter id="fx-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"></feTurbulence><feColorMatrix type="matrix" values="0 0 0 0 .5  0 0 0 0 .4  0 0 0 0 .3  0 0 0 .55 0"></feColorMatrix></filter>`,
  );
  defs.push(
    `<filter id="fx-plaster" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".035 .06" numOctaves="3" seed="4"></feTurbulence><feColorMatrix type="matrix" values="0 0 0 0 .45  0 0 0 0 .3  0 0 0 0 .18  0 0 0 1.1 -.45"></feColorMatrix></filter>`,
  );
  const AO = lin([
    [0, '#2A1608', 0.38],
    [0.16, '#2A1608', 0],
    [0.72, '#2A1608', 0],
    [1, '#2A1608', 0.42],
  ]);
  const AOH = lin(
    [
      [0, '#2A1608', 0.3],
      [0.2, '#2A1608', 0],
      [0.8, '#2A1608', 0],
      [1, '#2A1608', 0.3],
    ],
    0,
    0,
    1,
    0,
  );

  // ---------- shared painters ----------
  const OUT = (haze = 0, w = 3) =>
    `stroke="${hz(INK, haze * 0.8)}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  function castShadow(x0, x1, y, len, haze = 0, op = 0.32) {
    // sun upper-left -> shadow falls to the lower right, flattened on the ground
    const d = soft(
      [
        [x0, y],
        [x1, y],
        [x1 + len, y + len * 0.22],
        [x0 + len * 0.55, y + len * 0.3],
      ],
      18,
      3,
    );
    return `<path d="${d}" fill="#3B1E10" opacity="${f(op * (1 - haze * 0.6))}" filter="url(#fx-b6)"></path>`;
  }
  const contact = (cx, y, rx, op = 0.45) =>
    `<ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * 0.09 + 3)}" fill="#2A1608" opacity="${op}" filter="url(#fx-b2)"></ellipse>`;

  function windowEl(x, y, w, h, s, haze, shutters) {
    const g = lin([
      [0, hz('#2E3F5C', haze)],
      [0.55, hz('#A35A2C', haze)],
      [1, hz('#FFC86A', haze)],
    ]);
    const fr = hz('#5B3720', haze);
    let o = '';
    if (shutters) {
      const sh = lin([
        [0, lit(hz(shutters, haze), 0.25)],
        [1, dk(hz(shutters, haze), 0.25)],
      ]);
      o += `<path d="${soft(
        [
          [x - w * 0.55, y + 2],
          [x, y + 2],
          [x, y + h],
          [x - w * 0.55, y + h],
        ],
        3,
        0.5,
      )}" fill="${sh}" ${OUT(haze, 2 * s)}></path>`;
      o += `<path d="${soft(
        [
          [x + w, y + 2],
          [x + w * 1.55, y + 2],
          [x + w * 1.55, y + h],
          [x + w, y + h],
        ],
        3,
        0.5,
      )}" fill="${sh}" ${OUT(haze, 2 * s)}></path>`;
    }
    const top = y + w * 0.5;
    const d = `M${f(x)} ${f(y + h)} V${f(top)} Q${f(x)} ${f(y)} ${f(x + w / 2)} ${f(y)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(top)} V${f(y + h)} Z`;
    o += `<path d="${d}" fill="${g}" stroke="${fr}" stroke-width="${f(5 * s)}" stroke-linejoin="round"></path>`;
    o += `<path d="M${f(x + w / 2)} ${f(y + 3)} V${f(y + h)} M${f(x + 2)} ${f(top + (h - (top - y)) * 0.3)} H${f(x + w - 2)}" stroke="${fr}" stroke-width="${f(2.5 * s)}"></path>`;
    o += `<path d="M${f(x + w * 0.2)} ${f(top)} Q${f(x + w * 0.22)} ${f(y + w * 0.25)} ${f(x + w * 0.45)} ${f(y + w * 0.15)}" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="${f(2 * s)}" fill="none"></path>`;
    o += `<path d="${d}" fill="none" ${OUT(haze, 2.4 * s)}></path>`;
    // flower box
    if (h > 30 * s && rnd() > 0.35) {
      o += `<path d="${soft(
        [
          [x - 4 * s, y + h],
          [x + w + 4 * s, y + h],
          [x + w + 2 * s, y + h + 9 * s],
          [x - 2 * s, y + h + 9 * s],
        ],
        2,
        0.4,
      )}" fill="${hz('#7A4A28', haze)}" ${OUT(haze, 2 * s)}></path>`;
      for (let i = 0; i < 5; i++) {
        const c = ['#D9534F', '#F2B84B', '#E77FA8', '#F6E7C4'][i % 4];
        o += `<circle cx="${f(x + (w * (i + 0.5)) / 5)}" cy="${f(y + h - 2 * s + R(-2, 2))}" r="${f(3.6 * s)}" fill="${hz(c, haze)}" stroke="${hz(INK, haze)}" stroke-width="${f(1.2 * s)}"></circle>`;
      }
    }
    return o;
  }

  // A timber-framed townhouse: gable to the front, one side wall receding.
  function house(o) {
    const {
      x,
      base,
      w,
      h,
      side = 'right',
      sw = w * 0.42,
      roof = '#B8432F',
      wall = '#F1DFB8',
      timber = '#5A3820',
      haze = 0,
      s = 1,
      roofH = w * 0.62,
      chimney = true,
      shutters = null,
      floors = 2,
      door = true,
      sign = null,
    } = o;
    const H = 470,
      conv = (y) => y + (H - y) * 0.13;
    const top = base - h,
      apex = [x + w / 2, top - roofH],
      ov = 12 * s;
    const sx = side === 'right' ? x + w : x,
      dir = side === 'right' ? 1 : -1,
      ex = sx + dir * sw;
    const sunlit = side === 'left';
    const W = hz(wall, haze),
      RF = hz(roof, haze),
      TB = hz(timber, haze);
    let shadow = castShadow(Math.min(x, ex), Math.max(x + w, ex), base, h * 0.5, haze);
    let b = '';
    const clip = id('c');
    // side wall
    const sideP = [
      [sx, top],
      [ex, conv(top)],
      [ex, conv(base)],
      [sx, base],
    ];
    const sideFill = lin(
      sunlit
        ? [
            [0, lit(W, 0.15)],
            [1, dk(W, 0.08)],
          ]
        : [
            [0, dk(W, 0.28)],
            [1, dk(W, 0.45)],
          ],
      side === 'right' ? 0 : 1,
      0,
      side === 'right' ? 1 : 0,
      0,
    );
    b += `<path d="${soft(sideP, 3 * s, 0.6)}" fill="${sideFill}"></path>`;
    // side roof plane
    const eaveF = [sx + dir * ov, top + ov * 0.5];
    const apexB = [apex[0] + dir * sw, conv(apex[1])],
      eaveB = [eaveF[0] + dir * sw, conv(eaveF[1])];
    const roofFill = lin(
      sunlit
        ? [
            [0, lit(RF, 0.35)],
            [1, RF],
          ]
        : [
            [0, lit(RF, 0.05)],
            [1, dk(RF, 0.35)],
          ],
      0,
      0,
      0,
      1,
    );
    b += `<path d="${soft([apex, apexB, eaveB, eaveF], 4 * s, 0.8)}" fill="${roofFill}" ${OUT(haze, 3 * s)}></path>`;
    // tile rows (scalloped), following the slope
    const rows = Math.max(3, Math.round(roofH / (11 * s)));
    let tl = '';
    for (let r = 1; r < rows; r++) {
      const t = r / rows,
        a = [apex[0] + (eaveF[0] - apex[0]) * t, apex[1] + (eaveF[1] - apex[1]) * t],
        c = [apexB[0] + (eaveB[0] - apexB[0]) * t, apexB[1] + (eaveB[1] - apexB[1]) * t];
      const n = Math.max(3, Math.round(sw / (14 * s)));
      let d = `M${f(a[0])} ${f(a[1])}`;
      for (let k = 1; k <= n; k++) {
        const p = [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n];
        const m = [
          a[0] + ((c[0] - a[0]) * (k - 0.5)) / n,
          a[1] + ((c[1] - a[1]) * (k - 0.5)) / n + 4 * s,
        ];
        d += ` Q${f(m[0])} ${f(m[1])} ${f(p[0])} ${f(p[1])}`;
      }
      tl += `<path d="${d}" fill="none" stroke="${dk(RF, 0.45)}" stroke-width="${f(1.6 * s)}" opacity=".7"></path>`;
    }
    b += tl;
    // chimney on the roof plane
    if (chimney) {
      const cx = apex[0] + dir * sw * 0.55,
        cy = conv(apex[1]) + roofH * 0.32;
      const cf = lin(
        [
          [0, hz('#B7A48C', haze)],
          [1, hz('#76665A', haze)],
        ],
        0,
        0,
        1,
        0,
      );
      b += `<path d="${soft(
        [
          [cx - 9 * s, cy + 10 * s],
          [cx - 9 * s, cy - 26 * s],
          [cx + 9 * s, cy - 26 * s],
          [cx + 9 * s, cy + 2 * s],
        ],
        2,
        0.4,
      )}" fill="${cf}" ${OUT(haze, 2.6 * s)}></path>`;
      b += `<path d="${soft(
        [
          [cx - 12 * s, cy - 26 * s],
          [cx + 12 * s, cy - 26 * s],
          [cx + 12 * s, cy - 32 * s],
          [cx - 12 * s, cy - 32 * s],
        ],
        2,
        0.3,
      )}" fill="${hz('#6B5C50', haze)}" ${OUT(haze, 2.4 * s)}></path>`;
      if (!haze || haze < 0.3)
        // Smoke scales from its top-left corner, as it did inside the SVG.
        b +=
          anim(
            'wm-smoke',
            { x: cx - 9 * s, y: cy - 53 * s, w: 18 * s, h: 18 * s },
            `<circle cx="${f(cx)}" cy="${f(cy - 44 * s)}" r="${f(9 * s)}" fill="#F4EEE6" filter="url(#fx-b2)"></circle>`,
            { x: cx - 9 * s, y: cy - 53 * s },
          ) +
          anim(
            'wm-smoke2',
            { x: cx + 4 - 7 * s, y: cy - 57 * s, w: 14 * s, h: 14 * s },
            `<circle cx="${f(cx + 4)}" cy="${f(cy - 50 * s)}" r="${f(7 * s)}" fill="#F4EEE6" filter="url(#fx-b2)"></circle>`,
            { x: cx + 4 - 7 * s, y: cy - 57 * s },
          );
    }
    // front face incl. gable
    const frontP = [[x, base], [x, top], apex, [x + w, top], [x + w, base]];
    defs.push(`<clipPath id="${clip}"><path d="${soft(frontP, 2 * s, 0)}"></path></clipPath>`);
    const frontFill = lin(
      [
        [0, lit(W, 0.25)],
        [0.6, W],
        [1, dk(W, 0.12)],
      ],
      0,
      0,
      0.35,
      1,
    );
    b += `<path d="${soft(frontP, 2 * s, 0.6)}" fill="${frontFill}"></path>`;
    b += `<g clip-path="url(#${clip})">`;
    b += `<rect x="${f(x)}" y="${f(apex[1])}" width="${f(w)}" height="${f(base - apex[1])}" filter="url(#fx-plaster)" opacity="${f(0.55 * (1 - haze))}"></rect>`;
    // timbers
    const fl = top + h * (floors === 2 ? 0.46 : 0.99);
    const beam = (x1, y1, x2, y2, wd) => {
      const m = [(x1 + x2) / 2 + R(-1.5, 1.5), (y1 + y2) / 2 + R(-1.5, 1.5)];
      return `<path d="M${f(x1)} ${f(y1)} Q${f(m[0])} ${f(m[1])} ${f(x2)} ${f(y2)}" stroke="${TB}" stroke-width="${f(wd)}" stroke-linecap="round" fill="none"></path><path d="M${f(x1)} ${f(y1 - wd * 0.3)} Q${f(m[0])} ${f(m[1] - wd * 0.3)} ${f(x2)} ${f(y2 - wd * 0.3)}" stroke="${lit(TB, 0.35)}" stroke-width="${f(wd * 0.25)}" stroke-linecap="round" fill="none" opacity=".7"></path>`;
    };
    const bw = 8 * s;
    b += beam(x + 2, top + 4, x + w - 2, top + 4, bw);
    if (floors === 2) b += beam(x, fl, x + w, fl, bw);
    b +=
      beam(x + bw / 2, top, x + bw / 2, base, bw) +
      beam(x + w - bw / 2, top, x + w - bw / 2, base, bw);
    b += beam(apex[0], apex[1] + 6, apex[0], top, bw * 0.8);
    b +=
      beam(x + w * 0.18, top, apex[0], apex[1] + roofH * 0.45, bw * 0.7) +
      beam(x + w * 0.82, top, apex[0], apex[1] + roofH * 0.45, bw * 0.7);
    if (floors === 2) {
      b +=
        beam(x + bw, top + 6, x + w * 0.3, fl, bw * 0.7) +
        beam(x + w - bw, top + 6, x + w * 0.7, fl, bw * 0.7);
    }
    // AO / bounce
    b += `<path d="${soft(frontP, 2 * s, 0)}" fill="${AO}"></path>`;
    b += `</g>`;
    b += `<path d="${soft(sideP, 3 * s, 0)}" fill="${AO}"></path>`;
    // gable round window
    const gw = w * 0.16;
    b += `<circle cx="${f(apex[0])}" cy="${f(top - roofH * 0.38)}" r="${f(gw / 2)}" fill="${lin([
      [0, hz('#3A4A66', haze)],
      [1, hz('#FFB85A', haze)],
    ])}" stroke="${TB}" stroke-width="${f(4 * s)}"></circle><circle cx="${f(apex[0])}" cy="${f(top - roofH * 0.38)}" r="${f(gw / 2 + 2 * s)}" fill="none" ${OUT(haze, 2 * s)}></circle>`;
    // windows + door
    const ww = w * 0.17,
      wh = h * 0.2;
    if (floors === 2) {
      b += windowEl(x + w * 0.2, top + h * 0.12, ww, wh, s, haze, shutters);
      b += windowEl(x + w * 0.63, top + h * 0.12, ww, wh, s, haze, shutters);
    }
    if (door) {
      const dw = w * 0.24,
        dh = h * 0.38,
        dx = x + w * 0.5 - dw / 2;
      const df = lin(
        [
          [0, hz('#8A5530', haze)],
          [1, hz('#4E2C16', haze)],
        ],
        0,
        0,
        1,
        1,
      );
      const dd = `M${f(dx)} ${f(base)} V${f(base - dh + dw / 2)} Q${f(dx)} ${f(base - dh)} ${f(dx + dw / 2)} ${f(base - dh)} Q${f(dx + dw)} ${f(base - dh)} ${f(dx + dw)} ${f(base - dh + dw / 2)} V${f(base)} Z`;
      b += `<path d="${dd}" fill="${df}" ${OUT(haze, 3 * s)}></path>`;
      b += `<path d="M${f(dx + dw * 0.33)} ${f(base - dh + 6 * s)} V${f(base - 2)} M${f(dx + dw * 0.66)} ${f(base - dh + 6 * s)} V${f(base - 2)}" stroke="${dk(hz('#4E2C16', haze), 0.3)}" stroke-width="${f(2 * s)}"></path>`;
      b += `<circle cx="${f(dx + dw * 0.8)}" cy="${f(base - dh * 0.45)}" r="${f(2.6 * s)}" fill="${hz('#E8A93A', haze)}"></circle>`;
      b += windowEl(x + w * 0.08, base - h * 0.38, ww * 0.9, wh * 0.9, s, haze, null);
      b += windowEl(x + w * 0.76, base - h * 0.38, ww * 0.9, wh * 0.9, s, haze, null);
    }
    // outlines
    b += `<path d="${soft(frontP, 2 * s, 0)}" fill="none" ${OUT(haze, 3.2 * s)}></path><path d="${soft(sideP, 3 * s, 0)}" fill="none" ${OUT(haze, 3.2 * s)}></path>`;
    // front barge boards (thick roof edge) with highlight
    const bb = `M${f(x - ov)} ${f(top + ov * 0.5)} L${f(apex[0])} ${f(apex[1] - 4 * s)} L${f(x + w + ov)} ${f(top + ov * 0.5)}`;
    b += `<path d="${bb}" fill="none" stroke="${hz(INK, haze * 0.8)}" stroke-width="${f(14 * s)}" stroke-linejoin="round" stroke-linecap="round"></path>`;
    b += `<path d="${bb}" fill="none" stroke="${dk(RF, 0.1)}" stroke-width="${f(8 * s)}" stroke-linejoin="round" stroke-linecap="round"></path>`;
    b += `<path d="M${f(x - ov + 3)} ${f(top + ov * 0.5 - 3 * s)} L${f(apex[0])} ${f(apex[1] - 7 * s)}" fill="none" stroke="${lit(RF, 0.5)}" stroke-width="${f(2.4 * s)}" stroke-linecap="round" opacity=".9"></path>`;
    // eave shadow on front wall
    b += `<path d="M${f(x)} ${f(top + 2)} H${f(x + w)}" stroke="#2A1608" stroke-width="${f(10 * s)}" opacity=".22" filter="url(#fx-b2)"></path>`;
    if (sign) b += sign;
    return { shadow, body: b, apex, top };
  }

  function tree(x, base, s, haze = 0, kind = 'round') {
    let o = '';
    const leaf = hz('#5E8A3A', haze),
      dark = hz('#2F5226', haze);
    o += castShadow(x - 20 * s, x + 20 * s, base, 60 * s, haze, 0.25);
    o += `<path d="M${f(x - 5 * s)} ${f(base)} Q${f(x - 2 * s)} ${f(base - 40 * s)} ${f(x)} ${f(base - 70 * s)} L${f(x + 5 * s)} ${f(base - 70 * s)} Q${f(x + 4 * s)} ${f(base - 30 * s)} ${f(x + 7 * s)} ${f(base)} Z" fill="${lin(
      [
        [0, hz('#8A6240', haze)],
        [1, hz('#4A2E1A', haze)],
      ],
      0,
      0,
      1,
      0,
    )}" ${OUT(haze, 2.4 * s)}></path>`;
    if (kind === 'cypress') {
      const g = lin(
        [
          [0, lit(leaf, 0.3)],
          [0.5, leaf],
          [1, dark],
        ],
        0,
        0,
        1,
        0,
      );
      o += `<path d="${blob(x, base - 110 * s, 26 * s, 90 * s, 12, 0.08)}" fill="${g}" ${OUT(haze, 2.6 * s)}></path>`;
      for (let i = 0; i < 6; i++)
        o += `<path d="M${f(x - 14 * s + R(-4, 4))} ${f(base - (50 + i * 22) * s)} q${f(10 * s)} ${f(-6 * s)} ${f(18 * s)} 0" stroke="${dk(leaf, 0.4)}" stroke-width="${f(1.6 * s)}" fill="none" opacity=".6"></path>`;
      return o;
    }
    const g = rad(
      [
        [0, lit(leaf, 0.45)],
        [0.55, leaf],
        [1, dark],
      ],
      0.35,
      0.3,
      0.75,
    );
    const clumps = [
      [0, -96, 46],
      [-34, -78, 34],
      [34, -80, 36],
      [-12, -128, 34],
      [22, -118, 30],
    ];
    o += `<path d="${blob(x, base - 88 * s, 64 * s, 50 * s, 10, 0.1)}" fill="${dark}" ${OUT(haze, 2.6 * s)}></path>`;
    for (const [dx, dy, r] of clumps)
      o += `<path d="${blob(x + dx * s, base + dy * s, r * s, r * 0.85 * s, 8, 0.12)}" fill="${g}"></path>`;
    return o;
  }

  function cloud(cx, cy, w) {
    const g = rad(
      [
        [0, '#FFFDF6'],
        [0.6, '#FBEFDF'],
        [1, '#D8C3CF'],
      ],
      0.4,
      0.25,
      0.75,
    );
    let o = `<g>`;
    o += `<path d="${smooth([
      [cx - w * 0.5, cy + 6],
      [cx - w * 0.46, cy - 8],
      [cx + w * 0.48, cy - 6],
      [cx + w * 0.52, cy + 6],
    ])}" fill="#D9C4D0"></path>`;
    const n = Math.round(w / 40);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n,
        r = w * (0.11 + 0.1 * Math.sin(t * Math.PI)) * R(0.85, 1.15);
      o += `<circle cx="${f(cx - w * 0.45 + t * w * 0.9)}" cy="${f(cy - r * 0.55)}" r="${f(r)}" fill="${g}"></circle>`;
    }
    o += `<path d="M${f(cx - w * 0.5)} ${f(cy + 5)} H${f(cx + w * 0.52)}" stroke="#C7AFC2" stroke-width="6" stroke-linecap="round" opacity=".7"></path></g>`;
    return o;
  }

  // ---------- LAYER: sky, hills ----------
  let sky = '';
  sky += `<rect width="1920" height="1080" fill="${lin([
    [0, '#3F78BC'],
    [0.2, '#79A8D8'],
    [0.36, '#C9D6DE'],
    [0.44, '#F6DDB0'],
    [0.52, '#F7C988'],
    [1, '#F2B978'],
  ])}"></rect>`;
  sky += `<circle cx="420" cy="230" r="440" fill="${rad([
    [0, '#FFF8DE', 0.95],
    [0.25, '#FFE8B0', 0.55],
    [1, '#FFD890', 0],
  ])}"></circle>`;
  sky += `<circle cx="420" cy="230" r="62" fill="${rad([
    [0, '#FFFFF4'],
    [0.7, '#FFF3C8'],
    [1, '#FFE6A0', 0],
  ])}"></circle>`;
  sky += anim(
    'wm-drift',
    { x: 0, y: 0, w: 1920, h: 320 },
    `${cloud(150, 120, 300)}${cloud(1240, 120, 420)}${cloud(820, 240, 230)}${cloud(1720, 250, 260)}`,
  );
  // birds
  for (const [bx, by, bs] of [
    [520, 190, 1],
    [560, 210, 0.8],
    [600, 180, 0.7],
  ])
    sky += `<path d="M${bx} ${by} q${8 * bs} ${-8 * bs} ${16 * bs} 0 q${8 * bs} ${-8 * bs} ${16 * bs} 0" stroke="#4A3A4E" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"></path>`;
  const ridge = (y0, amp, step, fill, stroke) => {
    const p = [[-40, 700]];
    for (let x = -40; x <= 1960; x += step)
      p.push([x, y0 + Math.sin(x / 210) * amp + R(-amp * 0.5, amp * 0.5)]);
    p.push([1960, 700]);
    return `<path d="${smooth(p, true, 0.8)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="2"` : ''}></path>`;
  };
  sky += ridge(
    372,
    30,
    90,
    lin([
      [0, '#9BA5C9'],
      [1, '#E6D2C6'],
    ]),
  );
  sky += ridge(
    418,
    22,
    70,
    lin([
      [0, '#A6A895'],
      [1, '#E9D3B6'],
    ]),
    '#968F8A',
  );
  // distant olive groves on the hills
  for (let i = 0; i < 46; i++) {
    const x = R(0, 1920),
      y = 430 + Math.sin(x / 210) * 20 + R(0, 28);
    sky += `<path d="${blob(x, y, R(9, 16), R(6, 9), 7, 0.15)}" fill="${hz('#6E8452', 0.55)}"></path>`;
  }
  sky += ridge(
    462,
    14,
    60,
    lin([
      [0, '#B4AD80'],
      [1, '#E6CFA4'],
    ]),
    '#9C8E6E',
  );
  // arena (locked, far, hazy)
  let arena = '';
  {
    const cx = 330,
      by = 470,
      rx = 240,
      h = 175,
      hzv = 0.42;
    const wallF = lin(
      [
        [0, hz('#E7D2AE', hzv)],
        [0.35, hz('#F2E3C6', hzv)],
        [1, hz('#A68F72', hzv)],
      ],
      0,
      0,
      1,
      0,
    );
    arena += `<path d="M${cx - rx} ${by} V${by - h} A${rx} 40 0 0 1 ${cx + rx} ${by - h} V${by} A${rx} 36 0 0 1 ${cx - rx} ${by} Z" fill="${wallF}" ${OUT(hzv, 2.4)}></path>`;
    arena += `<path d="M${cx - rx} ${by - h} A${rx} 40 0 0 1 ${cx + rx} ${by - h} A${rx} 30 0 0 0 ${cx - rx} ${by - h} Z" fill="${hz('#B49A7A', hzv)}" ${OUT(hzv, 2)}></path>`;
    for (let tier = 0; tier < 3; tier++) {
      const y = by - h + 22 + tier * 38,
        n = 13;
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n) * Math.PI,
          xx = cx - Math.cos(a) * rx * 0.94,
          ww = Math.sin(a) * 20 + 4,
          yy = y + Math.sin(a) * 16;
        arena += `<path d="M${f(xx - ww / 2)} ${f(yy + 24)} V${f(yy + 8)} Q${f(xx - ww / 2)} ${f(yy)} ${f(xx)} ${f(yy)} Q${f(xx + ww / 2)} ${f(yy)} ${f(xx + ww / 2)} ${f(yy + 8)} V${f(yy + 24)} Z" fill="${hz('#7C6052', hzv)}"></path>`;
      }
      arena += `<path d="M${cx - rx} ${y - 6} A${rx} 40 0 0 0 ${cx + rx} ${y - 6}" stroke="${hz('#A68F72', hzv)}" stroke-width="2" fill="none"></path>`;
    }
  }
  // haze band (smooth, no hard edges)
  const hazeBand = `<rect x="0" y="330" width="1920" height="300" fill="${lin([
    [0, HAZE, 0],
    [0.45, HAZE, 0.55],
    [0.75, HAZE, 0.35],
    [1, HAZE, 0],
  ])}"></rect>`;

  // ---------- back ring houses + trees ----------
  const back = { shadow: '', body: '' };
  const roofs = ['#B8432F', '#3E7D8C', '#7E5A9A', '#5E8A3A', '#C7792F', '#A23A4A'];
  const walls = ['#F1DFB8', '#EED2A6', '#F4E6CC', '#E8CDA0'];
  let bt = '';
  for (const [x, s, k] of [
    [30, 0.55, 'cypress'],
    [420, 0.6, 'round'],
    [930, 0.55, 'cypress'],
    [1560, 0.6, 'round'],
    [1860, 0.55, 'cypress'],
  ])
    bt += tree(x, 552, s, 0.35, k);
  const backList = [
    [-30, 556, 0.5, 'right'],
    [120, 552, 0.46, 'right'],
    [270, 556, 0.5, 'right'],
    [440, 550, 0.44, 'right'],
    [820, 548, 0.42, 'left'],
    [1530, 552, 0.46, 'left'],
    [1680, 556, 0.5, 'left'],
    [1820, 552, 0.48, 'left'],
  ];
  backList.forEach(([x, base, s, side], i) => {
    const hs = house({
      x,
      base,
      w: 210 * s,
      h: 190 * s,
      side,
      s,
      haze: 0.38,
      roof: roofs[i % roofs.length],
      wall: walls[i % walls.length],
      shutters: null,
      chimney: i % 2 === 0,
    });
    back.shadow += hs.shadow;
    back.body += hs.body;
  });

  // ---------- ground: cobbles + dirt ----------
  let ground = '';
  ground += `<path d="M-20 520 C400 540 1500 540 1940 520 V1100 H-20 Z" fill="${lin([
    [0, '#C9A37A'],
    [0.4, '#A7805C'],
    [1, '#6E4C34'],
  ])}"></path>`;
  const stoneG = ['#D8BE98', '#CBAE88', '#E2CBA6', '#BFA07C', '#D3B48C'].map((c) =>
    lin([
      [0, lit(c, 0.35)],
      [0.55, c],
      [1, dk(c, 0.3)],
    ]),
  );
  const stoneDark = lin([
    [0, '#B49478'],
    [0.6, '#94755A'],
    [1, '#5E4634'],
  ]);
  const IN = { cx: 1010, cy: 930, rx: 170, ry: 52 };
  let y = 548,
    row = 0;
  while (y < 1110) {
    const rh = 5 + (y - 540) * 0.062,
      haze = Math.max(0, 0.45 - (y - 548) / 300);
    let x = -30 + (row % 2) * rh;
    while (x < 1950) {
      const w = rh * R(1.2, 2.7);
      const cx = x + w / 2 + R(-1, 1) * rh * 0.06,
        cy = y + rh / 2 + R(-1, 1) * rh * 0.08;
      const dIn = ((cx - IN.cx) / (IN.rx + 14)) ** 2 + ((cy - IN.cy) / (IN.ry + 6)) ** 2;
      // skip some stones in the worn centre so dirt shows through (blending)
      const worn = Math.exp(-(((cx - 980) / 520) ** 2) - ((cy - 800) / 150) ** 2);
      if (dIn > 1 && rnd() > worn * 0.7) {
        let g = stoneG[Math.floor(rnd() * stoneG.length)];
        if (rnd() < 0.12) g = stoneDark;
        ground += `<path d="${blob(cx, cy, w * R(0.4, 0.46), rh * R(0.36, 0.44), 8, 0.14)}" fill="${g}"${haze > 0.02 ? ` opacity="${f(1 - haze)}"` : ''}></path>`;
      }
      x += w;
    }
    y += rh * 0.92;
    row++;
  }
  // dirt wash over the centre (blends stones into earth)
  ground += `<ellipse cx="980" cy="790" rx="620" ry="170" fill="${rad([
    [0, '#D3A877', 0.85],
    [0.6, '#C99C6C', 0.45],
    [1, '#C99C6C', 0],
  ])}"></ellipse>`;
  // warm sun pool and far haze on the ground
  ground += `<ellipse cx="760" cy="760" rx="900" ry="300" fill="${rad([
    [0, '#FFE3A8', 0.35],
    [1, '#FFE3A8', 0],
  ])}"></ellipse>`;
  ground += `<rect x="0" y="520" width="1920" height="130" fill="${lin([
    [0, HAZE, 0.6],
    [1, HAZE, 0],
  ])}"></rect>`;
  // waymark inlay: brass compass in the plaza
  {
    const { cx, cy, rx, ry } = IN;
    ground += `<ellipse cx="${cx}" cy="${cy + 4}" rx="${rx + 8}" ry="${ry + 5}" fill="#2A1608" opacity=".35" filter="url(#fx-b2)"></ellipse>`;
    ground += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${lin([
      [0, '#E9D3AE'],
      [1, '#B79470'],
    ])}" ${OUT(0, 3)}></ellipse>`;
    ground += `<ellipse cx="${cx}" cy="${cy}" rx="${rx - 14}" ry="${ry - 5}" fill="none" stroke="${lin(
      [
        [0, '#FFE39A'],
        [0.5, '#E8A93A'],
        [1, '#8A5A20'],
      ],
      0,
      0,
      1,
      0,
    )}" stroke-width="7"></ellipse>`;
    let star = '';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2,
        L = i % 2 ? 0.55 : 1,
        a1 = a - 0.22,
        a2 = a + 0.22;
      star += `<path d="M${cx} ${cy} L${f(cx + Math.cos(a1) * (rx - 50) * 0.32)} ${f(cy + Math.sin(a1) * (ry - 14) * 0.32)} L${f(cx + Math.cos(a) * (rx - 24) * L)} ${f(cy + Math.sin(a) * (ry - 10) * L)} L${f(cx + Math.cos(a2) * (rx - 50) * 0.32)} ${f(cy + Math.sin(a2) * (ry - 14) * 0.32)} Z" fill="${i % 2 ? '#C7882E' : i < 4 ? '#FFD36B' : '#E8A93A'}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"></path>`;
    }
    ground +=
      star +
      `<ellipse cx="${cx}" cy="${cy}" rx="10" ry="4" fill="#2E8FA3" stroke="${INK}" stroke-width="2"></ellipse>`;
  }
  // grass tufts along building bases and edges
  function tuft(x, y, s) {
    const g = lin([
      [0, '#9DBE5A'],
      [1, '#4B7A2E'],
    ]);
    let d = '';
    for (let i = 0; i < 6; i++) {
      const a = -1.2 + i * 0.45 + R(-0.15, 0.15),
        L = R(14, 24) * s;
      d += `M${f(x + (i - 3) * 3 * s)} ${f(y)} Q${f(x + (i - 3) * 3 * s + Math.cos(a) * L * 0.3)} ${f(y - L * 0.6)} ${f(x + (i - 3) * 3 * s + Math.sin(a) * L * 0.6)} ${f(y - L)} `;
    }
    return `<path d="${d}" stroke="${g}" stroke-width="${f(3 * s)}" fill="none" stroke-linecap="round"></path>`;
  }
  let tufts = '';
  for (const [x, y, s] of [
    [140, 700, 0.8],
    [480, 690, 0.7],
    [560, 710, 0.9],
    [870, 700, 0.8],
    [1180, 700, 0.7],
    [1520, 700, 0.9],
    [40, 990, 1.4],
    [660, 980, 1.2],
    [1380, 990, 1.3],
    [1880, 1000, 1.4],
    [300, 1040, 1.6],
    [1120, 1050, 1.2],
  ])
    tufts += tuft(x, y, s);

  // ---------- side ring houses (mid) ----------
  const side = { shadow: '', body: '' };
  [
    [-60, 690, 0.82, 'right', '#3E7D8C', '#F1DFB8', '#2E6F5E'],
    [1700, 690, 0.84, 'left', '#7E5A9A', '#EED2A6', '#C8553D'],
  ].forEach(([x, base, s, sd, rf, wl, sh]) => {
    const hs = house({
      x,
      base,
      w: 240 * s,
      h: 250 * s,
      side: sd,
      s,
      haze: 0.12,
      roof: rf,
      wall: wl,
      shutters: sh,
    });
    side.shadow += hs.shadow;
    side.body += hs.body;
  });
  // inn sign + banner on the side houses
  side.body +=
    `<path d="M240 520 H300" stroke="${INK}" stroke-width="6" stroke-linecap="round"></path>` +
    anim(
      'wm-sway',
      { x: 258, y: 518, w: 44, h: 46 },
      `<path d="M268 522 V530 M292 522 V530" stroke="${INK}" stroke-width="2"></path><path d="${soft(
        [
          [262, 530],
          [298, 530],
          [298, 560],
          [262, 560],
        ],
        4,
        0.5,
      )}" fill="${lin([
        [0, '#9C6A3E'],
        [1, '#5A3820'],
      ])}" ${OUT(0, 2.6)}></path><path d="M272 538 h16 v10 q-8 8 -16 0 Z" fill="#E8A93A" stroke="${INK}" stroke-width="1.6"></path>`,
      { x: 280, y: 521 },
    );

  // ---------- SIGNAL TOWER ----------
  let tower = '',
    towerShadow = '';
  {
    const cx = 704,
      base = 690,
      top = 300,
      rb = 82,
      rt = 68;
    towerShadow += castShadow(cx - rb, cx + rb, base, 300, 0, 0.3);
    const cyl = lin(
      [
        [0, '#8E7D69'],
        [0.18, '#E9D9BC'],
        [0.38, '#D2BF9F'],
        [0.72, '#8F7C66'],
        [1, '#5C4C42'],
      ],
      0,
      0,
      1,
      0,
    );
    const body = `M${cx - rb} ${base} Q${cx - rb + 4} ${(base + top) / 2} ${cx - rt} ${top} L${cx + rt} ${top} Q${cx + rb - 4} ${(base + top) / 2} ${cx + rb} ${base} Q${cx} ${base + 16} ${cx - rb} ${base} Z`;
    const tc = id('c');
    defs.push(`<clipPath id="${tc}"><path d="${body}"></path></clipPath>`);
    tower += `<path d="${body}" fill="${cyl}"></path><g clip-path="url(#${tc})">`;
    tower += `<rect x="${cx - rb}" y="${top}" width="${rb * 2}" height="${base - top + 20}" filter="url(#fx-plaster)" opacity=".5"></rect>`;
    // stone courses following the curvature
    let row = 0;
    for (let yy = top + 18; yy < base + 10; yy += 21, row++) {
      const r = rt + ((rb - rt) * (yy - top)) / (base - top);
      tower += `<path d="M${f(cx - r)} ${f(yy)} Q${cx} ${f(yy + 9)} ${f(cx + r)} ${f(yy)}" stroke="#6E5C4C" stroke-width="2" fill="none" opacity=".55"></path>`;
      for (let k = 0; k < 7; k++) {
        const a = ((k + (row % 2) * 0.5) / 7) * Math.PI;
        const xx = cx - Math.cos(a) * r;
        if (Math.sin(a) < 0.2) continue;
        tower += `<path d="M${f(xx)} ${f(yy - 20 + Math.sin(a) * 9)} v18" stroke="#6E5C4C" stroke-width="1.6" opacity=".45"></path>`;
        if (rnd() < 0.22)
          tower += `<path d="${blob(xx + 8, yy - 10 + Math.sin(a) * 8, 9 * Math.sin(a), 7, 6, 0.1)}" fill="${rnd() < 0.5 ? '#F2E3C6' : '#7E6A58'}" opacity=".35"></path>`;
      }
    }
    tower += `<rect x="${cx - rb}" y="${top}" width="${rb * 2}" height="${base - top + 20}" fill="${AO}"></rect>`;
    // ivy creeping up the shaded side
    for (let i = 0; i < 26; i++) {
      const yy = base - R(0, 180),
        xx = cx + rb - 6 - R(0, 34) * (1 - (base - yy) / 260);
      tower += `<path d="${blob(xx, yy, R(6, 10), R(5, 8), 6, 0.2)}" fill="${rnd() < 0.5 ? '#4E7A32' : '#6E9A42'}" stroke="#24331A" stroke-width="1.2"></path>`;
    }
    tower += `</g><path d="${body}" fill="none" ${OUT(0, 4)}></path>`;
    // windows (glowing slits) + door
    for (const wy of [400, 520])
      tower += `<path d="M${cx - 12} ${wy + 40} V${wy + 12} Q${cx - 12} ${wy} ${cx} ${wy} Q${cx + 12} ${wy} ${cx + 12} ${wy + 12} V${wy + 40} Z" fill="${lin(
        [
          [0, '#FFF2C0'],
          [1, '#E39A2E'],
        ],
      )}" ${OUT(0, 3)}></path><path d="M${cx - 18} ${wy + 42} H${cx + 18}" stroke="${INK}" stroke-width="5" stroke-linecap="round"></path><path d="M${cx - 18} ${wy + 42} H${cx + 18}" stroke="#B9A584" stroke-width="2.4" stroke-linecap="round"></path>`;
    tower += `<path d="M${cx - 30} ${base + 6} V${base - 60} Q${cx - 30} ${base - 92} ${cx} ${base - 92} Q${cx + 30} ${base - 92} ${cx + 30} ${base - 60} V${base + 6} Z" fill="${lin(
      [
        [0, '#9A6236'],
        [1, '#4A2A14'],
      ],
      0,
      0,
      1,
      1,
    )}" ${OUT(0, 4)}></path>`;
    tower += `<path d="M${cx - 10} ${base - 86} V${base + 4} M${cx + 10} ${base - 86} V${base + 4}" stroke="#3A2010" stroke-width="2.4"></path><circle cx="${cx + 18}" cy="${base - 36}" r="3.5" fill="#E8A93A" stroke="${INK}" stroke-width="1.5"></circle>`;
    tower += `<path d="M${cx - 38} ${base - 60} Q${cx - 38} ${base - 104} ${cx} ${base - 104} Q${cx + 38} ${base - 104} ${cx + 38} ${base - 60}" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"></path><path d="M${cx - 38} ${base - 60} Q${cx - 38} ${base - 104} ${cx} ${base - 104} Q${cx + 38} ${base - 104} ${cx + 38} ${base - 60}" fill="none" stroke="#C9B392" stroke-width="7" stroke-linecap="round"></path>`;
    tower += `<path d="${soft(
      [
        [cx - 46, base + 4],
        [cx + 46, base + 4],
        [cx + 54, base + 18],
        [cx - 54, base + 18],
      ],
      4,
      0.6,
    )}" fill="${lin([
      [0, '#C9B89C'],
      [1, '#8C7A64'],
    ])}" ${OUT(0, 3)}></path>`;
    // corbelled gallery
    const gy = top - 4;
    tower += `<path d="M${cx - rt} ${gy + 26} Q${cx} ${gy + 44} ${cx + rt} ${gy + 26} L${cx + rt + 18} ${gy} Q${cx} ${gy + 20} ${cx - rt - 18} ${gy} Z" fill="${lin(
      [
        [0, '#BBA88A'],
        [1, '#6B5A4A'],
      ],
      0,
      0,
      1,
      0,
    )}" ${OUT(0, 3.5)}></path>`;
    for (let k = -3; k <= 3; k++)
      tower += `<path d="M${cx + k * 20} ${gy + 14 + Math.cos(k / 3.4) * 14} v14" stroke="${INK}" stroke-width="2.4"></path>`;
    tower += `<ellipse cx="${cx}" cy="${gy}" rx="${rt + 18}" ry="14" fill="${lin(
      [
        [0, '#EADBC0'],
        [1, '#A8977E'],
      ],
      0,
      0,
      1,
      0,
    )}" ${OUT(0, 3.5)}></ellipse>`;
    // halo
    tower += anim(
      'wm-pulse',
      { x: cx - 150, y: gy - 212, w: 300, h: 300 },
      `<circle cx="${cx}" cy="${gy - 62}" r="150" fill="${rad([
        [0, '#FFF3C4', 0.9],
        [0.35, '#FFD36B', 0.45],
        [1, '#FFD36B', 0],
      ])}"></circle>`,
    );
    // lantern room
    tower += `<path d="${soft(
      [
        [cx - 46, gy - 4],
        [cx - 40, gy - 104],
        [cx + 40, gy - 104],
        [cx + 46, gy - 4],
      ],
      6,
      0.4,
    )}" fill="${rad(
      [
        [0, '#FFFDE8'],
        [0.45, '#FFE08A'],
        [1, '#E39A2E'],
      ],
      0.4,
      0.5,
      0.7,
    )}" ${OUT(0, 4)}></path>`;
    tower += anim(
      'wm-flicker',
      { x: cx - 26, y: gy - 84, w: 52, h: 60 },
      `<path d="${blob(cx, gy - 54, 20, 26, 8, 0.1)}" fill="#FFFFFF" filter="url(#fx-b2)"></path>`,
    );
    for (const k of [-24, 0, 24])
      tower += `<path d="M${cx + k} ${gy - 102} V${gy - 6}" stroke="${INK}" stroke-width="5"></path><path d="M${cx + k - 1.5} ${gy - 100} V${gy - 8}" stroke="#E8A93A" stroke-width="1.6"></path>`;
    tower += `<path d="M${cx - 44} ${gy - 56} H${cx + 44}" stroke="${INK}" stroke-width="4"></path>`;
    // teal conical roof with tile scallops
    const rf = `M${cx - 62} ${gy - 100} Q${cx - 20} ${gy - 130} ${cx} ${gy - 196} Q${cx + 20} ${gy - 130} ${cx + 62} ${gy - 100} Q${cx} ${gy - 82} ${cx - 62} ${gy - 100} Z`;
    const rc = id('c');
    defs.push(`<clipPath id="${rc}"><path d="${rf}"></path></clipPath>`);
    tower += `<path d="${rf}" fill="${lin(
      [
        [0, '#6CC6D6'],
        [0.35, '#2E8FA3'],
        [1, '#0F3640'],
      ],
      0,
      0,
      1,
      0,
    )}"></path><g clip-path="url(#${rc})">`;
    for (let r = 0; r < 6; r++) {
      const yy = gy - 178 + r * 16,
        half = 8 + r * 10;
      let d = `M${cx - half} ${yy}`;
      const n = 3 + r;
      for (let k = 1; k <= n; k++) {
        const x2 = cx - half + (2 * half * k) / n;
        d += ` Q${f(x2 - half / n)} ${yy + 7} ${f(x2)} ${yy}`;
      }
      tower += `<path d="${d}" stroke="#0E3540" stroke-width="2" fill="none" opacity=".7"></path>`;
    }
    tower += `<path d="M${cx - 34} ${gy - 108} Q${cx - 14} ${gy - 140} ${cx - 4} ${gy - 186}" stroke="#BDF0F7" stroke-width="4" stroke-linecap="round" fill="none" opacity=".75"></path></g><path d="${rf}" fill="none" ${OUT(0, 4)}></path>`;
    // antenna mast (the modern note) with insulators and a wire down to the right
    tower += `<path d="M${cx} ${gy - 194} V${gy - 262}" stroke="${INK}" stroke-width="5" stroke-linecap="round"></path><path d="M${cx} ${gy - 196} V${gy - 260}" stroke="#C9B392" stroke-width="2"></path>`;
    tower += `<path d="M${cx - 20} ${gy - 240} H${cx + 20} M${cx - 13} ${gy - 222} H${cx + 13}" stroke="${INK}" stroke-width="4" stroke-linecap="round"></path>`;
    tower += anim(
      'wm-pulse',
      { x: cx - 7, y: gy - 273, w: 14, h: 14 },
      `<circle cx="${cx}" cy="${gy - 266}" r="7" fill="#FF6B4A" stroke="${INK}" stroke-width="2"></circle>`,
    );
    tower += contact(cx, base + 16, 64);
  }

  // ---------- CARAVANSERAI ----------
  let cara = '',
    caraShadow = '';
  {
    const x0 = 1012,
      x1 = 1468,
      base = 694,
      top = 388,
      sw = 64,
      H = 470,
      conv = (y) => y + (H - y) * 0.13;
    caraShadow += castShadow(x0 - sw, x1, base, 260, 0, 0.3);
    const sand = '#EAC48E';
    const front = lin(
      [
        [0, '#F7DAAA'],
        [0.55, sand],
        [1, '#C9935C'],
      ],
      0,
      0,
      0.4,
      1,
    );
    // palm behind the right corner
    const trunk = `M1500 ${base + 6} Q1512 560 1478 400`;
    cara += `<path d="${trunk}" stroke="${INK}" stroke-width="18" fill="none" stroke-linecap="round"></path><path d="${trunk}" stroke="${lin(
      [
        [0, '#A27A50'],
        [1, '#6A4A2C'],
      ],
      0,
      0,
      1,
      0,
    )}" stroke-width="12" fill="none" stroke-linecap="round"></path>`;
    for (let i = 0; i < 9; i++)
      cara += `<path d="M${1494 + i * 0.2} ${f(base - 20 - i * 30)} q6 -5 12 0" stroke="#4A2E1A" stroke-width="2" fill="none"></path>`;
    const frond = (a, L, droop) => {
      const ex = 1478 + Math.cos(a) * L,
        ey = 400 + Math.sin(a) * L * 0.6 + droop;
      const mx = 1478 + Math.cos(a) * L * 0.5,
        my = 400 + Math.sin(a) * L * 0.3 - 20;
      return `<path d="M1478 400 Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)} Q${f(mx + 6)} ${f(my + 22)} 1478 408 Z" fill="${lin(
        [
          [0, '#8CC35A'],
          [0.5, '#5E9A3E'],
          [1, '#2E5A26'],
        ],
      )}" ${OUT(0, 2.6)}></path>`;
    };
    for (const [a, L, d] of [
      [3.5, 120, 50],
      [4.0, 110, 20],
      [4.6, 90, -10],
      [5.2, 120, 20],
      [5.8, 130, 50],
      [0.3, 110, 70],
      [2.9, 110, 70],
    ])
      cara += frond(a, L, d);
    // domes on the roof (set back)
    const dome = (cx, by, r) => {
      let o = `<path d="${soft(
        [
          [cx - r * 0.8, by + 26],
          [cx - r * 0.8, by - 6],
          [cx + r * 0.8, by - 6],
          [cx + r * 0.8, by + 26],
        ],
        3,
        0.4,
      )}" fill="${lin(
        [
          [0, '#F3D3A0'],
          [1, '#B98654'],
        ],
        0,
        0,
        1,
        0,
      )}" ${OUT(0, 3)}></path>`;
      const d = `M${cx - r} ${by - 4} C${cx - r} ${by - r * 1.15} ${cx - r * 0.25} ${by - r * 1.35} ${cx} ${by - r * 1.6} C${cx + r * 0.25} ${by - r * 1.35} ${cx + r} ${by - r * 1.15} ${cx + r} ${by - 4} Z`;
      o += `<path d="${d}" fill="${rad(
        [
          [0, '#FFB894'],
          [0.4, '#D9654A'],
          [1, '#6E2618'],
        ],
        0.32,
        0.35,
        0.8,
      )}" ${OUT(0, 3.5)}></path>`;
      for (const k of [-0.5, 0, 0.5])
        o += `<path d="M${f(cx + k * r * 1.6)} ${by - 4} Q${f(cx + k * r * 0.9)} ${f(by - r * 1.1)} ${cx} ${f(by - r * 1.55)}" stroke="#6E2618" stroke-width="2" fill="none" opacity=".6"></path>`;
      o += `<path d="M${f(cx - r * 0.55)} ${f(by - r * 0.7)} Q${f(cx - r * 0.45)} ${f(by - r * 1.15)} ${f(cx - r * 0.1)} ${f(by - r * 1.35)}" stroke="#FFE2CC" stroke-width="4" stroke-linecap="round" fill="none" opacity=".75"></path><path d="M${cx} ${f(by - r * 1.6)} V${f(by - r * 1.6 - 20)}" stroke="${INK}" stroke-width="3"></path><circle cx="${cx}" cy="${f(by - r * 1.6 - 24)}" r="6" fill="${rad(
        [
          [0, '#FFF0B0'],
          [1, '#C8862A'],
        ],
        0.35,
        0.35,
        0.7,
      )}" stroke="${INK}" stroke-width="2"></circle>`;
      return o;
    };
    cara += dome(1230, 372, 64) + dome(1400, 380, 36);
    // left side wall (sunlit)
    const sideP = [
      [x0, top],
      [x0 - sw, conv(top)],
      [x0 - sw, conv(base)],
      [x0, base],
    ];
    cara += `<path d="${soft(sideP, 3, 0.5)}" fill="${lin(
      [
        [0, '#F9E2B8'],
        [1, '#D9AB72'],
      ],
      1,
      0,
      0,
      0,
    )}"></path><path d="${soft(sideP, 3, 0)}" fill="${AO}"></path><path d="${soft(sideP, 3, 0)}" fill="none" ${OUT(0, 4)}></path>`;
    cara += `<path d="M${x0 - 34} ${f(conv(base) - 40)} V${f(conv(560))} Q${x0 - 34} ${f(conv(530))} ${x0 - 20} ${f(conv(526))} Q${x0 - 8} ${f(conv(530))} ${x0 - 8} ${f(conv(560))} V${f(conv(base) - 46)} Z" fill="${lin(
      [
        [0, '#3A4A66'],
        [1, '#D07A34'],
      ],
    )}" ${OUT(0, 3)}></path>`;
    // front wall
    const frontP = [
      [x0, base],
      [x0, top],
      [x1, top],
      [x1, base],
    ];
    const fc = id('c');
    defs.push(`<clipPath id="${fc}"><path d="${soft(frontP, 3, 0)}"></path></clipPath>`);
    cara += `<path d="${soft(frontP, 3, 0.8)}" fill="${front}"></path><g clip-path="url(#${fc})"><rect x="${x0}" y="${top}" width="${x1 - x0}" height="${base - top}" filter="url(#fx-plaster)" opacity=".6"></rect>`;
    // tile band (zigzag)
    const tb = 512;
    cara += `<rect x="${x0}" y="${tb}" width="${x1 - x0}" height="20" fill="#1E5F6E"></rect>`;
    let zz = `M${x0} ${tb + 20}`;
    for (let xx = x0; xx < x1; xx += 20) zz += ` L${xx + 10} ${tb + 4} L${xx + 20} ${tb + 20}`;
    cara += `<path d="${zz} Z" fill="#C8553D"></path><path d="M${x0} ${tb} H${x1} M${x0} ${tb + 20} H${x1}" stroke="${INK}" stroke-width="3"></path><path d="M${x0} ${tb + 2} H${x1}" stroke="#7FD1DE" stroke-width="1.6" opacity=".7"></path>`;
    // upper arcade: pointed arches with lattice
    const lattice = id('p');
    defs.push(
      `<pattern id="${lattice}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#4E2C16"></rect><rect x="2" y="2" width="6" height="6" fill="#E7A24E"></rect></pattern>`,
    );
    const parch = (x, yT, w, h, fill, sw2 = 3) => {
      const ys = yT + w * 0.55;
      return `<path d="M${f(x)} ${f(yT + h)} V${f(ys)} Q${f(x)} ${f(yT + w * 0.12)} ${f(x + w / 2)} ${f(yT)} Q${f(x + w)} ${f(yT + w * 0.12)} ${f(x + w)} ${f(ys)} V${f(yT + h)} Z" fill="${fill}" ${OUT(0, sw2)}></path>`;
    };
    for (let i = 0; i < 6; i++) {
      if (i === 2 || i === 3) continue;
      const xx = x0 + 30 + i * 70;
      cara +=
        parch(xx - 6, 414, 52, 84, '#B98654', 0) + parch(xx, 420, 40, 76, `url(#${lattice})`, 3);
    }
    // AO
    cara += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${base - top}" fill="${AO}"></rect><rect x="${x0}" y="${top}" width="${x1 - x0}" height="${base - top}" fill="${AOH}" opacity=".6"></rect></g>`;
    cara += `<path d="${soft(frontP, 3, 0)}" fill="none" ${OUT(0, 4)}></path>`;
    // parapet with rounded merlons
    let mer = '';
    for (let xx = x0 - 2; xx < x1; xx += 38)
      mer += `<path d="${soft(
        [
          [xx, top + 2],
          [xx, top - 18],
          [xx + 24, top - 18],
          [xx + 24, top + 2],
        ],
        6,
        0.3,
      )}" fill="${lin([
        [0, '#FBE6C0'],
        [1, '#D9A86C'],
      ])}" ${OUT(0, 3)}></path>`;
    cara = cara.replace(
      `<path d="${soft(frontP, 3, 0.8)}"`,
      mer + `<path d="${soft(frontP, 3, 0.8)}"`,
    );
    cara += `<path d="M${x0 - 6} ${top + 2} H${x1 + 6}" stroke="${INK}" stroke-width="10" stroke-linecap="round"></path><path d="M${x0 - 4} ${top} H${x1 + 4}" stroke="#F6DDB0" stroke-width="4" stroke-linecap="round"></path>`;
    // great iwan gate, glowing
    const gx = 1172,
      gw = 136,
      gt = 440;
    cara += parch(
      gx - 18,
      gt - 16,
      gw + 36,
      base - gt + 16,
      lin(
        [
          [0, '#F9E0B4'],
          [1, '#C7915A'],
        ],
        0,
        0,
        1,
        0,
      ),
      4,
    );
    cara += parch(
      gx,
      gt,
      gw,
      base - gt,
      rad(
        [
          [0, '#FFF2C8'],
          [0.45, '#FFBE5C'],
          [1, '#8A4418'],
        ],
        0.5,
        0.7,
        0.7,
      ),
      4,
    );
    cara += `<path d="M${gx + 40} ${base} V${base - 90} Q${gx + 68} ${base - 120} ${gx + 96} ${base - 90} V${base}" fill="#5A2E14" opacity=".35"></path>`;
    cara += anim(
      'wm-flicker',
      { x: gx + gw / 2 - 120, y: base - 150, w: 240, h: 180 },
      `<ellipse cx="${gx + gw / 2}" cy="${base - 60}" rx="120" ry="90" fill="${rad([
        [0, '#FFE3A0', 0.7],
        [1, '#FFC56B', 0],
      ])}"></ellipse>`,
    );
    // open doors
    cara += `<path d="${soft(
      [
        [gx + 2, base],
        [gx + 2, gt + 80],
        [gx - 26, gt + 92],
        [gx - 26, base + 8],
      ],
      3,
      0.4,
    )}" fill="${lin(
      [
        [0, '#9A6236'],
        [1, '#5A3418'],
      ],
      1,
      0,
      0,
      0,
    )}" ${OUT(0, 3)}></path>`;
    cara += `<path d="${soft(
      [
        [gx + gw - 2, base],
        [gx + gw - 2, gt + 80],
        [gx + gw + 26, gt + 92],
        [gx + gw + 26, base + 8],
      ],
      3,
      0.4,
    )}" fill="${lin([
      [0, '#7A4A28'],
      [1, '#4A2812'],
    ])}" ${OUT(0, 3)}></path>`;
    // two shops with scalloped awnings
    for (const sx of [1040, 1352]) {
      cara += parch(
        sx,
        566,
        84,
        base - 566,
        rad(
          [
            [0, '#FFD98A'],
            [1, '#9A5220'],
          ],
          0.5,
          0.7,
          0.8,
        ),
        3.5,
      );
      const aw = lin(
        [
          [0, '#F4E6CC'],
          [0.5, '#F4E6CC'],
          [0.5, '#C8553D'],
          [1, '#C8553D'],
        ],
        0,
        0,
        0.12,
        0,
        ' spreadMethod="repeat"',
      );
      let sc = `M${sx - 14} 556 L${sx + 98} 556 L${sx + 108} 590`;
      for (let k = 6; k >= 0; k--)
        sc += ` Q${f(sx - 4 + k * 16 + 8)} 604 ${f(sx - 4 + k * 16)} 590`;
      sc += ` L${sx - 14} 556 Z`;
      cara += `<path d="${sc}" fill="${aw}" ${OUT(0, 3)}></path><path d="M${sx - 10} 586 H${sx + 104}" stroke="#2A1608" stroke-width="10" opacity=".25" filter="url(#fx-b2)"></path>`;
    }
    // goods: pots, rug, coffee set
    cara += `<path d="${blob(1060, base - 10, 16, 18, 8, 0.05)}" fill="${rad(
      [
        [0, '#E88A5C'],
        [1, '#8A3A22'],
      ],
      0.35,
      0.3,
      0.8,
    )}" ${OUT(0, 2.6)}></path><path d="${blob(1090, base - 8, 12, 14, 8, 0.05)}" fill="${rad(
      [
        [0, '#7FD1DE'],
        [1, '#1E5F6E'],
      ],
      0.35,
      0.3,
      0.8,
    )}" ${OUT(0, 2.6)}></path>`;
    cara += `<path d="${soft(
      [
        [1370, base - 30],
        [1420, base - 30],
        [1424, base],
        [1366, base],
      ],
      3,
      0.4,
    )}" fill="${lin([
      [0, '#9A6236'],
      [1, '#5A3418'],
    ])}" ${OUT(0, 2.6)}></path><path d="M1384 ${base - 30} q4 -16 14 -16 q8 0 8 16 M1398 ${base - 46} l10 -6" fill="${lin(
      [
        [0, '#FFE39A'],
        [1, '#B07A2A'],
      ],
      0,
      0,
      1,
      0,
    )}" ${OUT(0, 2.4)}></path>`;
    cara += anim(
      'wm-steam',
      { x: 1390, y: base - 98, w: 20, h: 44 },
      `<path d="M1400 ${base - 56} q-6 -10 0 -20 q6 -10 0 -20" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round"></path>`,
    );
    // hanging lanterns
    for (const lx of [1150, 1330])
      cara += `<path d="M${lx} 454 V474" stroke="${INK}" stroke-width="2.4"></path>${anim(
        'wm-pulse',
        { x: lx - 30, y: 458, w: 60, h: 60 },
        `<circle cx="${lx}" cy="488" r="30" fill="${rad([
          [0, '#FFE7A0', 0.8],
          [1, '#FFD36B', 0],
        ])}"></circle>`,
      )}<path d="${soft(
        [
          [lx - 9, 474],
          [lx + 9, 474],
          [lx + 11, 500],
          [lx - 11, 500],
        ],
        4,
        0.3,
      )}" fill="${rad(
        [
          [0, '#FFF6CF'],
          [1, '#E39A2E'],
        ],
        0.4,
        0.4,
        0.8,
      )}" ${OUT(0, 2.6)}></path>`;
    cara += contact((x0 + x1) / 2 - 30, base + 4, 270, 0.4);
  }

  // ---------- NOTICE BOARD ----------
  let board = '';
  {
    const cx = 884,
      base = 800;
    board += castShadow(cx - 70, cx + 70, base, 70, 0, 0.3);
    const wood = lin(
      [
        [0, '#A06E42'],
        [1, '#5A3418'],
      ],
      0,
      0,
      1,
      0,
    );
    board += `<path d="${soft(
      [
        [cx - 64, base],
        [cx - 64, base - 150],
        [cx - 52, base - 150],
        [cx - 52, base],
      ],
      3,
      0.4,
    )}" fill="${wood}" ${OUT(0, 3)}></path><path d="${soft(
      [
        [cx + 52, base],
        [cx + 52, base - 150],
        [cx + 64, base - 150],
        [cx + 64, base],
      ],
      3,
      0.4,
    )}" fill="${wood}" ${OUT(0, 3)}></path>`;
    board += `<path d="${soft(
      [
        [cx - 70, base - 150],
        [cx + 70, base - 150],
        [cx + 66, base - 50],
        [cx - 66, base - 50],
      ],
      6,
      1,
    )}" fill="${lin([
      [0, '#B98250'],
      [1, '#6E4224'],
    ])}" ${OUT(0, 3.5)}></path>`;
    for (let k = 0; k < 4; k++)
      board += `<path d="M${cx - 64} ${base - 128 + k * 22} H${cx + 64}" stroke="#5A3418" stroke-width="1.6" opacity=".6"></path>`;
    for (const [dx, dy, w, h, r] of [
      [-56, -142, 46, 40, -4],
      [-2, -144, 52, 36, 3],
      [-50, -96, 40, 38, 2],
      [0, -102, 48, 42, -3],
    ])
      board += `<g transform="rotate(${r} ${cx + dx + w / 2} ${base + dy + h / 2})"><path d="${soft(
        [
          [cx + dx, base + dy],
          [cx + dx + w, base + dy],
          [cx + dx + w, base + dy + h],
          [cx + dx, base + dy + h],
        ],
        2,
        0.8,
      )}" fill="${lin([
        [0, '#FFF7E2'],
        [1, '#E3CFA4'],
      ])}" ${OUT(0, 2)}></path><path d="M${cx + dx + 8} ${base + dy + 14} h${w - 16} M${cx + dx + 8} ${base + dy + 22} h${w - 22} M${cx + dx + 8} ${base + dy + 30} h${w - 18}" stroke="#7A5A3A" stroke-width="2" stroke-linecap="round"></path><circle cx="${cx + dx + w / 2}" cy="${base + dy + 4}" r="3" fill="#C8553D" stroke="${INK}" stroke-width="1.2"></circle></g>`;
    board += `<path d="${soft(
      [
        [cx - 86, base - 148],
        [cx, base - 196],
        [cx + 86, base - 148],
        [cx + 80, base - 140],
        [cx - 80, base - 140],
      ],
      5,
      0.6,
    )}" fill="${lin([
      [0, '#E07A5C'],
      [1, '#8A3A22'],
    ])}" ${OUT(0, 3.5)}></path><path d="M${cx - 70} ${base - 154} L${cx} ${base - 190}" stroke="#FFC3A8" stroke-width="3" stroke-linecap="round" opacity=".7"></path>`;
    board += contact(cx, base + 2, 70);
  }

  // ---------- YOUR HOUSE (front left) ----------
  const yh = house({
    x: 160,
    base: 930,
    w: 330,
    h: 300,
    side: 'right',
    sw: 120,
    s: 1.35,
    roof: '#B8432F',
    wall: '#F4E3BE',
    shutters: '#2E6F5E',
  });
  let yhExtra = '';
  yhExtra += `<path d="${blob(150, 912, 26, 20, 8, 0.05)}" fill="none"></path>`;
  // barrel + crate
  yhExtra += `<path d="${soft(
    [
      [110, 932],
      [104, 868],
      [156, 868],
      [150, 932],
    ],
    10,
    1,
  )}" fill="${lin(
    [
      [0, '#B07A4A'],
      [0.4, '#8A5530'],
      [1, '#4A2A14'],
    ],
    0,
    0,
    1,
    0,
  )}" ${OUT(0, 3.5)}></path><path d="M106 884 H154 M108 916 H152" stroke="#3A2410" stroke-width="5"></path><path d="M106 884 H154" stroke="#C9A06A" stroke-width="1.6"></path>`;
  yhExtra += contact(130, 934, 34);
  // lantern by the door
  yhExtra += `${anim(
    'wm-pulse',
    { x: 364, y: 726, w: 68, h: 68 },
    `<circle cx="398" cy="760" r="34" fill="${rad([
      [0, '#FFE7A0', 0.7],
      [1, '#FFD36B', 0],
    ])}"></circle>`,
  )}<path d="${soft(
    [
      [388, 748],
      [408, 748],
      [410, 774],
      [386, 774],
    ],
    4,
    0.3,
  )}" fill="${rad(
    [
      [0, '#FFF6CF'],
      [1, '#E39A2E'],
    ],
    0.4,
    0.4,
    0.8,
  )}" ${OUT(0, 2.6)}></path>`;

  // ---------- MARKET (front right) ----------
  let market = '',
    marketShadow = '';
  {
    const stall = (x, base, w, c1, c2, goods) => {
      let o = castShadow(x, x + w, base, 120, 0, 0.3);
      const wood = lin(
        [
          [0, '#A06E42'],
          [1, '#5A3418'],
        ],
        0,
        0,
        1,
        0,
      );
      o += `<path d="${soft(
        [
          [x + 10, base],
          [x + 10, base - 190],
          [x + 22, base - 190],
          [x + 22, base],
        ],
        3,
        0.4,
      )}" fill="${wood}" ${OUT(0, 3)}></path><path d="${soft(
        [
          [x + w - 22, base],
          [x + w - 22, base - 190],
          [x + w - 10, base - 190],
          [x + w - 10, base],
        ],
        3,
        0.4,
      )}" fill="${wood}" ${OUT(0, 3)}></path>`;
      o += `<path d="${soft(
        [
          [x, base - 70],
          [x + w, base - 70],
          [x + w - 6, base],
          [x + 6, base],
        ],
        6,
        1,
      )}" fill="${lin([
        [0, '#B98250'],
        [1, '#5E3820'],
      ])}" ${OUT(0, 3.5)}></path>`;
      o += `<path d="M${x + 4} ${base - 64} H${x + w - 4}" stroke="#E0B07A" stroke-width="3" opacity=".7"></path><path d="M${x + 30} ${base - 50} V${base - 6} M${x + w / 2} ${base - 50} V${base - 6} M${x + w - 30} ${base - 50} V${base - 6}" stroke="#4A2A14" stroke-width="2" opacity=".6"></path>`;
      o += goods(x, base - 70);
      const aw = lin(
        [
          [0, c1],
          [0.5, c1],
          [0.5, c2],
          [1, c2],
        ],
        0,
        0,
        36 / w,
        0,
        ' spreadMethod="repeat"',
      );
      let sc = `M${x - 20} ${base - 200} Q${x + w / 2} ${base - 236} ${x + w + 20} ${base - 200} L${x + w + 30} ${base - 150}`;
      const n = 8;
      for (let k = n; k > 0; k--) {
        const xa = x - 30 + ((w + 60) * k) / n,
          xb = x - 30 + ((w + 60) * (k - 1)) / n;
        sc += ` Q${f((xa + xb) / 2)} ${base - 128} ${f(xb)} ${base - 150}`;
      }
      sc += ' Z';
      o += `<path d="${sc}" fill="${aw}" ${OUT(0, 3.5)}></path><path d="${sc}" fill="${lin([
        [0, '#FFFFFF', 0.3],
        [0.5, '#FFFFFF', 0],
        [1, '#2A1608', 0.25],
      ])}"></path>`;
      o += `<path d="M${x - 16} ${base - 140} H${x + w + 20}" stroke="#2A1608" stroke-width="14" opacity=".22" filter="url(#fx-b6)"></path>`;
      o += contact(x + w / 2, base + 2, w * 0.55, 0.4);
      return o;
    };
    const fruit = (x, y) => {
      let o = `<path d="${soft(
        [
          [x + 14, y],
          [x + 120, y],
          [x + 112, y - 26],
          [x + 22, y - 26],
        ],
        4,
        0.5,
      )}" fill="${lin([
        [0, '#C9945C'],
        [1, '#7A4A28'],
      ])}" ${OUT(0, 2.6)}></path>`;
      for (let i = 0; i < 9; i++)
        o += `<circle cx="${f(x + 34 + (i % 5) * 18 + (i > 4 ? 9 : 0))}" cy="${f(y - 30 - (i > 4 ? 12 : 0))}" r="10" fill="${rad(
          [
            [0, '#FFD07A'],
            [0.6, '#F08A2A'],
            [1, '#B04A12'],
          ],
          0.35,
          0.3,
          0.8,
        )}" ${OUT(0, 2)}></circle>`;
      o += `<path d="${blob(x + 180, y - 30, 30, 30, 9, 0.06)}" fill="${rad(
        [
          [0, '#9ED6E0'],
          [1, '#1E5F6E'],
        ],
        0.35,
        0.3,
        0.8,
      )}" ${OUT(0, 2.6)}></path><path d="${soft(
        [
          [x + 228, y],
          [x + 290, y],
          [x + 290, y - 40],
          [x + 228, y - 40],
        ],
        3,
        0.5,
      )}" fill="${lin([
        [0, '#E8C46A'],
        [1, '#9A6A2A'],
      ])}" ${OUT(0, 2.6)}></path><path d="M${x + 238} ${y - 20} H${x + 280}" stroke="#7A4A20" stroke-width="2"></path>`;
      return o;
    };
    const cloth = (x, y) => {
      let o = '';
      [
        ['#C8553D', '#7A2E1C'],
        ['#2E8FA3', '#103A44'],
        ['#E8A93A', '#8A5A20'],
      ].forEach(([a, b], i) => {
        o += `<path d="${soft(
          [
            [x + 20 + i * 52, y],
            [x + 64 + i * 52, y],
            [x + 60 + i * 52, y - 28 - i * 4],
            [x + 24 + i * 52, y - 28 - i * 4],
          ],
          6,
          1,
        )}" fill="${lin([
          [0, a],
          [1, b],
        ])}" ${OUT(0, 2.6)}></path>`;
      });
      o += `<path d="${blob(x + 200, y - 22, 20, 22, 8, 0.06)}" fill="${rad(
        [
          [0, '#FFF0B0'],
          [1, '#B07A2A'],
        ],
        0.35,
        0.3,
        0.8,
      )}" ${OUT(0, 2.6)}></path><ellipse cx="${x + 200}" cy="${y - 44}" rx="12" ry="4" fill="#8A5A20" stroke="${INK}" stroke-width="2"></ellipse>`;
      return o;
    };
    market += stall(1470, 930, 330, '#F4E6CC', '#C8553D', fruit);
    market += stall(1740, 820, 220, '#F4E6CC', '#2E8FA3', cloth);
    market += `<path d="${soft(
      [
        [1420, 940],
        [1416, 880],
        [1466, 880],
        [1462, 940],
      ],
      10,
      1,
    )}" fill="${lin(
      [
        [0, '#B07A4A'],
        [0.4, '#8A5530'],
        [1, '#4A2A14'],
      ],
      0,
      0,
      1,
      0,
    )}" ${OUT(0, 3.5)}></path><path d="M1418 896 H1464 M1418 926 H1462" stroke="#3A2410" stroke-width="5"></path>`;
    market += contact(1440, 942, 34);
  }

  // ---------- AVATAR ----------
  // Only the ground shadow is painted here; the figure itself is the player's paper-doll
  // avatar (src/core/avatar, #28), placed on top by City.tsx.
  let avatar = '';
  {
    const cx = 1010,
      fy = 938;
    avatar += castShadow(cx - 26, cx + 26, fy, 60, 0, 0.35) + contact(cx, fy, 34, 0.5);
    // The old figure drew 60 random numbers. Draw them still, so everything painted after
    // it (plots, foreground) stays exactly as approved.
    for (let i = 0; i < 60; i++) R(0, 1);
  }

  // ---------- EMPTY PLOTS (room for future guilds, ADR 0003) ----------
  // A roped-off patch of earth with four stakes and a blank sign: a guild could build here.
  function plot(cx, cy) {
    const w = 170,
      d = 44;
    const corners = [
      [cx - w / 2, cy],
      [cx - w / 2 + 26, cy - d],
      [cx + w / 2 - 26, cy - d],
      [cx + w / 2, cy],
    ];
    let o = contact(cx, cy + 6, w / 2 + 10, 0.3);
    o += `<path d="${soft(corners, 10, 2)}" fill="${lin([
      [0, '#9A7350'],
      [1, '#6E4A2C'],
    ])}" ${OUT(0, 2.6)}></path>`;
    for (let i = 0; i < 9; i++) {
      const x = cx + R(-w / 2 + 30, w / 2 - 30),
        y = cy - R(6, d - 8);
      o += `<path d="M${f(x - 9)} ${f(y)} q9 -4 18 0" stroke="#5A3A20" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"></path>`;
    }
    const tops = corners.map(([x, y]) => [x, y - 34]);
    const rope = (a, b) =>
      `<path d="M${f(a[0])} ${f(a[1] + 6)} Q${f((a[0] + b[0]) / 2)} ${f((a[1] + b[1]) / 2 + 16)} ${f(b[0])} ${f(b[1] + 6)}" stroke="#E8D3A0" stroke-width="3" fill="none"></path>`;
    o += rope(tops[1], tops[2]);
    for (const [x, y] of corners) {
      o += `<path d="${soft(
        [
          [x - 4, y + 2],
          [x - 4, y - 34],
          [x + 4, y - 36],
          [x + 4, y + 2],
        ],
        2,
        0.4,
      )}" fill="${lin(
        [
          [0, '#B07A4A'],
          [1, '#5A3418'],
        ],
        0,
        0,
        1,
        0,
      )}" ${OUT(0, 2.2)}></path>`;
    }
    o += rope(tops[0], tops[1]) + rope(tops[2], tops[3]) + rope(tops[0], tops[3]);
    // the signpost, planted in the middle of the plot
    o += `<path d="M${cx} ${cy - 14} V${cy - 70}" stroke="${INK}" stroke-width="9" stroke-linecap="round"></path><path d="M${cx} ${cy - 14} V${cy - 70}" stroke="#8A5530" stroke-width="5" stroke-linecap="round"></path>`;
    o += `<path d="${soft(
      [
        [cx - 44, cy - 100],
        [cx + 44, cy - 104],
        [cx + 46, cy - 70],
        [cx - 42, cy - 68],
      ],
      6,
      1,
    )}" fill="${lin([
      [0, '#E9C48E'],
      [1, '#B98A55'],
    ])}" ${OUT(0, 2.6)}></path>`;
    o += `<path d="M${cx - 28} ${cy - 90} H${cx + 28} M${cx - 22} ${cy - 80} H${cx + 18}" stroke="#7A5230" stroke-width="2.4" stroke-linecap="round" opacity=".5"></path>`;
    return o;
  }
  const plots = [
    { cx: 640, cy: 1012 },
    { cx: 1300, cy: 1004 },
  ].map(({ cx, cy }) => ({ box: { x: cx - 95, y: cy - 110, w: 190, h: 126 }, svg: plot(cx, cy) }));

  // ---------- FOREGROUND (out of focus) + grade ----------
  let fg = '';
  fg += `<g filter="url(#fx-dof)">`;
  fg += `<path d="${blob(60, 1090, 200, 90, 11, 0.15)}" fill="#3A2A1C"></path><path d="${blob(-10, 1000, 90, 110, 9, 0.2)}" fill="#2E4424"></path><path d="${blob(70, 980, 70, 80, 9, 0.2)}" fill="#3E5A2C"></path>`;
  fg += `<path d="${blob(1880, 1080, 210, 110, 11, 0.15)}" fill="#3A2A1C"></path><path d="${blob(1930, 980, 100, 130, 9, 0.2)}" fill="#2E4424"></path><path d="${blob(1830, 1010, 60, 70, 9, 0.2)}" fill="#46642E"></path>`;
  fg += `<path d="${blob(560, 1110, 120, 40, 9, 0.2)}" fill="#4A3424"></path><path d="${blob(1420, 1110, 140, 40, 9, 0.2)}" fill="#4A3424"></path>`;
  fg += `</g>`;
  // sun rays
  let rays = '';
  for (const [a, w] of [
    [0.35, 0.05],
    [0.55, 0.04],
    [0.8, 0.06],
    [1.05, 0.035],
  ]) {
    const L = 1500,
      x1 = 420 + Math.cos(a - w) * L,
      y1 = 230 + Math.sin(a - w) * L,
      x2 = 420 + Math.cos(a + w) * L,
      y2 = 230 + Math.sin(a + w) * L;
    rays += `<path d="M420 230 L${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} Z" fill="${lin(
      [
        [0, '#FFF6D6', 0.5],
        [1, '#FFF6D6', 0],
      ],
      0,
      0,
      1,
      1,
    )}"></path>`;
  }
  const grade =
    `<g opacity=".45" filter="url(#fx-b14)">${rays}</g>` +
    `<rect width="1920" height="1080" fill="${rad(
      [
        [0, '#000', 0],
        [0.7, '#3A1A10', 0.05],
        [1, '#2A1008', 0.55],
      ],
      0.45,
      0.45,
      0.75,
    )}"></rect>` +
    `<rect width="1920" height="1080" filter="url(#fx-grain)" opacity=".18"></rect>`;

  // Made before the defs are joined below: its gradient was added too late and the band never
  // showed (review, 2026-11-19).
  const groundHaze = `<rect x="0" y="380" width="1920" height="200" fill="${lin([
    [0, HAZE, 0],
    [0.6, HAZE, 0.3],
    [1, HAZE, 0],
  ])}"></rect>`;
  const box = (x, y, w, h) => ({ x, y, w, h });
  const part = (b, svg) => ({ box: b, segments: segments(svg) });
  const city = {
    defs: defs.join(''),
    layers: {
      sky: segments(`${sky}${arena}${hazeBand}`),
      ground: segments(`${ground}${bt}${back.shadow}${back.body}${groundHaze}`),
      mid: segments(`${tufts}${side.shadow}${side.body}${towerShadow}${caraShadow}`),
      front: segments(`${fg}${grade}`),
    },
    places: {
      tower: part(box(600, 30, 230, 700), tower),
      caravanserai: part(box(930, 220, 640, 500), cara),
      board: part(box(794, 600, 180, 210), board),
      house: part(box(90, 470, 560, 470), yh.shadow + yh.body + yhExtra),
      market: part(box(1400, 590, 520, 360), marketShadow + market),
    },
    avatar: part(box(950, 740, 120, 210), avatar),
    plots: plots.map((p) => part(p.box, p.svg)),
  };
  return city;
}
