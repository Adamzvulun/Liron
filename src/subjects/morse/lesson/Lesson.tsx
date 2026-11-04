import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { MORSE_CHARS } from '../code.ts';
import { MorsePlayer } from '../player.ts';
import { schedule } from '../timing.ts';
import { buildRun, GROUP_SIZE, RUN_SECONDS } from './build.ts';
import {
  applyRun,
  pendingTrial,
  CHAR_WPM,
  isWarmup,
  newestChar,
  nextChar,
  parseProgress,
  reportRun,
  toMeet as charsToMeet,
  unlockedChars,
  weightsFor,
  type MorseProgress,
} from './progress.ts';
import { GATE_RUNS, scoreCopy, type RunScore } from './score.ts';
import './lesson.css';

// The Koch receive lesson (#31): meet each new character, copy two-minute runs, and light the
// next lamp after two runs in a row at 90% (docs/game/morse-lessons.md, ADR 0028). Progress is
// the Morse subject's saved state; every run feeds spaced repetition, the receive rating and XP.

const MEET_TRIALS = 10;
const KOCH = MORSE_CHARS.map((c) => c.char);

type Stage =
  | { kind: 'start' }
  | { kind: 'meet'; char: string; step: 'listen' | 'drill' }
  | { kind: 'run'; warmup: boolean }
  | { kind: 'result'; score: RunScore; passed: boolean; warmup: boolean };

/** `?run=short` makes a run 8 seconds instead of 2 minutes (for tests). */
const runSeconds = () =>
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('run') === 'short'
    ? 8
    : RUN_SECONDS;

