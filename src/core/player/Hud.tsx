import { useEffect, useId, useRef, useState } from 'react';
import { Avatar } from '../avatar/Avatar.tsx';
import { DEFAULT_LOOK, type Look } from '../avatar/looks.ts';
import { Link } from '../Link.tsx';
import { DAILY_GOAL_CHOICES, levelProgress, titleForLevel } from '../progress/economy.ts';
import { MAX_NAME_LENGTH } from '../progress/store.ts';
import { CoinIcon, FlameIcon, GearIcon, GemIcon, HourglassIcon, ShieldIcon } from './icons.tsx';
import type { SubjectInfo } from '../subject.ts';
import type { PlayerState } from './player.ts';
import type { Questlines } from './questlines.ts';
import { chestQuests, contractQuests, shieldNote, todaysQuests } from './quests.ts';
import { useCountUp } from './useCountUp.ts';
import './player.css';

export interface HudActions {
  /** Sets the daily goal; resolves false if it couldn't be saved. */
  onGoalChange: (minutes: number) => Promise<boolean>;
  /** Saves the player's name; resolves false if it couldn't be saved. */
  onNameChange: (name: string) => Promise<boolean>;
  onSignOut: () => void;
}

/**
 * The HUD from the city concept (#26): portrait, name, title, level and XP on the left; the
 * Waymark banner; gold, gems, streak and settings on the right; today's quests below them.
 */
export function Hud({
  state,
  subjects,
  questlines,
  ...actions
}: {
  state: PlayerState;
  subjects: readonly SubjectInfo[];
  questlines?: Questlines;
} & HudActions) {
  if (state.error) {
    return (
      <p className="hud__error" role="status">
        Couldn’t load your progress. Try reloading the page.
      </p>
    );
  }
  const { wallet, today, profile } = state;
  return (
    <div className="hud" aria-busy={!wallet}>
      <PlayerPlate
        xp={wallet?.xp}
        name={profile?.displayName ?? ''}
        title={profile?.title ?? ''}
        look={profile?.avatar ?? DEFAULT_LOOK}
        loaded={Boolean(wallet)}
      />
      <div className="hud__banner" aria-hidden="true">
        Waymark
      </div>
      <Purse state={state} {...actions} />
      {today && (
        <QuestTracker
          today={today}
          subjects={subjects}
          questlines={questlines}
          contracts={state.contracts}
          chests={state.chests.length}
        />
      )}
    </div>
  );
}

