import { Xp } from '../../../core/player/Xp.tsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { MorsePlayer } from '../player.ts';
import { charWpmOf, parseProgress, unlockedChars, type MorseProgress } from '../lesson/progress.ts';
import { applyRound, reportRound, xpForRound } from './report.ts';
import {
  FUSE_MS,
  pickNext,
  pointsFor,
  ROUND_SECONDS,
  summarize,
  type Attempt,
  type RoundSummary,
} from './game.ts';
import '../lesson/lesson.css';
import './recognition.css';
import { NextStep } from '../../../core/road/NextStep.tsx';

// Instant Recognition (#32): a character plays, you press it before the lamp goes out. Only
// characters unlocked in the Koch lessons are used. Each round saves the personal best and each
// letter's reaction time (slow letters come up more next time), rates each letter in the receive
// skill, and pays XP (report.ts).

/** `?run=short` makes a round 10 seconds (for tests). */
const roundSeconds = () =>
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('run') === 'short'
    ? 10
    : ROUND_SECONDS;

type Phase = 'ready' | 'playing' | 'done';

export function Recognition({ api }: { api: SubjectApi }) {
  const [progress, setProgress] = useState<MorseProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [phase, setPhase] = useState<Phase>('ready');
  const [summary, setSummary] = useState<RoundSummary | null>(null);
  const [bestBefore, setBestBefore] = useState(0);
  const [seconds] = useState(roundSeconds);
  /** The latest progress, for the round's end (the round must not restart when it changes). */
  const latest = useRef<MorseProgress | null>(null);

  const finish = useCallback(
    (attempts: Attempt[]) => {
      const before = latest.current;
      if (!before) return;
      const s = summarize(attempts);
      const next = applyRound(before, s);
      latest.current = next;
      setBestBefore(before.recognition.best);
      setProgress(next);
      setSummary(s);
      setPhase('done');
      reportRound(api, next, attempts, s, seconds, s.points > before.recognition.best).then(
        () => setSaveFailed(false),
        () => setSaveFailed(true),
      );
    },
    [api, seconds],
  );

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

  if (failed) {
    return (
      <p className="lesson__card">
        The tower’s records couldn’t be read. Check your connection and reload the page.
      </p>
    );
  }
  if (!progress) return <p className="lesson__loading">Lighting the lamps…</p>;
  const chars = unlockedChars(progress);
  const best = progress.recognition.best;

  return (
    <section className="lesson ir" aria-label="Instant Recognition">
      {phase === 'ready' && (
        <div className="lesson__card lesson__start">
          <span className="lesson__lamp lesson__lamp--small" aria-hidden="true">
            ⚡
          </span>
          <h2 className="lesson__title">Instant Recognition</h2>
          <p>
            A letter plays once. Press it before the lamp goes out. The faster you are, the more
            points you score. The round lasts {seconds} seconds.
          </p>
          <p className="lesson__note">Your letters: {chars.join(' ')}</p>
          {best > 0 && <p className="lesson__keys">Your best: {best} points</p>}
          <button type="button" className="lesson__go" onClick={() => setPhase('playing')}>
            Start round
          </button>
        </div>
      )}
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your last round couldn’t be saved. Your next round will try again.
        </p>
      )}
      {phase === 'playing' && (
        <Round
          chars={chars}
          charWpm={charWpmOf(progress)}
          seconds={seconds}
          startAvg={progress.recognition.avgMs}
          onDone={finish}
        />
      )}
      {phase === 'done' && summary && (
        <Summary
          summary={summary}
          best={best}
          isBest={summary.points > bestBefore}
          xp={xpForRound(summary)}
          onAgain={() => setPhase('playing')}
        />
      )}
    </section>
  );
}

interface Current {
  char: string;
  /** Audio-clock time when the sound ends and the fuse starts. */
  endsAt: number;
  /** Sound length in ms, so the lamp starts dimming when the sound ends. */
  soundMs: number;
  n: number;
}