export function KochLesson({ api }: { api: SubjectApi }) {
  const player = useMemo(() => new MorsePlayer(), []);
  useEffect(() => () => player.stop(), [player]);
  const [seconds] = useState(runSeconds);

  const [progress, setProgress] = useState<MorseProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [due, setDue] = useState<Set<string>>(new Set());
  const [stage, setStage] = useState<Stage>({ kind: 'start' });

  useEffect(() => {
    let live = true;
    Promise.all([api.loadState(), api.dueItems({ limit: 100 })])
      .then(([state, dueItems]) => {
        if (!live) return;
        setProgress(parseProgress(state));
        setDue(new Set(dueItems.map((d) => d.itemId.replace(/^char:/, ''))));
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [api]);

  if (failed) {
    return (
      <p className="lesson__card">
        The tower’s records couldn’t be read. Check your connection and reload the page.
      </p>
    );
  }
  if (!progress) return <p className="lesson__loading">Lighting the lamps…</p>;

  const unlocked = unlockedChars(progress);
  const newest = newestChar(progress);
  const lessonNo = progress.unlocked - 1;
  const meeting = charsToMeet(progress);
  const speed = { charWpm: CHAR_WPM, effWpm: progress.effWpm };

  const save = (next: MorseProgress) => {
    setProgress(next);
    api.saveState(next).catch(() => setSaveFailed(true));
  };

  const startRun = () => setStage({ kind: 'run', warmup: isWarmup(progress, new Date()) });

  const begin = () => {
    void player.unlock();
    const first = meeting[0];
    if (first) setStage({ kind: 'meet', char: first, step: 'listen' });
    else startRun();
  };

  const doneMeeting = (char: string) => {
    const next = { ...progress, met: [...progress.met, char] };
    save(next);
    const another = charsToMeet(next)[0];
    if (another) setStage({ kind: 'meet', char: another, step: 'listen' });
    else startRun();
  };

  const finishRun = (score: RunScore, warmup: boolean) => {
    const at = new Date();
    const { next, unlockedNow } = applyRun(progress, score, at, warmup);
    setProgress(next);
    setStage({ kind: 'result', score, passed: unlockedNow, warmup });
    reportRun(api, next, score, unlockedNow, seconds, at).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
    setDue((d) => new Set([...d].filter((c) => !score.byChar.has(c))));
  };

  return (
    <section className="lesson" aria-label={`Koch lesson ${lessonNo}`}>
      <header className="lesson__top">
        <span className="lesson__badge">Lesson {lessonNo}</span>
        <span className="lesson__letters" aria-label="Letters you have">
          {unlocked.map((c) => (
            <span key={c} className={c === newest ? 'is-new' : undefined}>
              {c}
            </span>
          ))}
        </span>
        <span className="lesson__speed">
          {CHAR_WPM} wpm letters · {progress.effWpm} wpm overall
        </span>
      </header>
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your last run couldn’t be saved. It will be kept with the next one that saves.
        </p>
      )}

      {stage.kind === 'start' && (
        <StartCard
          lessonNo={lessonNo}
          newChars={meeting.length ? meeting : newest ? [newest] : unlocked}
          gateDone={trailingPasses(progress.recent)}
          warmup={isWarmup(progress, new Date())}
          onBegin={begin}
        />
      )}
      {stage.kind === 'meet' && (
        <Meet
          key={stage.char + stage.step}
          char={stage.char}
          step={stage.step}
          known={unlocked.filter((c) => c !== stage.char)}
          player={player}
          onListened={() => setStage({ ...stage, step: 'drill' })}
          onDone={() => doneMeeting(stage.char)}
        />
      )}
      {stage.kind === 'run' && (
        <Run
          unlocked={unlocked}
          newChar={stage.warmup ? undefined : newest}
          weights={weightsFor(progress, due)}
          speed={speed}
          seconds={seconds}
          player={player}
          onDone={(score) => finishRun(score, stage.warmup)}
        />
      )}
      {stage.kind === 'result' && (
        <Result
          score={stage.score}
          passed={stage.passed}
          warmup={stage.warmup}
          runsAtGate={stage.passed ? GATE_RUNS : trailingPasses(progress.recent)}
          trialName={pendingTrial(progress)?.trial.name}
          nextChar={stage.passed ? unlocked[unlocked.length - 1] : nextChar(progress)}
          player={player}
          onAgain={startRun}
          onUnlock={() => setStage({ kind: 'start' })}
        />
      )}
    </section>
  );
}

/** How many of the latest runs in a row were at 90% or better. */
function trailingPasses(history: readonly number[]): number {
  let n = 0;
  for (let i = history.length - 1; i >= 0 && (history[i] ?? 0) >= 0.9; i--) n++;
  return n;
}

function StartCard({
  lessonNo,
  newChars,
  gateDone,
  warmup,
  onBegin,
}: {
  lessonNo: number;
  newChars: string[];
  gateDone: number;
  warmup: boolean;
  onBegin: () => void;
}) {
  return (
    <div className="lesson__card lesson__start">
      <div className="lesson__lamps" aria-hidden="true">
        {newChars.map((c) => (
          <span key={c} className="lesson__lamp lesson__lamp--small">
            {c}
          </span>
        ))}
      </div>
      <h2 className="lesson__title">
        {lessonNo === 1 ? 'Hear K and M' : `Add ${newChars.join(' and ')}`}
      </h2>
      <p>
        Characters play at full speed. Type or tap each one as you hear it. Two runs in a row at 90%
        light the next lamp.
      </p>
      {warmup ? (
        <p className="lesson__note">Welcome back. The first run is a warm-up for your ear.</p>
      ) : (
        gateDone > 0 && <p className="lesson__note">1 of 2 runs done. One more at 90%.</p>
      )}
      <button type="button" className="lesson__go" onClick={onBegin}>
        Begin
      </button>
    </div>
  );
}

/** Meet a new character: hear it with its letter, then tell it apart from ones you know. */
function Meet({
  char,
  step,
  known,
  player,
  onListened,
  onDone,
}: {
  char: string;
  step: 'listen' | 'drill';
  known: string[];
  player: MorsePlayer;
  onListened: () => void;
  onDone: () => void;
}) {
  const hear = useCallback(
    (text: string) => player.play(text, { charWpm: CHAR_WPM, effWpm: 8 }),
    [player],
  );
  useEffect(() => {
    if (step === 'listen') void hear(`${char} ${char} ${char}`);
  }, [step, char, hear]);

  if (step === 'listen') {
    return (
      <div className="lesson__card lesson__meet">
        <p className="lesson__kicker">New sound</p>
        <span className="lesson__lamp" aria-live="polite">
          {char}
        </span>
        <p>This is {char}. Listen to its rhythm, don’t count it.</p>
        <div className="lesson__actions">
          <button type="button" className="lesson__plain" onClick={() => void hear(char)}>
            Hear it again
          </button>
          <button type="button" className="lesson__go" onClick={onListened}>
            I’ve got it
          </button>
        </div>
      </div>
    );
  }
  return <Drill char={char} known={known} hear={hear} onDone={onDone} />;
}

function Drill({
  char,
  known,
  hear,
  onDone,
}: {
  char: string;
  known: string[];
  hear: (text: string) => Promise<unknown>;
  onDone: () => void;
}) {
  const choices = useMemo(() => [char, ...known.slice(-2)].sort(), [char, known]);
  const [trial, setTrial] = useState(0);
  const [answer, setAnswer] = useState(() => pickTarget(char, choices));
  const [feedback, setFeedback] = useState<'right' | 'wrong' | null>(null);

  useEffect(() => {
    void hear(answer);
  }, [answer, trial, hear]);

  const choose = (c: string) => {
    if (feedback) return;
    const right = c === answer;
    setFeedback(right ? 'right' : 'wrong');
    window.setTimeout(
      () => {
        setFeedback(null);
        if (trial + 1 >= MEET_TRIALS) return onDone();
        setTrial((t) => t + 1);
        setAnswer(pickTarget(char, choices));
      },
      right ? 500 : 1200,
    );
    if (!right) void hear(answer);
  };

  return (
    <div className="lesson__card lesson__meet">
      <p className="lesson__kicker">
        Which one was it? {trial + 1} / {MEET_TRIALS}
      </p>
      <div className="lesson__choices">
        {choices.map((c) => (
          <button
            key={c}
            type="button"
            className={`lesson__choice${feedback && c === answer ? ` is-${feedback === 'right' ? 'right' : 'answer'}` : ''}`}
            onClick={() => choose(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <button type="button" className="lesson__plain" onClick={() => void hear(answer)}>
        Play again
      </button>
    </div>
  );
}

function pickTarget(newChar: string, choices: string[]): string {
  // The new one half the time, so it gets the practice.
  if (Math.random() < 0.5) return newChar;
  const others = choices.filter((c) => c !== newChar);
  return others[Math.floor(Math.random() * others.length)] ?? newChar;
}

/** One copy run: groups play, you type or tap what you hear. */
export function Run({
  unlocked,
  newChar,
  weights,
  speed,
  seconds,
  count,
  player,
  onDone,
}: {
  unlocked: string[];
  newChar?: string;
  weights: ReadonlyMap<string, number>;
  speed: { charWpm: number; effWpm: number };
  seconds: number;
  /** A fixed number of characters instead of a length in time (trials). */
  count?: number;
  player: MorsePlayer;
  onDone: (score: RunScore) => void;
}) {
  const plan = useMemo(
    () => buildRun(unlocked, speed, { newChar, weights, seconds, count }),
    // A new run each time the component mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const total = useMemo(() => schedule(plan.groups.join(' '), speed).duration, [plan, speed]);
  const [copied, setCopied] = useState<string[]>([]);
  const copiedRef = useRef<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);

  const add = useCallback((c: string) => {
    copiedRef.current = c === '⌫' ? copiedRef.current.slice(0, -1) : [...copiedRef.current, c];
    setCopied(copiedRef.current);
  }, []);

  useEffect(() => {
    let stopped = false;
    let frame = 0;
    const started = performance.now();
    const tick = () => {
      setProgress(Math.min(1, (performance.now() - started) / 1000 / total));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    void player.play(plan.groups.join(' '), speed).then((pb) =>
      pb.done.then(() => {
        cancelAnimationFrame(frame);
        if (stopped) return;
        setPlaying(false);
        // A moment to type the last character.
        window.setTimeout(() => onDone(scoreCopy(plan.chars, copiedRef.current)), 1200);
      }),
    );
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      player.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toUpperCase();
      if (unlocked.includes(k)) add(k);
      else if (e.key === ' ') add('?');
      else if (e.key === 'Backspace') add('⌫');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [unlocked, add]);

  const groups: string[] = [];
  for (let i = 0; i < copied.length; i += GROUP_SIZE)
    groups.push(copied.slice(i, i + GROUP_SIZE).join(''));

  return (
    <div className="lesson__run">
      <div className="lesson__card lesson__copy">
        <div
          className="lesson__progress"
          role="progressbar"
          aria-label="Run"
          aria-valuenow={Math.round(progress * 100)}
        >
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="lesson__kicker">
          {playing ? 'Listening… copy what you hear' : 'Run finished'}
        </p>
        <div className="lesson__copied" aria-live="off" data-testid="copied">
          {groups.length ? (
            groups.map((g, i) => <span key={i}>{g}</span>)
          ) : (
            <span className="lesson__hint">Your copy appears here</span>
          )}
        </div>
        <p className="lesson__keys">
          On a keyboard: type the letters · space skips one · backspace fixes
        </p>
      </div>
      <div className="lesson__pad" aria-label="Letter keys">
        {unlocked.map((c) => (
          <button key={c} type="button" className="lesson__key" onClick={() => add(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="lesson__aux">
        <button
          type="button"
          className="lesson__key lesson__key--aux"
          onClick={() => add('?')}
          aria-label="Skip one"
        >
          ?
        </button>
        <button
          type="button"
          className="lesson__key lesson__key--aux"
          onClick={() => add('⌫')}
          aria-label="Delete"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}

function Result({
  score,
  passed,
  warmup,
  trialName,
  runsAtGate,
  nextChar,
  player,
  onAgain,
  onUnlock,
}: {
  score: RunScore;
  passed: boolean;
  warmup: boolean;
  /** The chapter's trial, if it holds the gate now. */
  trialName?: string;
  runsAtGate: number;
  nextChar?: string;
  player: MorsePlayer;
  onAgain: () => void;
  onUnlock: () => void;
}) {
  const pct = Math.round(score.accuracy * 100);
  const groups: RunScore['results'][] = [];
  for (let i = 0; i < score.results.length; i += GROUP_SIZE)
    groups.push(score.results.slice(i, i + GROUP_SIZE));
  const hear = (c: string) => void player.play(c, { charWpm: CHAR_WPM });
  const letters = [...score.byChar.entries()].sort(
    (a, b) => KOCH.indexOf(a[0]) - KOCH.indexOf(b[0]),
  );

  return (
    <div className="lesson__result">
      <div className="lesson__card lesson__score">
        <p className={`lesson__pct${score.accuracy >= 0.9 ? ' is-good' : ''}`}>{pct}%</p>
        <p className="lesson__kicker">
          {score.right} of {score.played} right
          {score.extra > 0 ? ` · ${score.extra} extra` : ''}
        </p>
        <div className="lesson__gate" aria-label={`${runsAtGate} of ${GATE_RUNS} runs at 90%`}>
          {Array.from({ length: GATE_RUNS }, (_, i) => (
            <span key={i} className={i < runsAtGate ? 'is-lit' : undefined} />
          ))}
        </div>
        {passed ? (
          <>
            <p className="lesson__title">
              {nextChar ? `Two in a row! ${nextChar} is next.` : 'Every letter is lit!'}
            </p>
            {nextChar && (
              <button type="button" className="lesson__go" onClick={onUnlock}>
                Meet {nextChar}
              </button>
            )}
          </>
        ) : (
          <>
            <p>
              {trialName
                ? `Every lamp of this chapter is lit. ${trialName} waits in the tower hall; these runs keep your ear sharp.`
                : warmup
                  ? 'Warm-up done. Now the runs count towards the next lamp.'
                  : !nextChar
                    ? 'Every letter is lit. Keep your ear sharp.'
                    : score.accuracy >= 0.9
                      ? 'One more run at 90% lights the next lamp.'
                      : 'Keep going: two runs in a row at 90% light the next lamp.'}
            </p>
            <button type="button" className="lesson__go" onClick={onAgain}>
              Next run
            </button>
          </>
        )}
      </div>

      <div className="lesson__card lesson__review">
        <h3 className="lesson__subtitle">What played · what you copied</h3>
        <p className="lesson__keys">Tap a red letter to hear it again.</p>
        <div className="lesson__groups">
          {groups.map((g, i) => (
            <span key={i} className="lesson__group">
              {g.map((r, j) =>
                r.right ? (
                  <span key={j} className="lesson__cell">
                    {r.char}
                  </span>
                ) : (
                  <button
                    key={j}
                    type="button"
                    className="lesson__cell is-miss"
                    onClick={() => hear(r.char)}
                    aria-label={`${r.char}, you copied ${r.copied || 'nothing'}. Hear ${r.char}`}
                  >
                    {r.char}
                    <small>{r.copied || '–'}</small>
                  </button>
                ),
              )}
            </span>
          ))}
        </div>
        <h3 className="lesson__subtitle">Each letter</h3>
        <ul className="lesson__bars">
          {letters.map(([c, t]) => (
            <li key={c}>
              <span className="lesson__bar-char">{c}</span>
              <span className="lesson__bar">
                <span style={{ width: `${(t.right / t.played) * 100}%` }} />
              </span>
              <span className="lesson__bar-pct">{Math.round((t.right / t.played) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
