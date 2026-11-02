import { useEffect, useRef } from 'react';
import { titleForLevel } from '../progress/economy.ts';
import type { Award } from '../progress/store.ts';
import { CoinIcon, GemIcon } from './Hud.tsx';
import './player.css';

/** The level-up celebration. Shown over the page until the player moves on. */
export function LevelUp({ award, onDone }: { award: Award; onDone: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  const newTitle =
    titleForLevel(award.level) !== titleForLevel(award.levelBefore)
      ? titleForLevel(award.level)
      : null;
  return (
    <div className="levelup" role="presentation" onKeyDown={(e) => e.key === 'Escape' && onDone()}>
      <div className="levelup__rays" aria-hidden="true" />
      <div
        className="levelup__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="levelup-title"
      >
        <p className="levelup__kicker">Level up!</p>
        <h2 id="levelup-title" className="levelup__level">
          Level {award.level}
        </h2>
        {newTitle && (
          <p className="levelup__title">
            You are now {/^[AEIOU]/.test(newTitle) ? 'an' : 'a'} <strong>{newTitle}</strong>
          </p>
        )}
        <ul className="levelup__rewards" aria-label="Rewards">
          <li className="hud__chip">
            <CoinIcon />+{award.goldEarned} gold
          </li>
          {award.gemsEarned > 0 && (
            <li className="hud__chip">
              <GemIcon />+{award.gemsEarned} {award.gemsEarned === 1 ? 'gem' : 'gems'}
            </li>
          )}
        </ul>
        <button ref={button} type="button" className="levelup__go" onClick={onDone}>
          Onward
        </button>
      </div>
    </div>
  );
}
