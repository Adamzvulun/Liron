import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { parseProgress, type MorseProgress } from '../lesson/progress.ts';
import { START_DIT_MS } from '../send/decoder.ts';
import { useDeskAudio, type Audio } from '../send/deskAudio.ts';
import { bandRoute } from './band.ts';
import { keyedRight } from './farStation.ts';
import {
  airAnswer,
  airResult,
  airRight,
  applyContact,
  contactSteps,
  makeContact,
  nextToOpen,
  onAirToday,
  OPERATORS,
  radioDay,
  RADIO_XP,
  reportRadio,
  roomOpen,
  setUpStation,
  slower,
  stationOf,
  workedWith,
  type AirField,
  type AirResult,
  type AirStep,
  type Contact,
  type Operator,
} from './onAir.ts';
import { HearTurn, KeyTurn, type Copies as TurnCopies } from './Turns.tsx';
import '../lesson/lesson.css';
import '../send/send.css';
import './qso.css';

// The Radio Room on the air (E16): after the Far Station, a few operators call CQ each day. Pick
// one, work the contact turn by turn, and it goes in your logbook. Rules in onAir.ts, the band's
// sound in band.ts. Design: docs/game/radio-qso.md.

const LABELS: Record<AirField, string> = {
  call: 'Their call',
  rst: 'Signal report (RST)',
  name: 'Their name',
  qth: 'Their town (QTH)',
  temp: 'Their temperature (°C)',
};

type Copies = Partial<Record<AirField, string>>;

type Stage =
  | { kind: 'room' }
  | { kind: 'setup' }
  | {
      kind: 'contact';
      contact: Contact;
      at: number;
      wpm: number;
      copies: Copies;
      reads: string[];
      started: number;
    }
  | { kind: 'result'; contact: Contact; copies: Copies; reads: string[]; result: AirResult };

export function RadioRoom({ api, onFar }: { api: SubjectApi; onFar: () => void }) {
  const [progress, setProgress] = useState<MorseProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'room' });
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

  const save = (next: MorseProgress, res: AirResult | null, seconds: number) => {
    setProgress(next);
    reportRadio(api, next, res, seconds).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  const station = stationOf(progress.radio);

  const answer = (op: Operator) => {
    if (!station) return;
    void audio()?.tone.unlock();
    setStage({
      kind: 'contact',
      contact: makeContact(op, station, workedWith(progress.radio, op.id) > 0),
      at: 0,
      wpm: op.wpm,
      copies: {},
      reads: [],
      started: performance.now(),
    });
  };

  const advance = (s: Extract<Stage, { kind: 'contact' }>, copies: Copies, reads: string[]) => {
    if (s.at + 1 < contactSteps(s.contact).length) {
      setStage({ ...s, at: s.at + 1, copies, reads });
      return;
    }
    const result = airResult(s.contact, copies, reads);
    const radio = applyContact(progress.radio, s.contact.op.id, result, radioDay());
    save({ ...progress, radio }, result, (performance.now() - s.started) / 1000);
    setStage({ kind: 'result', contact: s.contact, copies, reads, result });
  };

  return (
    <section className="lesson send qso" aria-label="The Radio Room">
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your log couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {!roomOpen(progress) ? (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">On the air</p>
          <h2 className="lesson__title">The Radio Room</h2>
          <p className="lesson__note">
            The operators come on the air once you’ve worked the Far Station.
          </p>
          <button type="button" className="lesson__go" onClick={onFar}>
            The Far Station
          </button>
        </div>
      ) : !station || stage.kind === 'setup' ? (
        <Setup
          progress={progress}
          onCancel={station ? () => setStage({ kind: 'room' }) : undefined}
          onDone={(name, qth) => {
            save({ ...progress, radio: setUpStation(progress.radio, name, qth) }, null, 0);
            setStage({ kind: 'room' });
          }}
        />
      ) : stage.kind === 'contact' ? (
        <Turn
          key={stage.at}
          stage={stage}
          startDitMs={progress.sending.ditMs ?? START_DIT_MS}
          audio={audio}
          onSlower={(wpm) => setStage({ ...stage, wpm })}
          onCopied={(c) => advance(stage, { ...stage.copies, ...(c as Copies) }, stage.reads)}
          onKeyed={(read) => advance(stage, stage.copies, [...stage.reads, read])}
        />
      ) : stage.kind === 'result' ? (
        <Log
          stage={stage}
          onAgain={() => answer(stage.contact.op)}
          onLeave={() => setStage({ kind: 'room' })}
        />
      ) : (
        <Room
          progress={progress}
          onAnswer={answer}
          onFar={onFar}
          onRename={() => setStage({ kind: 'setup' })}
        />
      )}
    </section>
  );
}

