import { Xp } from '../../../core/player/Xp.tsx';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { MorsePlayer } from '../player.ts';
import { CHAR_WPM, parseProgress, unlockedChars, type MorseProgress } from '../lesson/progress.ts';
import { openWords, written, type MorseWord } from '../words.ts';
import {
  applyWords,
  isRight,
  pickRound,
  reportWords,
  ROUND_WORDS,
  scoreOf,
  wordsOpen,
  xpForWords,
  type WordAttempt,
} from './drill.ts';
import { Rush, RushSummaryCard } from './Rush.tsx';
import { MORSE_CHARS } from '../code.ts';
import {
  applyWatch,
  reportWatch,
  WATCH_PASS,
  WATCH_WORDS,
  WATCH_WPM,
  WATCH_XP,
  watchOpen,
  watchPassed,
  watchResult,
  watchWords,
  type WatchResult,
} from './nightWatch.ts';
import {
  applyRush,
  reportRush,
  rushOpen,
  RUSH_START_WPM,
  summarizeRush,
  type RushCall,
} from './rush.ts';
import '../lesson/lesson.css';
import './words.css';
import { NextStep } from '../../../core/road/NextStep.tsx';
import { ChallengeOffer } from '../../../core/fellowship/ChallengeOffer.tsx';
import type { ScoredRound } from '../../../core/fellowship/challenges.ts';

// The Codebook (#154): head copy of whole words. A word plays once; you type it when the sound
// has ended. AGN plays it again, once, for half credit. Q-codes, abbreviations and prosigns show
// their meaning after you answer. Design: docs/game/morse-words.md.

const shortRun = () =>
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('run') === 'short';
/** `?run=short` makes a round 3 words, and the Night Watch too (for tests). */
const roundSize = () => (shortRun() ? 3 : ROUND_WORDS);
const watchSize = () => (shortRun() ? 3 : WATCH_WORDS);

const KIND_LABEL: Record<MorseWord['kind'], string> = {
  word: 'Word',
  'q-code': 'Q-code',
  abbreviation: 'Abbreviation',
  prosign: 'Prosign',
};

interface Round {
  words: MorseWord[];
  progress: MorseProgress;
  /** The Night Watch (#179): a full 20 wpm and no AGN. */
  watch?: boolean;
}

