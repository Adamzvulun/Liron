import { useEffect, useId, useRef, useState } from 'react';
import { Link } from '../Link.tsx';
import { DAILY_GOAL_CHOICES, levelProgress, titleForLevel } from '../progress/economy.ts';
import { MAX_NAME_LENGTH } from '../progress/store.ts';
import { CoinIcon, FlameIcon, GearIcon, GemIcon } from './icons.tsx';
import type { PlayerState } from './player.ts';
import { todaysQuests } from './quests.ts';
import { useCountUp } from './useCountUp.ts';
import './player.css';

export interface HudActions {
  onGoalChange: (minutes: number) => void;
  /** Saves the player's name; resolves false if it couldn't be saved. */
  onNameChange: (name: string) => Promise<boolean>;
  onSignOut: () => void;
}

/**
 * The HUD from the city concept (#26): portrait, name, title, level and XP on the left; the
 * Waymark banner; gold, gems, streak and settings on the right; today's quests below them.
 */
export function Hud({ state, ...actions }: { state: PlayerState } & HudActions) {
  if (state.error) {
    return (
      <p className="hud__error" role="status">
        Couldn't load your progress. Try reloading the page.
      </p>
    );
  }
  const { wallet, today, profile } = state;
  return (
    <div className="hud" aria-busy={!wallet}>
      <PlayerPlate xp={wallet?.xp} name={profile?.displayName ?? ''} loaded={Boolean(wallet)} />
      <div className="hud__banner" aria-hidden="true">
        Waymark
      </div>
      <Purse state={state} {...actions} />
      {today && <QuestTracker today={today} />}
    </div>
  );
}

function PlayerPlate({ xp, name, loaded }: { xp?: number; name: string; loaded: boolean }) {
  const { level, into, needed } = levelProgress(xp ?? 0);
  const pct = Math.round((into / needed) * 100);
  return (
    <div className="hud__player">
      <Portrait />
      <div className="hud__plate">
        <div className="hud__who">
          {name && <span className="hud__name">{name}</span>}
          <span className="hud__title">{titleForLevel(level)}</span>
          <span className="hud__level">Lv {loaded ? level : '…'}</span>
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
          <span className="hud__xptext">{loaded ? `${into} / ${needed} XP` : '… XP'}</span>
        </div>
      </div>
    </div>
  );
}

