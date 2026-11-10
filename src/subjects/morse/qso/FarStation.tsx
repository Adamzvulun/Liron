import { useCallback, useEffect, useRef, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { parseProgress, type MorseProgress } from '../lesson/progress.ts';
import { decode, START_DIT_MS } from '../send/decoder.ts';
import { useDeskAudio, type Audio } from '../send/deskAudio.ts';
import { Keying } from '../send/SendDrill.tsx';
import {
  answerFor,
  applyFar,
  FAR_WPM,
  FAR_XP,
  farOpen,
  farPassed,
  fieldRight,
  keyedRight,
  makeQso,
  PROSIGN_CHOICES,
  qsoResult,
  qsoSteps,
  reportFar,
  type CopyField,
  type Qso,
  type QsoResult,
  type QsoStep,
} from './farStation.ts';
import '../lesson/lesson.css';
import '../send/send.css';
import './qso.css';

// The Radio Room (#178): the Far Station, the Operator's trial. A whole contact, turn by turn:
// hear the far station and copy it, answer with the key, and so on to its SK. The rules are in
// farStation.ts.

const LABELS: Record<CopyField, string> = {
  call: 'Their call',
  rst: 'Signal report (RST)',
  name: 'Their name',
  town: 'Their town (QTH)',
  prosign: 'Which prosign closed the contact?',
};

/** The same, short, for the log. */
const LOG_LABELS: Record<CopyField, string> = { ...LABELS, prosign: 'Closing prosign' };

type Copies = Partial<Record<CopyField, string>>;

type Stage =
  | { kind: 'intro' }
  | { kind: 'qso'; qso: Qso; at: number; copies: Copies; reads: string[]; started: number }
  | { kind: 'result'; qso: Qso; copies: Copies; reads: string[]; result: QsoResult; xp: number };

export function FarStation({ api }: { api: SubjectApi }) {
  const [progress, setProgress] = useState<MorseProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
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
  if (!progress) return <p className="lesson__loading">Warming up the radio…</p>;

  const begin = () => {
    void audio()?.tone.unlock();
    setStage({
      kind: 'qso',
      qso: makeQso(),
      at: 0,
      copies: {},
      reads: [],
      started: performance.now(),
    });
  };

  const advance = (s: Extract<Stage, { kind: 'qso' }>, copies: Copies, reads: string[]) => {
    const steps = qsoSteps(s.qso);
    if (s.at + 1 < steps.length) {
      setStage({ ...s, at: s.at + 1, copies, reads });
      return;
    }
    const result = qsoResult(s.qso, copies, reads);
    const first = result.passed && !farPassed(progress);
    const next = applyFar(progress, result);
    setProgress(next);
    setStage({
      kind: 'result',
      qso: s.qso,
      copies,
      reads,
      result,
      xp: first ? FAR_XP.pass : FAR_XP.try,
    });
    const seconds = (performance.now() - s.started) / 1000;
    reportFar(api, progress, next, result, seconds).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  return (
    <section className="lesson send qso" aria-label="The Radio Room">
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your contact couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {stage.kind === 'intro' && (
        <Intro ready={farOpen(progress)} passed={farPassed(progress)} onBegin={begin} />
      )}
      {stage.kind === 'qso' && (
        <Turn
          key={stage.at}
          stage={stage}
          step={qsoSteps(stage.qso)[stage.at] as QsoStep}
          startDitMs={progress.sending.ditMs ?? START_DIT_MS}
          audio={audio}
          onCopied={(c) => advance(stage, { ...stage.copies, ...c }, stage.reads)}
          onKeyed={(read) => advance(stage, stage.copies, [...stage.reads, read])}
        />
      )}
      {stage.kind === 'result' && (
        <Log stage={stage} onAgain={begin} onLeave={() => setStage({ kind: 'intro' })} />
      )}
    </section>
  );
}

function Intro({
  ready,
  passed,
  onBegin,
}: {
  ready: boolean;
  passed: boolean;
  onBegin: () => void;
}) {
  return (
    <div className="lesson__card lesson__start">
      <p className="lesson__kicker">Trial · the Operator’s rank</p>
      <h2 className="lesson__title">The Far Station</h2>
      <p>
        Somewhere over the sea, a station is calling CQ: anyone, answer me. Work your first contact.
        Copy its call and answer it with the key. Copy its report: your signal, its operator’s name
        and town. Thank them, and say how the contact ends.
      </p>
      <p className="lesson__note">
        It sends at {FAR_WPM} wpm. Type as you hear it, and ask for AGN once per turn. If it can’t
        read your keying, it asks you to send again, once.
      </p>
      {passed && <p className="lesson__note">Passed. Work another station whenever you like.</p>}
      {ready ? (
        <button type="button" className="lesson__go" onClick={onBegin}>
          Tune in
        </button>
      ) : (
        <p className="lesson__note">Opens once you’ve passed the Lamp Signal.</p>
      )}
    </div>
  );
}

function Turn({
  stage,
  step,
  startDitMs,
  audio,
  onCopied,
  onKeyed,
}: {
  stage: Extract<Stage, { kind: 'qso' }>;
  step: QsoStep;
  startDitMs: number;
  audio: () => Audio | null;
  onCopied: (c: Copies) => void;
  onKeyed: (read: string) => void;
}) {
  const total = qsoSteps(stage.qso).length;
  return (
    <>
      <p className="qso__progress">
        Turn {stage.at + 1} of {total} · your call today is <strong>{stage.qso.me}</strong>
      </p>
      {step.kind === 'hear' ? (
        <Hear step={step} audio={audio} onDone={onCopied} />
      ) : (
        <Answer step={step} startDitMs={startDitMs} audio={audio} onDone={onKeyed} />
      )}
    </>
  );
}

function Hear({
  step,
  audio,
  onDone,
}: {
  step: Extract<QsoStep, { kind: 'hear' }>;
  audio: () => Audio | null;
  onDone: (c: Copies) => void;
}) {
  const [copies, setCopies] = useState<Copies>({});
  const [again, setAgain] = useState(false);
  const [playing, setPlaying] = useState(true);
  const plays = useRef(0);

  /** Plays the turn; whoever calls it has set `playing`. */
  const play = useCallback(async () => {
    const id = ++plays.current;
    const pb = await audio()?.player.play(step.text, { charWpm: FAR_WPM, effWpm: FAR_WPM });
    await pb?.done;
    if (id === plays.current) setPlaying(false);
  }, [audio, step.text]);

  useEffect(() => {
    void play();
    return () => audio()?.player.stop();
  }, [play, audio]);

  const filled = step.fields.every((f) => (copies[f] ?? '').trim());
  const set = (f: CopyField, v: string) => setCopies((c) => ({ ...c, [f]: v }));

  return (
    <form
      className="lesson__card qso__card"
      onSubmit={(e) => {
        e.preventDefault();
        if (filled) onDone(copies);
      }}
    >
      <p className="lesson__kicker">The far station · listen and copy</p>
      <p className="qso__air" aria-live="polite">
        {playing ? 'On the air…' : 'Quiet now.'}
      </p>
      {step.fields.map((f) =>
        f === 'prosign' ? (
          <fieldset key={f} className="qso__choices">
            <legend>{LABELS[f]}</legend>
            {PROSIGN_CHOICES.map((p) => (
              <label key={p} className={copies.prosign === p ? 'is-picked' : ''}>
                <input
                  type="radio"
                  name="prosign"
                  value={p}
                  checked={copies.prosign === p}
                  onChange={() => set(f, p)}
                />
                {p}
              </label>
            ))}
          </fieldset>
        ) : (
          <label key={f} className="qso__field">
            <span>{LABELS[f]}</span>
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={copies[f] ?? ''}
              onChange={(e) => set(f, e.target.value.toUpperCase())}
            />
          </label>
        ),
      )}
      <div className="lesson__actions">
        <button
          type="button"
          className="lesson__plain"
          disabled={again || playing}
          aria-label="AGN: hear it again"
          onClick={() => {
            setAgain(true);
            setPlaying(true);
            void play();
          }}
        >
          AGN
        </button>
        <button type="submit" className="lesson__go" disabled={!filled}>
          Over
        </button>
      </div>
    </form>
  );
}

function Answer({
  step,
  startDitMs,
  audio,
  onDone,
}: {
  step: Extract<QsoStep, { kind: 'key' }>;
  startDitMs: number;
  audio: () => Audio | null;
  onDone: (read: string) => void;
}) {
  /** What the far station read the first time, if it couldn't make it out. */
  const [missed, setMissed] = useState<string | null>(null);
  return (
    <>
      <p className="qso__say">
        {missed === null ? (
          <>Your turn: answer them with the key.</>
        ) : (
          <>
            The far station sends <strong>AGN?</strong> It read “{missed || '…'}”. Send it once
            more.
          </>
        )}
      </p>
      <Keying
        key={missed === null ? 'first' : 'again'}
        text={step.text}
        startDitMs={startDitMs}
        audio={audio}
        onDone={(marks) => {
          const read = decode(marks, { startDitMs }).text;
          if (keyedRight(step.text, read) || missed !== null) onDone(read);
          else setMissed(read);
        }}
      />
    </>
  );
}

function Log({
  stage,
  onAgain,
  onLeave,
}: {
  stage: Extract<Stage, { kind: 'result' }>;
  onAgain: () => void;
  onLeave: () => void;
}) {
  const { qso, copies, reads, result, xp } = stage;
  const steps = qsoSteps(qso);
  const fields = steps.flatMap((s) => (s.kind === 'hear' ? s.fields : []));
  const keys = steps.flatMap((s) => (s.kind === 'key' ? [s.text] : []));
  return (
    <div className="lesson__card send__result">
      <p className={`lesson__pct${result.passed ? ' is-good' : ''}`}>
        {result.copied + result.keyed} / {result.copyTotal + result.keyTotal}
      </p>
      <p className="lesson__kicker">your log · {qso.far}</p>
      <h2 className="lesson__title">
        {result.passed ? 'Contact logged. 73!' : 'The contact didn’t make the log'}
      </h2>
      {!result.passed && (
        <p className="lesson__note">The Operator copies every part and is read every time.</p>
      )}
      <ul className="qso__log">
        {fields.map((f) => {
          const ok = fieldRight(qso, f, copies[f] ?? '');
          return (
            <li key={f} className={ok ? 'is-right' : 'is-wrong'}>
              <span>{LOG_LABELS[f]}</span>
              <strong>{copies[f] || '—'}</strong>
              {!ok && <small>sent {answerFor(qso, f)}</small>}
            </li>
          );
        })}
        {keys.map((t, i) => {
          const ok = keyedRight(t, reads[i] ?? '');
          return (
            <li key={t} className={ok ? 'is-right' : 'is-wrong'}>
              <span>You keyed</span>
              <strong>{t}</strong>
              {!ok && <small>they read {reads[i] || '—'}</small>}
            </li>
          );
        })}
      </ul>
      <p className="lesson__note">+{xp} XP</p>
      <div className="lesson__actions">
        <button type="button" className="lesson__plain" onClick={onLeave}>
          The Radio Room
        </button>
        <button type="button" className="lesson__go" onClick={onAgain}>
          {result.passed ? 'Work another station' : 'Try again'}
        </button>
      </div>
    </div>
  );
}
