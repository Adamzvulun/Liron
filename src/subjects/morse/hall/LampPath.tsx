import { useId } from 'react';

/**
 * The chapter's lamp path (#33): a painted stone stair winding up the tower, one brass lamp per
 * character, and the trial's gate at the top. Lit lamps glow; the next one flickers.
 */
export function LampPath({
  letters,
  lit,
  trialName,
}: {
  letters: readonly string[];
  lit: readonly string[];
  trialName: string;
}) {
  const id = useId().replace(/:/g, '');
  const W = 520;
  const H = 560;
  // Lamps zig-zag up the stair, bottom to top.
  const spots = letters.map((_, i) => {
    const t = i / Math.max(1, letters.length - 1);
    return { x: W / 2 + (i % 2 ? 1 : -1) * (150 - 40 * t), y: H - 70 - t * (H - 200) };
  });
  const stair = spots.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ') + ` L${W / 2} 82`;
  const nextIdx = letters.findIndex((c) => !lit.includes(c));
  const allLit = nextIdx === -1;

  return (
    <svg
      className="lamp-path"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${lit.length} of ${letters.length} lamps lit. ${allLit ? `${trialName} awaits.` : ''}`}
    >
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#FFE7A0" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#FFD36B" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFD36B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-lit`} cx="0.4" cy="0.35">
          <stop offset="0" stopColor="#FFF6D6" />
          <stop offset="0.5" stopColor="#FFD36B" />
          <stop offset="1" stopColor="#C98A2A" />
        </radialGradient>
        <radialGradient id={`${id}-dark`} cx="0.4" cy="0.35">
          <stop offset="0" stopColor="#6E6253" />
          <stop offset="1" stopColor="#2E2620" />
        </radialGradient>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B3550" />
          <stop offset="1" stopColor="#5A4A3C" />
        </linearGradient>
        <linearGradient id={`${id}-step`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8E7E6A" />
          <stop offset="0.5" stopColor="#BFAE94" />
          <stop offset="1" stopColor="#7A6A57" />
        </linearGradient>
        <pattern id={`${id}-blocks`} width="64" height="34" patternUnits="userSpaceOnUse">
          <path
            d="M0 0.5 H64 M0 17.5 H64 M0.5 0 V17 M32.5 17 V34"
            stroke="#24160E"
            strokeOpacity="0.35"
            strokeWidth="2"
          />
        </pattern>
      </defs>

      {/* the tower's inner wall, lit from below by what's already burning */}
      <rect width={W} height={H} rx="18" fill={`url(#${id}-wall)`} />
      <rect width={W} height={H} rx="18" fill={`url(#${id}-blocks)`} />
      <ellipse
        cx={W / 2}
        cy={H - 40}
        rx={W * 0.6}
        ry={60 + lit.length * 18}
        fill={`url(#${id}-glow)`}
        opacity={0.15 + lit.length * 0.06}
      />

      {/* the stair */}
      <path
        d={stair}
        fill="none"
        stroke="#24160E"
        strokeWidth="46"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={stair}
        fill="none"
        stroke={`url(#${id}-step)`}
        strokeWidth="38"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={stair}
        fill="none"
        stroke="#24160E"
        strokeOpacity="0.35"
        strokeWidth="38"
        strokeDasharray="3 15"
        strokeLinejoin="round"
      />

      {/* the gate at the top */}
      <g transform={`translate(${W / 2 - 48} 22)`}>
        <path
          d="M0 76 V34 A48 34 0 0 1 96 34 V76 Z"
          fill={allLit ? '#3A2A1A' : '#1E1812'}
          stroke="#24160E"
          strokeWidth="5"
        />
        {[16, 32, 48, 64, 80].map((x) => (
          <path
            key={x}
            d={`M${x} ${x === 48 ? 4 : 14} V76`}
            stroke={allLit ? '#E8A93A' : '#7A6A57'}
            strokeWidth="5"
            strokeLinecap="round"
          />
        ))}
        <path d="M2 50 H94" stroke={allLit ? '#E8A93A' : '#7A6A57'} strokeWidth="5" />
        {allLit && (
          <ellipse
            cx="48"
            cy="44"
            rx="70"
            ry="54"
            fill={`url(#${id}-glow)`}
            className="lamp-path__flicker"
          />
        )}
      </g>

      {/* the lamps */}
      {letters.map((c, i) => {
        const p = spots[i];
        if (!p) return null;
        const on = lit.includes(c);
        const next = i === nextIdx;
        return (
          <g key={c} transform={`translate(${p.x} ${p.y})`}>
            {on && <circle r="62" fill={`url(#${id}-glow)`} />}
            <path d="M0 -44 V-30" stroke="#24160E" strokeWidth="4" />
            <circle
              r="27"
              fill={on ? `url(#${id}-lit)` : `url(#${id}-dark)`}
              stroke={next ? '#FFD36B' : '#24160E'}
              strokeWidth={next ? 5 : 4}
              className={next ? 'lamp-path__flicker' : undefined}
            />
            <text
              y="10"
              textAnchor="middle"
              className="lamp-path__char"
              fill={on ? '#24160E' : next ? '#FFD36B' : '#A6957F'}
            >
              {on || next ? c : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