function PlayerPlate({
  xp,
  name,
  title,
  look,
  loaded,
}: {
  xp?: number;
  name: string;
  /** The title worn (#177); '' shows the level's title. */
  title: string;
  look: Look;
  loaded: boolean;
}) {
  const { level, into, needed } = levelProgress(xp ?? 0);
  const pct = Math.round((into / needed) * 100);
  return (
    <div className="hud__player">
      <Portrait look={look} />
      <div className="hud__plate">
        <div className="hud__who">
          {name && <span className="hud__name">{name}</span>}
          <span className="hud__title">{title || titleForLevel(level)}</span>
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

/** Head and shoulders of the player's avatar (#28). */
function Portrait({ look }: { look: Look }) {
  return (
    <div className="hud__portrait" role="img" aria-label="Your portrait">
      <Avatar look={look} view="portrait" className="hud__face" />
    </div>
  );
}

/** The two panels the purse opens: the daily goal, or the settings. */
type Panel = 'goal' | 'settings';

function Purse({ state, ...actions }: { state: PlayerState } & HudActions) {
  const { wallet, today } = state;
  const gold = useCountUp(wallet?.gold);
  const gems = useCountUp(wallet?.gems);
  const [open, setOpen] = useState<Panel | null>(null);
  const purse = useRef<HTMLDivElement>(null);
  const goalButton = useRef<HTMLButtonElement>(null);
  const gearButton = useRef<HTMLButtonElement>(null);
  const goalId = useId();
  const settingsId = useId();
  const streak = today?.streak ?? 0;
  const days = `${streak} ${streak === 1 ? 'day' : 'days'}`;
  const shields = today?.shields ?? 0;
  const held = shields ? `, ${shields} streak ${shields === 1 ? 'shield' : 'shields'}` : '';
  const toggle = (panel: Panel) => setOpen((o) => (o === panel ? null : panel));
  const close = (focusBack: boolean) => {
    if (focusBack) (open === 'goal' ? goalButton : gearButton).current?.focus();
    setOpen(null);
  };
  return (
    <div className="hud__purse" ref={purse}>
      <span className="hud__chip" aria-label={`Gold: ${wallet?.gold ?? '…'}`}>
        <CoinIcon />
        {gold?.toLocaleString('en-US') ?? '…'}
      </span>
      <span className="hud__chip" aria-label={`Gems: ${wallet?.gems ?? '…'}`}>
        <GemIcon />
        {gems?.toLocaleString('en-US') ?? '…'}
      </span>
      <span className="hud__chip" aria-label={today ? `Streak: ${days}${held}` : 'Streak: …'}>
        <FlameIcon lit={Boolean(today?.goalReached)} />
        {today ? (
          <>
            {streak}
            <span className="hud__unit"> {streak === 1 ? 'day' : 'days'}</span>
          </>
        ) : (
          '…'
        )}
        {shields > 0 && (
          <span className="hud__shields">
            <ShieldIcon />
            {shields > 1 && shields}
          </span>
        )}
      </span>
      {today && (
        <button
          ref={goalButton}
          type="button"
          className="hud__chip hud__chip--goal"
          aria-label={`Daily goal: ${today.minutes} of ${today.goalMinutes} minutes`}
          aria-expanded={open === 'goal'}
          aria-controls={goalId}
          onClick={() => toggle('goal')}
        >
          <HourglassIcon filled={today.minutes / today.goalMinutes} />
          {today.goalReached ? (
            'Goal done'
          ) : (
            <>
              {today.minutes}/{today.goalMinutes}
              <span className="hud__unit"> min</span>
            </>
          )}
        </button>
      )}
      <button
        ref={gearButton}
        type="button"
        className="hud__gear"
        aria-label="Settings"
        aria-expanded={open === 'settings'}
        aria-controls={settingsId}
        onClick={() => toggle('settings')}
      >
        <GearIcon />
      </button>
      {open === 'goal' && today && (
        <Popover id={goalId} title="Daily goal" within={purse} onClose={close}>
          <GoalPanel today={today} onGoalChange={actions.onGoalChange} />
        </Popover>
      )}
      {open === 'settings' && (
        <Popover id={settingsId} title="Settings" within={purse} onClose={close}>
          <SettingsPanel
            state={state}
            {...actions}
            onEditGoal={() => {
              setOpen('goal');
            }}
          />
        </Popover>
      )}
    </div>
  );
}

/**
 * A panel that drops from the purse: a title and a close button over its content. Escape closes
 * it and puts focus back on the button that opened it; a press anywhere outside the purse closes
 * it too. It opens with focus on its `[data-autofocus]` element.
 */
function Popover({
  id,
  title,
  within,
  onClose,
  children,
}: {
  id: string;
  title: string;
  within: React.RefObject<HTMLElement | null>;
  onClose: (focusBack: boolean) => void;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current(true);
    };
    const press = (e: PointerEvent) => {
      if (!within.current?.contains(e.target as Node)) closeRef.current(false);
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', press);
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', press);
    };
  }, [within]);
  return (
    <div className="hud__panel" id={id} ref={panel} role="group" aria-labelledby={titleId}>
      <div className="hud__panelhead">
        <h2 id={titleId} className="hud__paneltitle">
          {title}
        </h2>
        <button
          type="button"
          className="hud__close"
          aria-label={`Close ${title.toLowerCase()}`}
          onClick={() => onClose(true)}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M2 2 L12 12 M12 2 L2 12"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {children}
    </div>
  );
}

/** What each daily goal feels like, to help pick one. */
const GOAL_WORDS: Record<number, string> = {
  5: 'A taste',
  10: 'Light',
  15: 'Steady',
  20: 'Serious',
  30: 'Keen',
  45: 'Devoted',
  60: 'All in',
};

