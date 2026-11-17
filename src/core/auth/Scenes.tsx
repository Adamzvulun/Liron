import './scenes.css';

// Two small painted scenes for the screens outside the city (docs/design/grounds.md): the city
// gate at dusk, behind sign-in and "Opening the gates…", and the waymark post that stands where
// an address leads nowhere or a screen fails. Drawn as SVG in the page, like every painting
// (ADR 0025); they are part of the startup code, so they stay small.

const INK = '#2A170C';
const OUT = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' } as const;

/** A lit lantern on its bracket, hanging at (x, y). */
function Lantern({ x, y, lit = true }: { x: number; y: number; lit?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {lit && <circle r="150" cy="46" fill="url(#scene-glow)" className="scene__flame" />}
      <path d="M0 -30 V0" stroke={INK} strokeWidth="5" />
      <path d="M-16 0 H16 L22 14 H-22 Z" fill="#7A5A2A" {...OUT} />
      <rect
        x="-18"
        y="14"
        width="36"
        height="54"
        rx="4"
        fill={lit ? '#FFD36B' : '#4B3A2C'}
        {...OUT}
      />
      {lit && <ellipse cy="44" rx="7" ry="14" fill="#FFF3C4" />}
      <path d="M0 14 V68 M-18 40 H18" stroke={INK} strokeWidth="2.5" opacity=".6" />
      <path d="M-22 68 H22 L14 80 H-14 Z" fill="#7A5A2A" {...OUT} />
    </g>
  );
}

/**
 * The city gate at dusk: the wall, an arch with its doors ajar and warm light in the gap, a
 * lantern on each pier, and a sunset behind. `open` widens the gap,
 * for the moment the gates are opening.
 */
export function GateScene({ open = false }: { open?: boolean }) {
  const gap = open ? 46 : 16;
  return (
    <svg
      className="scene scene--gate"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="scene-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B1A14" />
          <stop offset=".45" stopColor="#4A2A3A" />
          <stop offset=".8" stopColor="#B25A44" />
          <stop offset="1" stopColor="#D9784F" />
        </linearGradient>
        <linearGradient id="scene-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6A5646" />
          <stop offset="1" stopColor="#3A2C24" />
        </linearGradient>
        <linearGradient id="scene-door" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6A3F22" />
          <stop offset="1" stopColor="#3E2413" />
        </linearGradient>
        <radialGradient id="scene-glow">
          <stop offset="0" stopColor="#FFE7A0" stopOpacity=".55" />
          <stop offset=".45" stopColor="#FFC861" stopOpacity=".18" />
          <stop offset="1" stopColor="#FFB347" stopOpacity="0" />
        </radialGradient>
        <pattern id="scene-courses" width="120" height="56" patternUnits="userSpaceOnUse">
          <path d="M0 0 H120 M0 28 H120 M30 0 V28 M90 28 V56" stroke="#2A1D16" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="1600" height="1000" fill="url(#scene-sky)" />
      {/* Far roofs against the sunset, then the wall with its battlements. */}
      <path
        d="M0 330 L90 300 L170 330 V250 L220 215 L270 250 V330 L420 330 L470 290 L520 330 H1080 L1140 280 L1200 330 H1330 V240 L1375 200 L1420 240 V330 L1520 305 L1600 330 V400 H0 Z"
        fill="#3A1F26"
      />
      <path
        d="M0 1000 V330 H70 V290 H170 V330 H270 V290 H370 V330 H470 V290 H570 V330 H1030 V290 H1130 V330 H1230 V290 H1330 V330 H1430 V290 H1530 V330 H1600 V1000 Z"
        fill="url(#scene-wall)"
        {...OUT}
      />
      <rect y="334" width="1600" height="666" fill="url(#scene-courses)" opacity=".55" />
      {/* The gatehouse stands a little proud of the wall. */}
      <path
        d="M440 1000 V250 H520 V210 H620 V250 H700 V210 H900 V250 H980 V210 H1080 V250 H1160 V1000 Z"
        fill="url(#scene-wall)"
        {...OUT}
      />
      <rect x="444" y="254" width="712" height="746" fill="url(#scene-courses)" opacity=".5" />
      {/* The arch: its stones, the dark of the passage, the two doors and the light between. */}
      <path d="M520 1000 V560 A280 280 0 0 1 1080 560 V1000 Z" fill="#8C7A68" {...OUT} />
      <path d="M560 1000 V560 A240 240 0 0 1 1040 560 V1000 Z" fill="#1E120B" {...OUT} />
      <path
        d={`M${800 - gap} 1000 V324 Q800 318 ${800 + gap} 324 V1000 Z`}
        fill="#FFD36B"
        className="scene__flame"
      />
      <path
        d={`M560 1000 V560 A240 240 0 0 1 ${800 - gap} 322 V1000 Z`}
        fill="url(#scene-door)"
        {...OUT}
      />
      <path
        d={`M1040 1000 V560 A240 240 0 0 0 ${800 + gap} 322 V1000 Z`}
        fill="url(#scene-door)"
        {...OUT}
      />
      <path
        d="M620 420 V1000 M680 372 V1000 M740 340 V1000 M860 340 V1000 M920 372 V1000 M980 420 V1000"
        stroke={INK}
        strokeWidth="2.5"
        opacity=".45"
      />
      <path
        d="M564 620 H780 M820 620 H1036 M564 880 H780 M820 880 H1036"
        stroke="#B98A3A"
        strokeWidth="14"
      />
      <path
        d="M564 620 H780 M820 620 H1036 M564 880 H780 M820 880 H1036"
        stroke={INK}
        strokeWidth="2"
        opacity=".5"
      />
      <ellipse cx="800" cy="1000" rx="210" ry="46" fill="#FFD36B" opacity=".28" />
      <path d="M770 262 H830 L842 322 H758 Z" fill="#A08C78" {...OUT} />
      <Lantern x={480} y={520} />
      <Lantern x={1120} y={520} />
    </svg>
  );
}

/**
 * The waymark post, the city's namesake: a signpost with one arm and a lantern. Lit, it shows
 * the way back from an address that leads nowhere; out, it stands by a screen that failed.
 */
export function WaymarkPost({ lit = true }: { lit?: boolean }) {
  return (
    <svg className="scene scene--post" viewBox="0 0 300 380" aria-hidden="true">
      <defs>
        <radialGradient id="scene-glow">
          <stop offset="0" stopColor="#FFE7A0" stopOpacity=".55" />
          <stop offset=".45" stopColor="#FFC861" stopOpacity=".18" />
          <stop offset="1" stopColor="#FFB347" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="150" cy="352" rx="96" ry="16" fill="#1E120B" opacity=".5" />
      <path d="M118 356 L128 318 H172 L182 356 Z" fill="#8C7A68" {...OUT} />
      <rect x="138" y="52" width="24" height="270" rx="4" fill="#7A5A40" {...OUT} />
      <path d="M150 52 L128 30 L150 12 L172 30 Z" fill="#B98A3A" {...OUT} />
      <path d="M162 108 H40 L14 136 L40 164 H162 Z" fill="#D9B68C" {...OUT} />
      <path
        d="M60 128 H140 M60 146 H116"
        stroke={INK}
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".55"
      />
      <path d="M162 86 H236" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <Lantern x={232} y={116} lit={lit} />
    </svg>
  );
}
