import { useCallback, useEffect, useRef, useState } from 'react';
import { newAudioContext } from '../../../core/audio.ts';
import type { SubjectApi } from '../../../core/subject.ts';
import { MorsePlayer } from '../player.ts';
import { parseProgress, unlockedChars, type MorseProgress } from '../lesson/progress.ts';
import { scoreCopy, type RunScore } from '../lesson/score.ts';
import { decode, START_DIT_MS, wpmFor, type Decoded, type Mark } from './decoder.ts';
import { analyseFist, STEADY, type Fist, type Measure } from './fist.ts';
import { applyDrill, drillText, reportDrill, xpForDrill } from './drill.ts';
import { Sidetone } from './sidetone.ts';
import '../lesson/lesson.css';
import './send.css';

// The telegraph table (#35, #36, #37): key a short text with the space bar or the brass key,
// hear it as you key, watch the tower read it, then see how clean your fist is.

type Stage =
  | { kind: 'intro' }
  | { kind: 'keying'; text: string }
  | { kind: 'result'; text: string; decoded: Decoded; score: RunScore; fist: Fist; xp: number };

interface Audio {
  ctx: AudioContext;
  tone: Sidetone;
  player: MorsePlayer;
}

/** Seconds of keying shown on the timing strip. */
const STRIP_SECONDS = 8;

export function SendDrill({ api }: { api: SubjectApi }) {
  const [progress, setProgress] = useState<MorseProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
  // Sound is made on first use (browsers allow it only after a tap or key press).
  const audioRef = useRef<Audio | null>(null);
  const audio = useCallback((): Audio | null => {
    if (!audioRef.current && typeof AudioContext !== 'undefined') {
      const ctx = newAudioContext({ latencyHint: 'interactive' });
      audioRef.current = {
        ctx,
        tone: new Sidetone(ctx),
        player: new MorsePlayer({ context: ctx }),
      };
    }
    return audioRef.current;
  }, []);
  useEffect(
    () => () => {
      const a = audioRef.current;
      audioRef.current = null;
      a?.tone.close();
      a?.player.stop();
      void a?.ctx.close();
    },
    [],
  );

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

  const finish = (text: string, marks: Mark[], seconds: number) => {
    const decoded = decode(marks, { startDitMs });
    const target = text.replace(/ /g, '').split('');
    const sent = decoded.text.replace(/ /g, '').split('');
    const score = scoreCopy(target, sent);
    const fist = analyseFist(decoded);
    const next = applyDrill(progress, decoded.ditMs);
    setProgress(next);
    setStage({ kind: 'result', text, decoded, score, fist, xp: xpForDrill(score) });
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
        </div>
      )}
      {stage.kind === 'keying' && (
        <Keying
          key={stage.text}
          text={stage.text}
          startDitMs={startDitMs}
          audio={audio}
          onDone={(marks, seconds) => finish(stage.text, marks, seconds)}
        />
      )}
      {stage.kind === 'result' && <Result stage={stage} onAgain={begin} />}
    </section>
  );
}

function Keying({
  text,
  startDitMs,
  audio,
  onDone,
}: {
  text: string;
  startDitMs: number;
  audio: () => Audio | null;
  onDone: (marks: Mark[], seconds: number) => void;
}) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [downAt, setDownAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const started = useRef<number | null>(null);
  const finished = useRef(false);
  /** When the key went down, if it's down (a ref, so quick presses never see a stale value). */
  const down = useRef<number | null>(null);

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
  const target = text.replace(/ /g, '');
  const sent = decoded.text.replace(/ /g, '');

  // Done when every letter is in and the key has rested for a word gap.
  const last = marks[marks.length - 1];
  const rested = last && downAt === null && now - last.up > 7 * decoded.ditMs;
  useEffect(() => {
    if (finished.current || !rested || sent.length < target.length || !last) return;
    finished.current = true;
    onDone(marks, (last.up - (started.current ?? last.down)) / 1000);
  }, [rested, sent.length, target.length, marks, last, onDone]);

  const finishNow = () => {
    if (finished.current || !last) return;
    finished.current = true;
    onDone(marks, (last.up - (started.current ?? last.down)) / 1000);
  };

  let i = 0;
  return (
    <div className="lesson__card send__desk">
      <p className="lesson__kicker">Key this</p>
      <p className="send__target" aria-label={`Key: ${text}`}>
        {text.split(' ').map((group, g) => (
          <span key={g} className="send__group">
            {[...group].map((c, k) => {
              const at = i++;
              const got = sent[at];
              const cls =
                got === undefined
                  ? at === sent.length
                    ? ' is-current'
                    : ''
                  : got === c
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
          e.currentTarget.setPointerCapture(e.pointerId);
          void audio()?.tone.unlock();
          press(e.timeStamp);
        }}
        onPointerUp={(e) => release(e.timeStamp)}
        onPointerCancel={(e) => release(e.timeStamp)}
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
  const { text, decoded, score, fist, xp } = stage;
  return (
    <div className="lesson__card send__result">
      <p className={`lesson__pct${score.accuracy >= 0.9 ? ' is-good' : ''}`}>
        {Math.round(score.accuracy * 100)}%
      </p>
      <p className="lesson__kicker">
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
        <button type="button" className="lesson__go" onClick={onAgain}>
          Key another
        </button>
      </div>
    </div>
  );
}
