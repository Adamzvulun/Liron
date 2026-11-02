import { levelProgress, titleForLevel } from '../progress/economy.ts';
import type { PlayerState } from './player.ts';
import './player.css';

/** Level, XP bar, gold and gems, as in the city concept's HUD. */
export function Hud({ state }: { state: PlayerState }) {
  if (state.error) {
    return (
      <p className="hud__error" role="status">
        Couldn't load your progress. Try reloading the page.
      </p>
    );
  }
  const wallet = state.wallet;
  const { level, into, needed } = levelProgress(wallet?.xp ?? 0);
  const pct = Math.round((into / needed) * 100);
  return (
    <div className="hud" aria-busy={!wallet}>
      <div className="hud__plate">
        <div className="hud__who">
          <span className="hud__title">{titleForLevel(level)}</span>
          <span className="hud__level">Lv {wallet ? level : '…'}</span>
        </div>
        <div className="hud__xp">
          <div
            className="hud__bar"
            role="progressbar"
            aria-label={`Level ${level} progress`}
            aria-valuemin={0}
            aria-valuemax={needed}
            aria-valuenow={into}
          >
            <div className="hud__fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="hud__xptext">{wallet ? `${into} / ${needed} XP` : '… XP'}</span>
        </div>
      </div>
      <div className="hud__purse">
        <span className="hud__chip" aria-label={`Gold: ${wallet?.gold ?? '…'}`}>
          <CoinIcon />
          {wallet?.gold ?? '…'}
        </span>
        <span className="hud__chip" aria-label={`Gems: ${wallet?.gems ?? '…'}`}>
          <GemIcon />
          {wallet?.gems ?? '…'}
        </span>
      </div>
    </div>
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