/** A stand-in portrait until the avatar epic (E5) draws the real one. */
function Portrait() {
  return (
    <div className="hud__portrait" role="img" aria-label="Your portrait">
      <svg aria-hidden="true" width="76" height="70" viewBox="0 0 60 56">
        <circle cx="30" cy="30" r="16" fill="#e0a77c" stroke="#24160e" strokeWidth="3" />
        <path
          d="M14 28 Q16 10 30 10 Q46 10 46 26 Q40 18 30 20 Q20 18 14 28 Z"
          fill="#3a2414"
          stroke="#24160e"
          strokeWidth="3"
        />
        <path
          d="M8 56 Q12 44 30 44 Q48 44 52 56 Z"
          fill="#c8553d"
          stroke="#24160e"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

function Purse({ state, ...actions }: { state: PlayerState } & HudActions) {
  const { wallet, today } = state;
  const gold = useCountUp(wallet?.gold);
  const gems = useCountUp(wallet?.gems);
  const streak = today?.streak ?? 0;
  const days = `${streak} ${streak === 1 ? 'day' : 'days'}`;
  return (
    <div className="hud__purse">
      <span className="hud__chip" aria-label={`Gold: ${wallet?.gold ?? '…'}`}>
        <CoinIcon />
        {gold ?? '…'}
      </span>
      <span className="hud__chip" aria-label={`Gems: ${wallet?.gems ?? '…'}`}>
        <GemIcon />
        {gems ?? '…'}
      </span>
      <span className="hud__chip" aria-label={today ? `Streak: ${days}` : 'Streak: …'}>
        <FlameIcon lit={Boolean(today?.goalReached)} />
        {today ? days : '…'}
      </span>
      {today && (
        <span
          className="hud__chip hud__chip--goal"
          aria-label={`Daily goal: ${today.minutes} of ${today.goalMinutes} minutes`}
        >
          {today.goalReached ? 'Goal done' : `${today.minutes}/${today.goalMinutes} min`}
        </span>
      )}
      <Settings state={state} {...actions} />
    </div>
  );
}

function Settings({
  state,
  onGoalChange,
  onNameChange,
  onSignOut,
}: { state: PlayerState } & HudActions) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('input, select, button')?.focus();
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e instanceof PointerEvent && panel.current?.parentElement?.contains(e.target as Node)) {
        return;
      }
      setOpen(false);
      if (e instanceof KeyboardEvent) button.current?.focus();
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', close);
    };
  }, [open]);
  return (
    <div className="hud__settings">
      <button
        ref={button}
        type="button"
        className="hud__gear"
        aria-label="Settings"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <GearIcon />
      </button>
      {open && (
        <div className="hud__panel" id={id} ref={panel} role="group" aria-label="Settings">
          <NameField name={state.profile?.displayName ?? ''} onNameChange={onNameChange} />
          {state.today && (
            <GoalPicker goalMinutes={state.today.goalMinutes} onGoalChange={onGoalChange} />
          )}
          <button type="button" className="hud__signout" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function NameField({
  name,
  onNameChange,
}: {
  name: string;
  onNameChange: HudActions['onNameChange'];
}) {
  const [draft, setDraft] = useState(name);
  const [status, setStatus] = useState('');
  const save = async () => {
    if (draft.trim() === name) return;
    setStatus((await onNameChange(draft)) ? 'Saved' : "Couldn't save your name");
  };
  return (
    <form
      className="hud__field"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label>
        Your name
        <input
          value={draft}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="nickname"
          onChange={(e) => {
            setDraft(e.target.value);
            setStatus('');
          }}
          onBlur={() => void save()}
        />
      </label>
      <span className="hud__fieldstatus" role="status">
        {status}
      </span>
    </form>
  );
}

function GoalPicker({
  goalMinutes,
  onGoalChange,
}: {
  goalMinutes: number;
  onGoalChange: HudActions['onGoalChange'];
}) {
  const choices = DAILY_GOAL_CHOICES.includes(goalMinutes as never)
    ? DAILY_GOAL_CHOICES
    : [...DAILY_GOAL_CHOICES, goalMinutes].sort((a, b) => a - b);
  return (
    <label className="hud__field">
      Minutes a day
      <select value={goalMinutes} onChange={(e) => onGoalChange(Number(e.target.value))}>
        {choices.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Today's quests and the daily goal bar, in the HUD and on the Notice Board. */
export function QuestTracker({ today }: { today: NonNullable<PlayerState['today']> }) {
  const shown = Math.min(today.minutes, today.goalMinutes);
  return (
    <section className="hud__quests" aria-labelledby="hud-quests">
      <div className="hud__questhead">
        <h2 id="hud-quests" className="hud__queststitle">
          Quests
        </h2>
        <span className="hud__goalnums">
          {today.goalReached
            ? `Daily goal done! ${today.minutes} min`
            : `Daily goal ${today.minutes} / ${today.goalMinutes} min`}
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
      <ul className="hud__questlist">
        {todaysQuests(today.goalMinutes).map((q) => (
          <li key={q.giver}>
            <Link className="hud__quest" href={q.href} style={{ borderLeftColor: q.color }}>
              <span className="hud__questgiver" style={{ color: q.color }}>
                {q.giver}
              </span>
              <span className="hud__questtext">
                {q.text}
                {q.arabic && (
                  <>
                    {' '}
                    <span lang="ar" dir="rtl" className="hud__questarabic">
                      {q.arabic}
                    </span>
                  </>
                )}
              </span>
              <span className="hud__questreward">{q.reward}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
