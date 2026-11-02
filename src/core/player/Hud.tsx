import { DAILY_GOAL_CHOICES, levelProgress, titleForLevel } from '../progress/economy.ts';
import type { PlayerState } from './player.ts';
import './player.css';

/** Level, XP bar, gold, gems, streak and today's goal, as in the city concept's HUD. */
export function Hud({
  state,
  onGoalChange,
}: {
  state: PlayerState;
  onGoalChange: (minutes: number) => void;
}) {
  if (state.error) {
    return (
      <p className="hud__error" role="status">
        Couldn't load your progress. Try reloading the page.
      </p>
    );
  }
  const { wallet, today } = state;
  const streak = today?.streak ?? 0;
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
        <span
          className="hud__chip"
          aria-label={today ? `Streak: ${streak} ${streak === 1 ? 'day' : 'days'}` : 'Streak: …'}
        >
          <FlameIcon lit={Boolean(today?.goalReached)} />
          {today ? `${streak} ${streak === 1 ? 'day' : 'days'}` : '…'}
        </span>
      </div>
      {today && <DailyGoal today={today} onGoalChange={onGoalChange} />}
    </div>
  );
}

function DailyGoal({
  today,
  onGoalChange,
}: {
  today: NonNullable<PlayerState['today']>;
  onGoalChange: (minutes: number) => void;
}) {
  const shown = Math.min(today.minutes, today.goalMinutes);
  const choices = DAILY_GOAL_CHOICES.includes(today.goalMinutes as never)
    ? DAILY_GOAL_CHOICES
    : [...DAILY_GOAL_CHOICES, today.goalMinutes].sort((a, b) => a - b);
  return (
    <div className="hud__goal">
      <div className="hud__goalhead">
        <span className="hud__goaltitle">Daily goal</span>
        <span className="hud__goalnums">
          {today.goalReached
            ? `Done! ${today.minutes} min today`
            : `${today.minutes} / ${today.goalMinutes} min`}
        </span>
      </div>
      <div
        className="hud__bar hud__bar--goal"
        role="progressbar"
        aria-label="Daily goal progress"
        aria-valuemin={0}
        aria-valuemax={today.goalMinutes}
        aria-valuenow={shown}
      >
        <div
          className={`hud__fill${today.goalReached ? ' hud__fill--done' : ''}`}
          style={{ width: `${Math.round((shown / today.goalMinutes) * 100)}%` }}
        />
      </div>
      <label className="hud__goalpick">
        Minutes a day
        <select value={today.goalMinutes} onChange={(e) => onGoalChange(Number(e.target.value))}>
          {choices.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

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
