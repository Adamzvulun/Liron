import { useDialogFocus } from './useDialogFocus.ts';
import type { DayResult } from '../progress/store.ts';
import { CoinIcon, FlameIcon, GemIcon } from './icons.tsx';
import './player.css';

/** The daily-goal celebration: the streak and the daily chest. */
export function GoalReached({ day, onDone }: { day: DayResult; onDone: () => void }) {
  const button = useDialogFocus();
  return (
    <div className="levelup" role="presentation" onKeyDown={(e) => e.key === 'Escape' && onDone()}>
      <div className="levelup__rays" aria-hidden="true" />
      <div className="levelup__card" role="dialog" aria-modal="true" aria-labelledby="goal-title">
        <p className="levelup__kicker">Daily goal reached</p>
        <h2 id="goal-title" className="levelup__level goal__streak">
          <FlameIcon />
          {day.streak} {day.streak === 1 ? 'day' : 'days'}
        </h2>
        <p className="levelup__title">
          {day.streak === 1
            ? 'A new streak begins. Come back tomorrow to keep it.'
            : 'Your streak grows. Come back tomorrow to keep it.'}
        </p>
        <ul className="levelup__rewards" aria-label="Daily chest">
          <li className="hud__chip">
            <CoinIcon />+{day.chestGold} gold
          </li>
          {day.chestGems > 0 && (
            <li className="hud__chip">
              <GemIcon />+{day.chestGems} {day.chestGems === 1 ? 'gem' : 'gems'}
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