/** The daily goal: today's minutes in the hourglass, and the goals to choose from. */
function GoalPanel({
  today,
  onGoalChange,
}: {
  today: NonNullable<PlayerState['today']>;
  onGoalChange: HudActions['onGoalChange'];
}) {
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState<number | null>(null);
  const goal = today.goalMinutes;
  const choices = DAILY_GOAL_CHOICES.includes(goal as never)
    ? DAILY_GOAL_CHOICES
    : [...DAILY_GOAL_CHOICES, goal].sort((a, b) => a - b);
  const choose = async (minutes: number) => {
    if (minutes === goal || saving !== null) return;
    setStatus('');
    setSaving(minutes);
    const saved = await onGoalChange(minutes);
    setSaving(null);
    setStatus(saved ? `Saved: ${minutes} minutes a day` : 'Couldn’t save your goal. Try again.');
  };
  const left = Math.max(0, goal - today.minutes);
  return (
    <>
      <div className="hud__goaltoday">
        <HourglassIcon filled={today.minutes / goal} size={56} />
        <p>
          <strong>
            {today.minutes} of {goal} min today
          </strong>
          <span>
            {today.goalReached
              ? 'Goal reached. The daily chest is yours.'
              : `${left} more ${left === 1 ? 'minute' : 'minutes'} to open the daily chest.`}
          </span>
        </p>
      </div>
      <div className="hud__goalchoices" role="group" aria-label="Minutes a day">
        {choices.map((m) => {
          const on = saving === null ? m === goal : m === saving;
          return (
            <button
              key={m}
              type="button"
              className="hud__goalchoice"
              aria-pressed={on}
              aria-label={`${m} minutes a day`}
              aria-busy={saving === m}
              data-autofocus={m === goal ? true : undefined}
              onClick={() => void choose(m)}
            >
              <span className="hud__goalmin">{m}</span>
              <span className="hud__goalword">{GOAL_WORDS[m] ?? 'Your own'}</span>
            </button>
          );
        })}
      </div>
      <div className="hud__goalfoot">
        <p className="hud__goalnote">
          Minutes from every subject count. Reach your goal each day to open the daily chest and
          keep your streak.
        </p>
        <span className="hud__fieldstatus" role="status">
          {status}
        </span>
      </div>
    </>
  );
}

/** Settings: who you are, your daily goal (opened in its own panel), and signing out. */
function SettingsPanel({
  state,
  onNameChange,
  onSignOut,
  onEditGoal,
}: { state: PlayerState; onEditGoal: () => void } & HudActions) {
  return (
    <>
      <section className="hud__section" aria-label="Profile">
        <NameField name={state.profile?.displayName ?? ''} onNameChange={onNameChange} />
      </section>
      {state.today && (
        <section className="hud__section hud__goalrow" aria-label="Daily goal">
          <span className="hud__rowlabel">Daily goal</span>
          <span className="hud__rowvalue">{state.today.goalMinutes} minutes a day</span>
          <button type="button" className="hud__textbutton" onClick={onEditGoal}>
            Change
          </button>
        </section>
      )}
      <section className="hud__section" aria-label="Account">
        <button type="button" className="hud__signout" onClick={onSignOut}>
          Sign out
        </button>
      </section>
    </>
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
    setStatus((await onNameChange(draft)) ? 'Saved' : 'Couldn’t save your name. Try again.');
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
          data-autofocus
          onChange={(e) => {
            setDraft(e.target.value);
            setStatus('');
          }}
          onBlur={() => void save()}
        />
      </label>
      <span className="hud__fieldhint">Shown beside your portrait.</span>
      <span className="hud__fieldstatus" role="status">
        {status}
      </span>
    </form>
  );
}

/** Today's quests and the daily goal bar, in the HUD and on the Notice Board. */
export function QuestTracker({
  today,
  subjects,
  questlines,
  contracts = null,
  chests = 0,
  full = false,
}: {
  today: NonNullable<PlayerState['today']>;
  subjects: readonly SubjectInfo[];
  /** Started questlines, shown in place of their subjects' plain lines (#47). */
  questlines?: Questlines;
  /** Today's contracts (#46). */
  contracts?: PlayerState['contracts'];
  /** Chests waiting to be opened; the board shows them on its shelf instead. */
  chests?: number;
  /** On the Notice Board: every contract, not just how many are done. */
  full?: boolean;
}) {
  const shown = Math.min(today.minutes, today.goalMinutes);
  const note = shieldNote(today);
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
      {note && (
        <p className="hud__shieldnote">
          <ShieldIcon />
          {note}
        </p>
      )}
      <ul className="hud__questlist">
        {[
          ...todaysQuests(subjects, today.goalMinutes, questlines),
          ...contractQuests(subjects, contracts, full),
          ...(full ? [] : chestQuests(chests)),
        ].map((q) => (
          <li key={q.key ?? q.giver}>
            <Link
              className={`hud__quest${q.done ? ' is-done' : ''}`}
              href={q.href}
              style={{ borderLeftColor: q.color }}
            >
              <span className="hud__questgiver" style={{ color: q.color }}>
                {q.giver}
              </span>
              <span className="hud__questtext">
                {q.text}
                {q.script && (
                  <>
                    {' '}
                    <span lang={q.script.lang} dir={q.script.dir} className="hud__questscript">
                      {q.script.text}
                    </span>
                  </>
                )}
              </span>
              {q.progress && <span className="hud__questprogress">{q.progress}</span>}
              {q.reward && <span className="hud__questreward">{q.reward}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