function Setup({
  progress,
  onCancel,
  onDone,
}: {
  progress: MorseProgress;
  onCancel?: () => void;
  onDone: (name: string, qth: string) => void;
}) {
  const [name, setName] = useState(progress.radio.name ?? '');
  const [qth, setQth] = useState(progress.radio.qth ?? '');
  const ok = name.trim() !== '' && qth.trim() !== '';
  return (
    <form
      className="lesson__card qso__card"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onDone(name, qth);
      }}
    >
      <p className="lesson__kicker">Your station</p>
      <h2 className="lesson__title">On the air</h2>
      <p>
        Operators give their name and town (QTH) on the air.{' '}
        {progress.radio.call ? (
          <>
            Your callsign is <strong>{progress.radio.call}</strong>.
          </>
        ) : (
          <>You’ll get a callsign of your own to keep.</>
        )}{' '}
        Letters only: you’ll send them with the key.
      </p>
      <label className="qso__field">
        <span>Your name on the air</span>
        <input
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={8}
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
        />
      </label>
      <label className="qso__field">
        <span>Your town (QTH)</span>
        <input
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={10}
          value={qth}
          onChange={(e) => setQth(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
        />
      </label>
      <div className="lesson__actions">
        {onCancel && (
          <button type="button" className="lesson__plain" onClick={onCancel}>
            Back
          </button>
        )}
        <button type="submit" className="lesson__go" disabled={!ok}>
          {progress.radio.call ? 'Save' : 'Get my callsign'}
        </button>
      </div>
    </form>
  );
}

function Room({
  progress,
  onAnswer,
  onFar,
  onRename,
}: {
  progress: MorseProgress;
  onAnswer: (op: Operator) => void;
  onFar: () => void;
  onRename: () => void;
}) {
  const { radio } = progress;
  const ops = useMemo(() => onAirToday(radio, radioDay()), [radio]);
  const next = nextToOpen(radio);
  const latest = radio.log.slice(-5).reverse();
  return (
    <>
      <div className="lesson__card qso__room">
        <p className="lesson__kicker">
          On the air · your call <strong>{radio.call}</strong> · {radio.name} in {radio.qth}
        </p>
        <h2 className="lesson__title">The Radio Room</h2>
        <p>
          {ops.length} operators are calling CQ today. Pick one and answer. Ask them for QRS if
          they’re too fast for you.
        </p>
        <ul className="qso__ops">
          {ops.map((op) => {
            const n = workedWith(radio, op.id);
            return (
              <li key={op.id} className="qso__op">
                <div>
                  <h3>{op.who}</h3>
                  <p>{op.about}</p>
                  <p className="qso__op-meta">
                    {op.wpm} wpm · {n ? `worked ${n === 1 ? 'once' : `${n} times`}` : 'new to you'}
                  </p>
                </div>
                <button
                  type="button"
                  className="lesson__go"
                  aria-label={`Answer ${op.name}`}
                  onClick={() => onAnswer(op)}
                >
                  Answer
                </button>
              </li>
            );
          })}
        </ul>
        {next && (
          <p className="lesson__note">
            Next on the air: {next.op.who}, after {next.more} more{' '}
            {next.more === 1 ? 'contact' : 'contacts'}.
          </p>
        )}
      </div>
      <div className="lesson__card qso__logbook">
        <p className="lesson__kicker">Your logbook</p>
        <p className="qso__count">
          <strong>{radio.contacts}</strong> {radio.contacts === 1 ? 'contact' : 'contacts'} logged
        </p>
        {latest.length > 0 && (
          <ul className="qso__log">
            {latest.map((l, i) => (
              <li key={`${l.day}-${i}`} className={l.ok ? 'is-right' : 'is-wrong'}>
                <span>{l.day}</span>
                <strong>{OP_NAME[l.op] ?? l.op}</strong>
                {!l.ok && <small>didn’t make the log</small>}
              </li>
            ))}
          </ul>
        )}
        <div className="lesson__actions">
          <button type="button" className="lesson__plain" onClick={onRename}>
            Change name or town
          </button>
          <button type="button" className="lesson__plain" onClick={onFar}>
            The Far Station (trial)
          </button>
        </div>
      </div>
    </>
  );
}