export function WordDrill({
  api,
  start: opening,
}: {
  api: SubjectApi;
  /** Open on the Night Watch's door, or straight into a rush (a challenge taken on, task 3.4). */
  start?: 'watch' | 'rush';
}) {
  const [progress, setProgress] = useState<MorseProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [round, setRound] = useState<Round | null>(null);
  const [result, setResult] = useState<WordAttempt[] | null>(null);
  const [starting, setStarting] = useState(false);
  const [rushing, setRushing] = useState(opening === 'rush');
  /** The last round as scored for challenges (task 3.4); null until it's recorded. */
  const [scored, setScored] = useState<ScoredRound | null>(null);
  const [rushResult, setRushResult] = useState<{ calls: RushCall[]; bestBefore: number } | null>(
    null,
  );
  const [watchIntro, setWatchIntro] = useState(opening === 'watch');
  const [watchDone, setWatchDone] = useState<{
    attempts: WordAttempt[];
    result: WatchResult;
    xp: number;
  } | null>(null);
  const latest = useRef<MorseProgress | null>(null);

  useEffect(() => {
    let live = true;
    api.loadState().then(
      (s) => {
        if (!live) return;
        const p = parseProgress(s);
        latest.current = p;
        setProgress(p);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [api]);

  const start = useCallback(async () => {
    const p = latest.current;
    if (!p) return;
    setStarting(true);
    const open = openWords(unlockedChars(p));
    const ids = open.map((w) => w.id);
    // Without the review records, a round still works: it just treats every word as new.
    const [due, status] = await Promise.all([
      api.dueItems({ limit: 100 }).catch(() => []),
      api.reviewStatus(ids).catch(() => new Map()),
    ]);
    setStarting(false);
    setResult(null);
    setRushResult(null);
    setRound({
      progress: p,
      words: pickRound(
        open,
        due.map((d) => d.itemId),
        new Set(status.keys()),
        Math.random,
        roundSize(),
      ),
    });
  }, [api]);

  const finish = useCallback(
    (attempts: WordAttempt[], seconds: number) => {
      const before = latest.current;
      if (!before) return;
      const next = applyWords(before, attempts);
      latest.current = next;
      setProgress(next);
      setRound(null);
      setResult(attempts);
      setScored(null);
      reportWords(api, next, attempts, seconds).then(
        (round) => {
          setSaveFailed(false);
          setScored(round);
        },
        () => setSaveFailed(true),
      );
    },
    [api],
  );

  const beginWatch = useCallback(() => {
    const p = latest.current;
    if (!p) return;
    setWatchIntro(false);
    setWatchDone(null);
    setResult(null);
    setRushResult(null);
    setRound({ progress: p, words: watchWords(Math.random, watchSize()), watch: true });
  }, []);

  const finishWatch = useCallback(
    (attempts: WordAttempt[], seconds: number) => {
      const before = latest.current;
      if (!before) return;
      const result = watchResult(attempts);
      const first = result.passed && !watchPassed(before);
      const next = applyWatch(before, result);
      setRound(null);
      setWatchDone({ attempts, result, xp: first ? WATCH_XP.pass : WATCH_XP.try });
      // The pass is kept only once it is saved: a retry after a failed save must still send the
      // rank trial's event, or its gear would never come.
      reportWatch(api, before, next, result, seconds).then(
        () => {
          latest.current = next;
          setProgress(next);
          setSaveFailed(false);
        },
        () => setSaveFailed(true),
      );
    },
    [api],
  );

  const startRush = useCallback(() => {
    setResult(null);
    setRushResult(null);
    setRushing(true);
  }, []);

  const finishRush = useCallback(
    (calls: RushCall[], seconds: number) => {
      const before = latest.current;
      if (!before) return;
      const next = applyRush(before, summarizeRush(calls));
      latest.current = next;
      setProgress(next);
      setRushing(false);
      setRushResult({ calls, bestBefore: before.rush.best });
      setScored(null);
      reportRush(api, next, calls, before.rush.best, CHAR_WPM, seconds).then(
        (round) => {
          setSaveFailed(false);
          setScored(round);
        },
        () => setSaveFailed(true),
      );
    },
    [api],
  );

  if (failed) {
    return (
      <p className="lesson__card">
        The tower’s records couldn’t be read. Check your connection and reload the page.
      </p>
    );
  }
  if (!progress) return <p className="lesson__loading">Opening the codebook…</p>;

  const open = openWords(unlockedChars(progress));

  return (
    <section className="lesson words" aria-label="The Codebook">
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your last round couldn’t be saved. Your next round will try again.
        </p>
      )}
      {round ? (
        <Copy round={round} onDone={round.watch ? finishWatch : finish} />
      ) : watchIntro ? (
        <WatchIntro
          ready={watchOpen(progress, MORSE_CHARS.length)}
          passed={watchPassed(progress)}
          onBegin={beginWatch}
          onPractice={() => setWatchIntro(false)}
        />
      ) : watchDone ? (
        <WatchResultCard
          {...watchDone}
          onAgain={beginWatch}
          onPractice={() => setWatchDone(null)}
        />
      ) : rushing && rushOpen(unlockedChars(progress)) ? (
        <Rush progress={progress} onDone={finishRush} />
      ) : rushResult ? (
        <RushSummaryCard
          calls={rushResult.calls}
          best={progress.rush.best}
          isBest={summarizeRush(rushResult.calls).score > rushResult.bestBefore}
          onAgain={startRush}
        >
          {scored && <ChallengeOffer rounds={api.rounds} round={scored} />}
        </RushSummaryCard>
      ) : result ? (
        <Summary attempts={result} onAgain={() => void start()}>
          {scored && <ChallengeOffer rounds={api.rounds} round={scored} />}
        </Summary>
      ) : (
        <div className="lesson__card lesson__start">
          <span className="lesson__lamp lesson__lamp--small" aria-hidden="true">
            📖
          </span>
          <h2 className="lesson__title">The Codebook</h2>
          {wordsOpen(progress) ? (
            <>
              <p>
                Operators hear whole words, not letters. A word plays once. When the sound ends,
                type it. Ask for <strong>AGN</strong> to hear it again, for half credit.
              </p>
              <p className="lesson__note">
                {open.length} words open · a round is 10 words
                {progress.words.best > 0 && ` · your best: ${progress.words.best} of 10`}
              </p>
              <button
                type="button"
                className="lesson__go"
                onClick={() => void start()}
                disabled={starting}
              >
                {starting ? 'Opening…' : 'Start a round'}
              </button>
              {watchOpen(progress, MORSE_CHARS.length) && (
                <button type="button" className="lesson__plain" onClick={() => setWatchIntro(true)}>
                  {watchPassed(progress) ? 'The Night Watch · passed' : 'Trial · The Night Watch'}
                </button>
              )}
              <h3 className="words__subtitle">Callsign rush</h3>
              {rushOpen(unlockedChars(progress)) ? (
                <>
                  <p>
                    Made-up callsigns, from {RUSH_START_WPM} wpm. Each one you copy makes the next
                    faster; a miss slows it down.
                    {progress.rush.best > 0 &&
                      ` Your best: ${progress.rush.best}, fastest ${progress.rush.topWpm} wpm.`}
                  </p>
                  <button type="button" className="lesson__plain" onClick={startRush}>
                    Start the rush
                  </button>
                </>
              ) : (
                <p className="lesson__note">
                  Opens with your first digit (5, in chapter 3): every callsign has one.
                </p>
              )}
            </>
          ) : (
            <p>The codebook is locked. Pass the Gatekeeper, chapter I’s trial, to open it.</p>
          )}
        </div>
      )}
    </section>
  );
}

type Step = 'listening' | 'typing' | 'answered';

function Copy({
  round,
  onDone,
}: {
  round: Round;
  onDone: (attempts: WordAttempt[], seconds: number) => void;
}) {
  const { words, progress, watch } = round;
  const effWpm = watch ? WATCH_WPM : progress.effWpm;
  const keys = unlockedChars(progress).filter((c) => /^[A-Z0-9]$/.test(c));
  const [n, setN] = useState(0);
  const [step, setStep] = useState<Step>('listening');
  const [typed, setTyped] = useState('');
  const [again, setAgain] = useState(false);
  const [attempts, setAttempts] = useState<WordAttempt[]>([]);
  const player = useRef<MorsePlayer | null>(null);
  const started = useRef(0);
  /** Counts plays, so only the latest one's end lets you type. */
  const plays = useRef(0);
  const word = words[n];

  /** Plays a word; the caller has set the step to 'listening'. */
  const play = useCallback(
    async (w: MorseWord) => {
      const p = (player.current ??= new MorsePlayer());
      const id = ++plays.current;
      const pb = await p.play(written(w), { charWpm: CHAR_WPM, effWpm });
      await pb.done;
      if (id === plays.current) setStep((s) => (s === 'listening' ? 'typing' : s));
    },
    [effWpm],
  );

  useEffect(() => {
    if (word) void play(word);
  }, [word, play]);

  useEffect(() => {
    started.current = performance.now();
    return () => player.current?.close();
  }, []);

  const submit = useCallback(() => {
    if (!word || step !== 'typing' || !typed) return;
    setAttempts((a) => [...a, { word, typed, again }]);
    setStep('answered');
  }, [word, step, typed, again]);

  const next = useCallback(() => {
    if (n + 1 >= words.length) {
      onDone(attempts, (performance.now() - started.current) / 1000);
      return;
    }
    setN(n + 1);
    setStep('listening');
    setTyped('');
    setAgain(false);
  }, [n, words.length, attempts, onDone]);

  const repeat = useCallback(() => {
    if (!word || again || watch || step === 'answered') return;
    setAgain(true);
    setTyped('');
    setStep('listening');
    void play(word);
  }, [word, again, watch, step, play]);

  const press = useCallback(
    (k: string) => {
      if (step === 'answered') {
        if (k === 'Enter') next();
        return;
      }
      if (step !== 'typing') return;
      if (k === 'Enter') submit();
      else if (k === '⌫') setTyped((t) => t.slice(0, -1));
      else if (keys.includes(k)) setTyped((t) => (t.length < 12 ? t + k : t));
    },
    [step, next, submit, keys],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Enter on a focused button presses it, except a letter key: after tapping letters, Enter
      // answers rather than typing the last one again (review, 2026-11-15).
      if (
        e.target instanceof HTMLButtonElement &&
        e.key === 'Enter' &&
        !e.target.closest('.lesson__pad')
      ) {
        return;
      }
      const k = e.key === 'Backspace' ? '⌫' : e.key === 'Enter' ? 'Enter' : e.key.toUpperCase();
      if (k !== '⌫' && k !== 'Enter' && !keys.includes(k)) return;
      e.preventDefault();
      press(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, keys]);

  if (!word) return null;
  const last = attempts[attempts.length - 1];
  const answered = step === 'answered' && last;

  return (
    <div className="lesson__run">
      <div className="lesson__card lesson__copy">
        <p className="lesson__kicker">
          {watch && 'The Night Watch · '}
          Word {n + 1} of {words.length}
          {step === 'listening' && ' · listening…'}
          {step === 'typing' && ' · type what you heard'}
        </p>
        {answered ? (
          <div className={`words__answer ${isRight(last) ? 'is-right' : 'is-wrong'}`}>
            <p className="words__played">{written(word)}</p>
            <p className="words__verdict">
              {isRight(last)
                ? scoreOf(last) < 1
                  ? 'Right, on the second hearing.'
                  : 'Right.'
                : `You copied ${last.typed || 'nothing'}.`}
            </p>
            {word.meaning && (
              <p className="words__meaning">
                <span>{KIND_LABEL[word.kind]}</span> {word.meaning}
              </p>
            )}
          </div>
        ) : (
          <div className="lesson__copied words__typed" aria-live="off" data-testid="copied">
            {typed ? (
              <span>{typed}</span>
            ) : (
              <span className="lesson__hint">
                {step === 'listening' ? 'Listen to the whole word…' : 'Your copy appears here'}
              </span>
            )}
          </div>
        )}
        <p className="lesson__keys">On a keyboard: type the word · Enter to answer</p>
      </div>
      {answered ? (
        <div className="lesson__actions">
          <button type="button" className="lesson__go" onClick={next}>
            {n + 1 >= words.length ? (watch ? 'End the watch' : 'See the round') : 'Next word'}
          </button>
        </div>
      ) : (
        <>
          <div className="lesson__pad" aria-label="Letter keys">
            {keys.map((c) => (
              <button
                key={c}
                type="button"
                className="lesson__key"
                onClick={() => press(c)}
                disabled={step !== 'typing'}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="lesson__aux">
            {!watch && (
              <button
                type="button"
                className="lesson__key lesson__key--aux words__agn"
                onClick={repeat}
                disabled={again || step === 'listening'}
                aria-label="AGN: hear it again"
              >
                AGN
              </button>
            )}
            <button
              type="button"
              className="lesson__key lesson__key--aux"
              onClick={() => press('⌫')}
              disabled={step !== 'typing'}
              aria-label="Delete"
            >
              ⌫
            </button>
            <button
              type="button"
              className="lesson__key lesson__key--aux words__send"
              onClick={submit}
              disabled={step !== 'typing' || !typed}
            >
              Answer
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Summary({
  attempts,
  onAgain,
  children,
}: {
  attempts: WordAttempt[];
  onAgain: () => void;
  children?: ReactNode;
}) {
  const right = attempts.filter(isRight).length;
  return (
    <div className="lesson__card words__result">
      <p className="lesson__kicker">Round finished</p>
      <p className="lesson__score">
        {right} of {attempts.length} words · <Xp>{xpForWords(attempts)}</Xp>
      </p>
      <ul className="words__list">
        {attempts.map((a, i) => (
          <li key={i} className={isRight(a) ? 'is-right' : 'is-wrong'}>
            <strong>{written(a.word)}</strong>
            {!isRight(a) && <span> you copied {a.typed}</span>}
            {isRight(a) && a.again && <span> after AGN</span>}
            {a.word.meaning && <small>{a.word.meaning}</small>}
          </li>
        ))}
      </ul>
      {children}
      <div className="lesson__actions">
        <NextStep onHere={onAgain} />
        <button type="button" className="lesson__go" onClick={onAgain}>
          Another round
        </button>
      </div>
    </div>
  );
}

/** The Night Watch's door (#179): what it asks, before you face it. */
function WatchIntro({
  ready,
  passed,
  onBegin,
  onPractice,
}: {
  ready: boolean;
  passed: boolean;
  onBegin: () => void;
  onPractice: () => void;
}) {
  return (
    <div className="lesson__card lesson__start">
      <p className="lesson__kicker">Trial · the Telegraphist’s rank</p>
      <h2 className="lesson__title">The Night Watch</h2>
      <p>
        All night the wire talks, and the watch copies it in their head. {WATCH_WORDS} common words
        at a full {WATCH_WPM} wpm, each heard once. There is no AGN on the night wire. Copy{' '}
        {WATCH_PASS} of them.
      </p>
      {passed && <p className="lesson__note">Passed. You can keep the watch again for practice.</p>}
      {ready ? (
        <button type="button" className="lesson__go" onClick={onBegin}>
          Keep the watch
        </button>
      ) : (
        <p className="lesson__note">
          Opens once you’ve learned all {MORSE_CHARS.length} characters.
        </p>
      )}
      <div className="lesson__actions">
        <button type="button" className="lesson__plain" onClick={onPractice}>
          Practice in the Codebook
        </button>
      </div>
    </div>
  );
}

function WatchResultCard({
  attempts,
  result,
  xp,
  onAgain,
  onPractice,
}: {
  attempts: WordAttempt[];
  result: WatchResult;
  xp: number;
  onAgain: () => void;
  onPractice: () => void;
}) {
  return (
    <div className="lesson__card words__result">
      <p className={`lesson__pct${result.passed ? ' is-good' : ''}`}>
        {result.right} / {result.total}
      </p>
      <p className="lesson__kicker">words copied · {WATCH_WPM} wpm</p>
      <h2 className="lesson__title">
        {result.passed
          ? 'Dawn, and nothing missed'
          : `The watch needs ${WATCH_PASS} of ${WATCH_WORDS}`}
      </h2>
      <ul className="words__list">
        {attempts.map((a, i) => (
          <li key={i} className={isRight(a) ? 'is-right' : 'is-wrong'}>
            <strong>{written(a.word)}</strong>
            {!isRight(a) && <span> you copied {a.typed}</span>}
          </li>
        ))}
      </ul>
      <p className="lesson__note">+{xp} XP</p>
      <div className="lesson__actions">
        <button type="button" className="lesson__plain" onClick={onPractice}>
          Practice in the Codebook
        </button>
        <NextStep onHere={onAgain} />
        <button type="button" className="lesson__go" onClick={onAgain}>
          {result.passed ? 'Keep it again' : 'Try again'}
        </button>
      </div>
    </div>
  );
}
