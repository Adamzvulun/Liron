import { useCallback, useEffect, useRef, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { parseProgress, unlockedChars, type MorseProgress } from '../lesson/progress.ts';
import { scoreCopy, type RunScore } from '../lesson/score.ts';
import { decode, START_DIT_MS, wpmFor, type Decoded, type Mark } from './decoder.ts';
import { analyseFist, STEADY, type Fist, type Measure } from './fist.ts';
import {
  applyDrill,
  drillText,
  keyableWords,
  reportDrill,
  WORD_DRILL,
  wordDrillText,
  xpForDrill,
} from './drill.ts';
import {
  applyLamp,
  LAMP_PASS,
  LAMP_WORDS,
  LAMP_XP,
  lampOpen,
  lampPassed,
  lampResult,
  lampText,
  reportLamp,
  wordsRight,
  type LampResult,
} from './lampSignal.ts';
import { MORSE_CHARS, sendable, units } from '../code.ts';
import { KEYER_DIT_MS } from '../ranks.ts';
import { useDeskAudio, type Audio } from './deskAudio.ts';
import '../lesson/lesson.css';
import './send.css';
import { NextStep } from '../../../core/road/NextStep.tsx';

// The telegraph table (#35, #36, #37): key a short text with the space bar or the brass key,
// hear it as you key, watch the tower read it, then see how clean your fist is.

type Stage =
  | { kind: 'intro' }
  | { kind: 'keying'; text: string; lamp?: boolean; words?: boolean }
  | {
      kind: 'result';
      text: string;
      decoded: Decoded;
      score: RunScore;
      fist: Fist;
      xp: number;
      /** A word drill: how many of its words the tower read. */
      words?: number;
    }
  | { kind: 'lamp-intro' }
  | { kind: 'lamp-result'; text: string; decoded: Decoded; result: LampResult; xp: number };

/** Seconds of keying shown on the timing strip. */
const STRIP_SECONDS = 8;

export function SendDrill({ api, start }: { api: SubjectApi; start?: 'lamp' }) {
  const [progress, setProgress] = useState<MorseProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: start === 'lamp' ? 'lamp-intro' : 'intro' });
  const audio = useDeskAudio();

  useEffect(() => {
    let live = true;
    api.loadState().then(
      (s) => live && setProgress(parseProgress(s)),
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
  const letters = unlockedChars(progress);
  const startDitMs = progress.sending.ditMs ?? START_DIT_MS;

  const begin = () => {
    void audio()?.tone.unlock();
    setStage({ kind: 'keying', text: drillText(letters) });
  };
  // Key whole words once enough common words use only your letters.
  const wordsReady = keyableWords(letters).length >= WORD_DRILL;
  const beginWords = () => {
    const text = wordDrillText(letters);
    if (!text) return;
    void audio()?.tone.unlock();
    setStage({ kind: 'keying', text, words: true });
  };

  const lampReady = lampOpen(progress, MORSE_CHARS.length);
  const beginLamp = () => {
    void audio()?.tone.unlock();
    setStage({ kind: 'keying', text: lampText(), lamp: true });
  };
  const finishLamp = (text: string, marks: Mark[], seconds: number) => {
    const decoded = decode(marks, { startDitMs });
    const result = lampResult(text, decoded);
    const first = result.passed && !lampPassed(progress);
    const next = applyLamp(progress, result);
    setProgress(next);
    setStage({
      kind: 'lamp-result',
      text,
      decoded,
      result,
      xp: first ? LAMP_XP.pass : LAMP_XP.try,
    });
    reportLamp(api, progress, next, result, seconds).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  const finish = (text: string, marks: Mark[], seconds: number, words?: boolean) => {
    const decoded = decode(marks, { startDitMs });
    const score = scoreCopy(units(text), units(decoded.text));
    const fist = analyseFist(decoded);
    // A drill the tower mostly couldn't read says little about your speed: keep the last one.
    const next = applyDrill(
      progress,
      score.accuracy >= 0.5 ? decoded.ditMs : (progress.sending.ditMs ?? decoded.ditMs),
    );
    setProgress(next);
    setStage({
      kind: 'result',
      text,
      decoded,
      score,
      fist,
      xp: xpForDrill(score),
      ...(words && { words: wordsRight(text.split(' '), decoded.text.split(' ')) }),
    });
    reportDrill(api, next, score, seconds).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  return (
    <section className="lesson send" aria-label="Sending practice">
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your drill couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {stage.kind === 'intro' && (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">The telegraph table · straight key</p>
          <h2 className="lesson__title">Send with your own hand</h2>
          <p>
            Key the letters shown, one press for each dit and dah. Hold the <kbd>space bar</kbd>, or
            the brass key on a phone. You’ll hear it as you key.
          </p>
          <p className="lesson__note">
            Go at a pace you can keep clean: the tower learns your speed. Your letters:{' '}
            {letters.join(' ')}
          </p>
          <button type="button" className="lesson__go" onClick={begin}>
            Sit at the key
          </button>
          {wordsReady && (
            <button type="button" className="lesson__plain" onClick={beginWords}>
              Key {WORD_DRILL} words
            </button>
          )}
          {lampReady && (
            <button
              type="button"
              className="lesson__plain"
              onClick={() => setStage({ kind: 'lamp-intro' })}
            >
              {lampPassed(progress) ? 'The Lamp Signal · passed' : 'Trial · The Lamp Signal'}
            </button>
          )}
        </div>
      )}
      {stage.kind === 'lamp-intro' && (
        <LampIntro
          ready={lampReady}
          passed={lampPassed(progress)}
          onBegin={beginLamp}
          onPractice={() => setStage({ kind: 'intro' })}
        />
      )}
      {stage.kind === 'keying' && (
        <Keying
          key={stage.text}
          text={stage.text}
          startDitMs={startDitMs}
          audio={audio}
          onDone={(marks, seconds) =>
            stage.lamp
              ? finishLamp(stage.text, marks, seconds)
              : finish(stage.text, marks, seconds, stage.words)
          }
        />
      )}
      {stage.kind === 'result' && (
        <Result stage={stage} onAgain={stage.words === undefined ? begin : beginWords} />
      )}
      {stage.kind === 'lamp-result' && (
        <LampResultCard
          stage={stage}
          onAgain={beginLamp}
          onPractice={() => setStage({ kind: 'intro' })}
        />
      )}
    </section>
  );
}

export function Keying({
  text,
  startDitMs,
  audio,
  onDone,
  free = false,
}: {
  text: string;
  startDitMs: number;
  audio: () => Audio | null;
  onDone: (marks: Mark[], seconds: number) => void;
  /**
   * Key anything (the Radio Room's own-news turn, ADR 0037): no line to copy, so it never ends
   * by itself; Done ends it. `text` is ignored.
   */
  free?: boolean;
}) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [downAt, setDownAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const started = useRef<number | null>(null);
  const finished = useRef(false);
  /** When the key went down, if it's down (a ref, so quick presses never see a stale value). */
  const down = useRef<number | null>(null);
  /** The finger or mouse holding the brass key: another finger lifting doesn't let it go. */
  const pointer = useRef<number | null>(null);

  const press = useCallback(
    (t: number) => {
      if (down.current !== null || finished.current) return;
      audio()?.tone.down();
      started.current ??= t;
      down.current = t;
      setDownAt(t);
    },
    [audio],
  );
  const release = useCallback(
    (t: number) => {
      const d = down.current;
      if (d === null) return;
      audio()?.tone.up();
      down.current = null;
      setDownAt(null);
      setMarks((m) => [...m, { down: d, up: Math.max(t, d + 1) }]);
    },
    [audio],
  );

  // Leaving the desk with the key held (Done, Skip) mustn't leave the tone sounding.
  useEffect(
    () => () => {
      if (down.current !== null) audio()?.tone.up();
    },
    [audio],
  );

  // The space bar is the key (auto-repeat ignored); losing focus lets it go.
  useEffect(() => {
    const isSpace = (e: KeyboardEvent) => e.code === 'Space' || e.key === ' ';
    const keyDown = (e: KeyboardEvent) => {
      if (!isSpace(e)) return;
      e.preventDefault();
      if (!e.repeat) {
        void audio()?.tone.unlock();
        press(e.timeStamp);
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      if (!isSpace(e)) return;
      e.preventDefault();
      release(e.timeStamp);
    };
    const blur = () => release(performance.now());
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
    };
  }, [audio, press, release]);

  // A clock for the live reading and the strip.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setNow(performance.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const decoded = decode(marks, { startDitMs, now });
  const target = units(text);
  const sent = units(decoded.text);

  // Done when every letter is in and the key has rested for a word gap.
  const last = marks[marks.length - 1];
  const rested = last && downAt === null && now - last.up > 7 * decoded.ditMs;
  useEffect(() => {
    if (free || finished.current || !rested || sent.length < target.length || !last) return;
    finished.current = true;
    onDone(marks, (last.up - (started.current ?? last.down)) / 1000);
  }, [free, rested, sent.length, target.length, marks, last, onDone]);

  const finishNow = () => {
    if (finished.current || !last) return;
    finished.current = true;
    onDone(marks, (last.up - (started.current ?? last.down)) / 1000);
  };

  let i = 0;
  return (
    <div className="lesson__card send__desk">
      <p className="lesson__kicker">{free ? 'Key your own words' : 'Key this'}</p>
      {!free && (
        <p className="send__target" aria-label={`Key: ${text}`}>
          {text.split(' ').map((group, g) => (
            <span key={g} className="send__group">
              {sendable(group).map((c, k) => {
                const at = i++;
                const got = sent[at];
                const cls =
                  got === undefined
                    ? at === sent.length
                      ? ' is-current'
                      : ''
                    : got === (c === '<BT>' ? '=' : c)
                      ? ' is-right'
                      : ' is-wrong';
                return (
                  <span key={k} className={`send__char${cls}`}>
                    {c}
                  </span>
                );
              })}
            </span>
          ))}
        </p>
      )}
      <p className="send__read" aria-live="polite">
        <span className="send__read-label">The tower reads</span>
        <span className="send__read-text">
          {decoded.text || (decoded.keying ? '' : '…')}
          {decoded.keying && <span className="send__keying" aria-label="keying" />}
        </span>
      </p>
      <Strip marks={marks} downAt={downAt} now={now} />
      <button
        type="button"
        className={`send__key${downAt !== null ? ' is-down' : ''}`}
        aria-label="Morse key: hold to key"
        onPointerDown={(e) => {
          e.preventDefault();
          if (down.current !== null) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          pointer.current = e.pointerId;
          void audio()?.tone.unlock();
          press(e.timeStamp);
        }}
        onPointerUp={(e) => e.pointerId === pointer.current && release(e.timeStamp)}
        onPointerCancel={(e) => e.pointerId === pointer.current && release(e.timeStamp)}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
      >
        <span className="send__knob" aria-hidden="true" />
        <span className="send__key-hint">
          <span className="send__desktop">
            Hold <kbd>space</kbd> to key
          </span>
          <span className="send__touch">Hold to key</span>
        </span>
      </button>
      <div className="lesson__actions">
        {!free && (
          <button
            type="button"
            className="lesson__plain"
            onClick={() =>
              void audio()?.player.play(text, {
                charWpm: Math.min(20, Math.max(8, Math.round(wpmFor(decoded.ditMs)))),
                effWpm: Math.min(20, Math.max(5, Math.round(wpmFor(decoded.ditMs)))),
              })
            }
          >
            Hear it
          </button>
        )}
        <button
          type="button"
          className="lesson__plain"
          onClick={() => {
            setMarks([]);
            started.current = null;
          }}
        >
          Start over
        </button>
        <button type="button" className="lesson__go" onClick={finishNow} disabled={!marks.length}>
          Done
        </button>
      </div>
    </div>
  );
}

/** The last few seconds of keying, as bars on a line: a timing strip, not a dot-dash chart. */
function Strip({ marks, downAt, now }: { marks: Mark[]; downAt: number | null; now: number }) {
  const W = 1000;
  const from = now - STRIP_SECONDS * 1000;
  const x = (t: number) => ((t - from) / (STRIP_SECONDS * 1000)) * W;
  const all = downAt === null ? marks : [...marks, { down: downAt, up: now }];
  return (
    <svg
      className="send__strip"
      viewBox={`0 0 ${W} 40`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1="0" y1="20" x2={W} y2="20" className="send__strip-line" />
      {all
        .filter((m) => m.up > from)
        .map((m, k) => (
          <rect
            key={k}
            x={Math.max(0, x(m.down))}
            y="8"
            width={Math.max(2, x(m.up) - Math.max(0, x(m.down)))}
            height="24"
            rx="4"
            className="send__strip-mark"
          />
        ))}
    </svg>
  );
}

function Gauge({ label, m, unit }: { label: string; m?: Measure; unit: string }) {
  if (!m) return null;
  // A log scale from a third of ideal to three times it.
  const pos = (v: number) =>
    Math.min(100, Math.max(0, ((Math.log(v / m.ideal) / Math.log(3)) * 0.5 + 0.5) * 100));
  const fine = m.value >= m.low && m.value <= m.high;
  return (
    <div className="send__gauge">
      <dt>{label}</dt>
      <dd>
        <span className="send__track" aria-hidden="true">
          <span
            className="send__fine"
            style={{ left: `${pos(m.low)}%`, width: `${pos(m.high) - pos(m.low)}%` }}
          />
          <span className="send__ideal" style={{ left: '50%' }} />
          <span
            className={`send__you${fine ? ' is-fine' : ''}`}
            style={{ left: `${pos(m.value)}%` }}
          />
        </span>
        <span className="send__value">
          {m.value.toFixed(1)} {unit} <small>(ideal {m.ideal})</small>
        </span>
      </dd>
    </div>
  );
}

function Result({
  stage,
  onAgain,
}: {
  stage: Extract<Stage, { kind: 'result' }>;
  onAgain: () => void;
}) {
  const { text, decoded, score, fist, xp, words } = stage;
  return (
    <div className="lesson__card send__result">
      <p className={`lesson__pct${score.accuracy >= 0.9 ? ' is-good' : ''}`}>
        {Math.round(score.accuracy * 100)}%
      </p>
      <p className="lesson__kicker">
        {words !== undefined && (
          <>
            {words} of {text.split(' ').length} words ·{' '}
          </>
        )}
        {score.right} of {score.played} letters read right · {fist.wpm} wpm
      </p>
      <dl className="send__compare">
        <div>
          <dt>You keyed</dt>
          <dd>{text}</dd>
        </div>
        <div>
          <dt>The tower read</dt>
          <dd>{decoded.text || '—'}</dd>
        </div>
      </dl>
      <h2 className="lesson__title">Your fist</h2>
      <p className="send__tip">{fist.tip}</p>
      <dl className="send__gauges">
        <Gauge label="Dah ÷ dit" m={fist.ratio} unit="×" />
        <Gauge label="Inside letters" m={fist.element} unit="dits" />
        <Gauge label="Between letters" m={fist.letter} unit="dits" />
        <Gauge label="Between words" m={fist.word} unit="dits" />
        {fist.steadiness !== undefined && (
          <div className="send__gauge">
            <dt>Steadiness</dt>
            <dd>
              <span className="send__track" aria-hidden="true">
                <span
                  className="send__fine"
                  style={{ left: `${STEADY * 100}%`, width: `${(1 - STEADY) * 100}%` }}
                />
                <span
                  className={`send__you${fist.steadiness >= STEADY ? ' is-fine' : ''}`}
                  style={{ left: `${fist.steadiness * 100}%` }}
                />
              </span>
              <span className="send__value">{Math.round(fist.steadiness * 100)}%</span>
            </dd>
          </div>
        )}
      </dl>
      <p className="lesson__note">+{xp} XP</p>
      <div className="lesson__actions">
        <NextStep onHere={onAgain} />
        <button type="button" className="lesson__go" onClick={onAgain}>
          Key another
        </button>
      </div>
    </div>
  );
}

/** The Lamp Signal's door (#175): what it asks, before you face it. */
function LampIntro({
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
      <p className="lesson__kicker">Trial · the Keyer’s rank</p>
      <h2 className="lesson__title">The Lamp Signal</h2>
      <p>
        The beacon’s lamp has a shutter, and a keyer works it by hand. Send {LAMP_WORDS} common
        words with the straight key. The tower must read {LAMP_PASS} of them, and your keying must
        be {Math.round(1200 / KEYER_DIT_MS)} wpm or faster.
      </p>
      {passed && <p className="lesson__note">Passed. You can send it again for practice.</p>}
      {ready ? (
        <button type="button" className="lesson__go" onClick={onBegin}>
          Work the lamp
        </button>
      ) : (
        <p className="lesson__note">
          Opens once you’ve learned all {MORSE_CHARS.length} characters.
        </p>
      )}
      <div className="lesson__actions">
        <button type="button" className="lesson__plain" onClick={onPractice}>
          Practice sending
        </button>
      </div>
    </div>
  );
}

function LampResultCard({
  stage,
  onAgain,
  onPractice,
}: {
  stage: Extract<Stage, { kind: 'lamp-result' }>;
  onAgain: () => void;
  onPractice: () => void;
}) {
  const { text, decoded, result, xp } = stage;
  return (
    <div className="lesson__card send__result">
      <p className={`lesson__pct${result.passed ? ' is-good' : ''}`}>
        {result.right} / {result.total}
      </p>
      <p className="lesson__kicker">words read right · {result.wpm} wpm</p>
      <h2 className="lesson__title">
        {result.passed
          ? 'The lamp speaks for you'
          : !result.read
            ? `The tower needs ${LAMP_PASS} words`
            : `Faster: ${Math.round(1200 / KEYER_DIT_MS)} wpm`}
      </h2>
      <dl className="send__compare">
        <div>
          <dt>The words</dt>
          <dd>{text}</dd>
        </div>
        <div>
          <dt>The tower read</dt>
          <dd>{decoded.text || '—'}</dd>
        </div>
      </dl>
      <p className="lesson__note">+{xp} XP</p>
      <div className="lesson__actions">
        <button type="button" className="lesson__plain" onClick={onPractice}>
          Practice sending
        </button>
        <NextStep onHere={onAgain} />
        <button type="button" className="lesson__go" onClick={onAgain}>
          {result.passed ? 'Send it again' : 'Try again'}
        </button>
      </div>
    </div>
  );
}
