import { useId } from 'react';

// Small HUD icons, from the city concept.
export function FlameIcon({ lit = true }: { lit?: boolean }) {
  return (
    <svg aria-hidden="true" width="22" height="26" viewBox="0 0 18 22">
      <path
        d="M9 1 C12 6 16 8 16 14 A7 7 0 0 1 2 14 C2 10 5 9 6 5 C7 8 9 8 9 1 Z"
        fill={lit ? '#f2a65a' : '#7a6a5a'}
        stroke="#24160e"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CoinIcon() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="#e8a93a" stroke="#24160e" strokeWidth="2.5" />
      <path d="M10 6 v8" stroke="#24160e" strokeWidth="2" />
    </svg>
  );
}

export function GemIcon() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 20 20">
      <path
        d="M10 2 L17 8 L10 18 L3 8 Z"
        fill="#7fd1de"
        stroke="#24160e"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg
      aria-hidden="true"
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#f6e7c4"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </svg>
  );
}

/** A streak shield (ADR 0034): blue with a brass rim, like the Market's ware. */
export function ShieldIcon() {
  return (
    <svg aria-hidden="true" width="20" height="22" viewBox="0 0 20 22">
      <path
        d="M10 1.5 L18 4.5 V10 C18 15 14.5 18.5 10 20.5 C5.5 18.5 2 15 2 10 V4.5 Z"
        fill="#5b8fc7"
        stroke="#24160e"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M10 5 V17" stroke="#e8a93a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The daily goal's hourglass: the sand in the lower bulb fills as today's minutes reach the goal
 * (`filled`, 0 to 1), and the top bulb empties.
 */
export function HourglassIcon({ filled = 0, size = 22 }: { filled?: number; size?: number }) {
  const f = Math.max(0, Math.min(1, filled));
  // The lower bulb holds sand from y 18.5 up to y 12 when full; the upper from y 3.5 down to 10.
  const low = 18.5 - 6.5 * f;
  const high = 3.5 + 6.5 * f;
  const clip = useId();
  return (
    <svg
      aria-hidden="true"
      width={(size * 18) / 22}
      height={size}
      viewBox="0 0 18 22"
      className="hourglass"
    >
      <defs>
        <clipPath id={clip}>
          <path d="M4 3 H14 C14 7 10 9.5 10 11 C10 12.5 14 15 14 19 H4 C4 15 8 12.5 8 11 C8 9.5 4 7 4 3 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="0" width="18" height="22" fill="#fbf1d8" opacity="0.25" />
        <rect x="0" y={high} width="18" height={Math.max(0, 10.5 - high)} fill="#e8a93a" />
        <rect x="0" y={low} width="18" height={19 - low} fill="#e8a93a" />
      </g>
      <path
        d="M4 3 H14 C14 7 10 9.5 10 11 C10 12.5 14 15 14 19 H4 C4 15 8 12.5 8 11 C8 9.5 4 7 4 3 Z"
        fill="none"
        stroke="#24160e"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M2 2 H16 M2 20 H16" stroke="#8a5a33" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M2 2 H16 M2 20 H16"
        stroke="#24160e"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}