function Round({
  chars,
  charWpm,
  seconds,
  startAvg,
  onDone,
}: {
  chars: string[];
  charWpm: number;
  seconds: number;
  /** Each letter's saved reaction time, so slow letters come up more from the start. */
  startAvg: Readonly<Record<string, number>>;
  onDone: (attempts: Attempt[]) => void;
}) {
  const [current, setCurrent] = useState<Current | null>(null);
  const [feedback, setFeedback] = useState<{ right: boolean; char: string; ms: number } | null>(
    null,
  );
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(seconds);
  /** Set once the round starts; the letter keys call it. */
  const press = useRef<(k: string) => void>(() => {});

  // The whole round lives in this effect: it starts on mount and stops on unmount.
  useEffect(() => {
    const player = new MorsePlayer();
    const attempts: Attempt[] = [];
    const avg = new Map<string, number>(Object.entries(startAvg));
    const recent: string[] = [];
    const startedAt = performance.now();
    let now: Current | null = null;
    let fuse = 0;
    let pause = 0;
    let n = 0;
    let over = false;

    const next = async () => {
      if (over) return;
      if ((performance.now() - startedAt) / 1000 >= seconds) {
        over = true;
        onDone(attempts);
        return;
      }
      const char = pickNext(chars, avg, recent);
      recent.push(char);
      const pb = await player.play(char, { charWpm });
      const endsAt = pb.startsAt + (pb.chars[0]?.end ?? 0);
      const soundMs = Math.max(0, (endsAt - player.now()) * 1000);
      now = { char, endsAt, soundMs, n: ++n };
      setCurrent(now);
      fuse = window.setTimeout(() => answer(''), soundMs + FUSE_MS);
    };

    const answer = (pressed: string) => {
      if (!now || over) return;
      const { char, endsAt } = now;
      now = null;
      window.clearTimeout(fuse);
      const ms = pressed ? Math.max(0, Math.round((player.now() - endsAt) * 1000)) : FUSE_MS;
      const attempt: Attempt = { char, pressed, right: pressed === char, ms };
      attempts.push(attempt);
      const prev = avg.get(char);
      avg.set(
        char,
        attempt.right
          ? prev === undefined
            ? ms
            : 0.6 * prev + 0.4 * ms
          : Math.max(prev ?? 0, FUSE_MS),
      );
      setScore((s) => s + pointsFor(attempt));
      setFeedback({ right: attempt.right, char, ms });
      setCurrent(null);
      if (!attempt.right) void player.play(char, { charWpm });
      pause = window.setTimeout(
        () => {
          setFeedback(null);
          go();
        },
        attempt.right ? 450 : 1300,
      );
    };

    // If the sound can't start (the browser refused), the round ends with what was answered,
    // as the Koch Run does, instead of waiting for a letter that never plays.
    const go = () => {
      next().catch(() => {
        if (over) return;
        over = true;
        window.clearTimeout(fuse);
        onDone(attempts);
      });
    };
    press.current = answer;
    void player.unlock().then(go, go);
    const timer = window.setInterval(
      () => setLeft(Math.max(0, Math.ceil(seconds - (performance.now() - startedAt) / 1000))),
      250,
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toUpperCase();
      if (!chars.includes(k)) return;
      e.preventDefault();
      answer(k);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      over = true;
      window.clearInterval(timer);
      window.clearTimeout(fuse);
      window.clearTimeout(pause);
      window.removeEventListener('keydown', onKey);
      player.close();
    };
    // The round runs once per mount; its inputs don't change while it plays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ir__round">
      <div className="ir__status">
        <span>
          Score <strong>{score}</strong>
        </span>
        <span>
          <strong>{left}</strong> s left
        </span>
      </div>
      <div className="lesson__card ir__stage">
        <span
          key={current?.n ?? 'idle'}
          className={`ir__lamp${current ? ' is-burning' : ''}${feedback ? (feedback.right ? ' is-right' : ' is-wrong') : ''}`}
          style={
            current
              ? { animationDelay: `${current.soundMs}ms`, animationDuration: `${FUSE_MS}ms` }
              : undefined
          }
          aria-live="polite"
        >
          {feedback ? feedback.char : ''}
        </span>
        <p className="ir__feedback">
          {feedback
            ? feedback.right
              ? `${feedback.ms} ms`
              : `It was ${feedback.char}`
            : current
              ? 'Which letter?'
              : ' '}
        </p>
      </div>
      <div className="lesson__pad" aria-label="Letter keys">
        {chars.map((c) => (
          <button key={c} type="button" className="lesson__key" onClick={() => press.current(c)}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function Summary({
  summary,
  best,
  isBest,
  xp,
  onAgain,
}: {
  summary: RoundSummary;
  best: number;
  isBest: boolean;
  xp: number;
  onAgain: () => void;
}) {
  const slowest = [...summary.byChar.entries()].sort(
    (a, b) => (b[1].right ? b[1].avgMs : 1e9) - (a[1].right ? a[1].avgMs : 1e9),
  );
  return (
    <div className="lesson__result">
      <div className="lesson__card lesson__score">
        <p className="lesson__pct is-good">{summary.points}</p>
        <p className="lesson__kicker">points</p>
        {isBest && <p className="lesson__note">New personal best!</p>}
        <p>
          {summary.right} of {summary.answered} right
          {summary.avgMs > 0 && <> · {summary.avgMs} ms on average</>}
        </p>
        <p className="lesson__keys">
          {best > 0 && <>Your best: {best} · </>}
          <Xp>{xp}</Xp>
        </p>
        <NextStep onHere={onAgain} />
        <button type="button" className="lesson__go" onClick={onAgain}>
          Play again
        </button>
      </div>
      <div className="lesson__card lesson__review">
        <h3 className="lesson__subtitle">Slowest letters first</h3>
        <ul className="lesson__bars ir__bars">
          {slowest.map(([c, t]) => (
            <li key={c}>
              <span className="lesson__bar-char">{c}</span>
              <span className="lesson__bar">
                <span
                  className="ir__speed"
                  style={{ width: `${t.right ? (100 * (FUSE_MS - t.avgMs)) / FUSE_MS : 0}%` }}
                />
              </span>
              <span className="lesson__bar-pct">
                {t.right ? `${Math.round(t.avgMs)} ms` : 'missed'}
              </span>
            </li>
          ))}
        </ul>
        <p className="lesson__keys">A fuller bar means a faster answer.</p>
      </div>
    </div>
  );
}