/** The logbook names each contact by the operator's name and call. */
const OP_NAME: Record<string, string> = Object.fromEntries(
  OPERATORS.map((o) => [o.id, `${o.name} · ${o.call}`]),
);

function Turn({
  stage,
  startDitMs,
  audio,
  onSlower,
  onCopied,
  onKeyed,
}: {
  stage: Extract<Stage, { kind: 'contact' }>;
  startDitMs: number;
  audio: () => Audio | null;
  onSlower: (wpm: number) => void;
  onCopied: (c: TurnCopies) => void;
  onKeyed: (read: string) => void;
}) {
  const { contact, at, wpm } = stage;
  const steps = contactSteps(contact);
  const step = steps[at] as AirStep;
  const { op } = contact;
  const send = useCallback(
    async (text: string, speed: number) => {
      const pb = await audio()?.player.play(text, {
        charWpm: speed,
        effWpm: speed,
        fist: op.fist,
        route: bandRoute(op.band),
      });
      await pb?.done;
    },
    [audio, op],
  );
  const down = slower(wpm);
  return (
    <>
      <p className="qso__progress">
        Turn {at + 1} of {steps.length} · {op.who} · {wpm} wpm · your call{' '}
        <strong>{contact.me.call}</strong>
      </p>
      {step.kind === 'hear' ? (
        <HearTurn
          kicker={`${op.name} · listen and copy`}
          boxes={step.fields.map((f) => ({ id: f, label: LABELS[f] }))}
          play={() => send(step.text, wpm)}
          qrs={
            down === null
              ? undefined
              : async () => {
                  onSlower(down);
                  await send(`QRS ${step.text}`, down);
                }
          }
          stop={() => audio()?.player.stop()}
          onDone={onCopied}
        />
      ) : (
        <KeyTurn
          text={step.text}
          startDitMs={startDitMs}
          audio={audio}
          readRight={keyedRight}
          asksAgain={(missed) => (
            <>
              {op.name} sends <strong>{op.agn}</strong> They read “{missed || '…'}”. Send it once
              more.
            </>
          )}
          onMissed={() => void send(op.agn, wpm)}
          onDone={onKeyed}
        />
      )}
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
  const { contact, copies, reads, result } = stage;
  const steps = contactSteps(contact);
  const fields = steps.flatMap((s) => (s.kind === 'hear' ? s.fields : []));
  const keys = steps.flatMap((s) => (s.kind === 'key' ? [s.text] : []));
  return (
    <div className="lesson__card send__result">
      <p className={`lesson__pct${result.logged ? ' is-good' : ''}`}>
        {result.copied + result.keyed} / {result.copyTotal + result.keyTotal}
      </p>
      <p className="lesson__kicker">your log · {contact.op.call}</p>
      <h2 className="lesson__title">
        {result.logged
          ? `Contact with ${contact.op.name} logged. 73!`
          : 'The contact didn’t make the log'}
      </h2>
      {!result.logged && (
        <p className="lesson__note">
          A contact is logged when you copied every part and were read every time.
        </p>
      )}
      <ul className="qso__log">
        {fields.map((f) => {
          const ok = airRight(contact, f, copies[f] ?? '');
          return (
            <li key={f} className={ok ? 'is-right' : 'is-wrong'}>
              <span>{LABELS[f]}</span>
              <strong>{copies[f] || '—'}</strong>
              {!ok && <small>they sent {airAnswer(contact, f)}</small>}
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
      <p className="lesson__note">+{result.logged ? RADIO_XP.logged : RADIO_XP.try} XP</p>
      <div className="lesson__actions">
        <button type="button" className="lesson__plain" onClick={onLeave}>
          The Radio Room
        </button>
        <button type="button" className="lesson__go" onClick={onAgain}>
          {result.logged ? `Work ${contact.op.name} again` : 'Try again'}
        </button>
      </div>
    </div>
  );
}
