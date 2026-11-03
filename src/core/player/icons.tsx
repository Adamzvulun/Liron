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
