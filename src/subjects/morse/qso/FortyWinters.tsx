import { useEffect, useMemo, useRef, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { BEACON_STAGE, paintBeacon } from '../../../core/city/paintBeacon.ts';
import { pictureUrl } from '../../../core/city/picture.ts';
import { NextStep } from '../../../core/road/NextStep.tsx';
import { parseProgress, type MorseProgress } from '../lesson/progress.ts';
import { decode, START_DIT_MS } from '../send/decoder.ts';
import { useDeskAudio, type Audio } from '../send/deskAudio.ts';
import { Keying } from '../send/SendDrill.tsx';
import {
  applyFinale,
  choicesFor,
  FINALE_STORY,
  FINALE_WPM,
  FINALE_XP,
  finaleOpen,
  finalePassed,
  finaleResult,
  pickMessage,
  reportFinale,
  type FinaleMessage,
  type FinaleResult,
} from './fortyWinters.ts';
import '../lesson/lesson.css';
import '../send/send.css';
import './qso.css';
import '../../../core/city/finale.css';
import './finale.css';

// Forty Winters (tasks 4.2 and 4.3; ADR 0047): the Silent Beacon's last step. Hear the far voice
// once, answer three questions about what it said, key the reply; then the finale screen. The
// rules are in fortyWinters.ts, the story in content/morse/finale.json.

type Stage =
  | { kind: 'intro' }
  | { kind: 'hear'; message: FinaleMessage; started: number }
  | { kind: 'ask'; message: FinaleMessage; started: number; choices: string[][] }
  | { kind: 'key'; message: FinaleMessage; started: number; answers: string[] }
  | { kind: 'result'; message: FinaleMessage; answers: string[]; result: FinaleResult; xp: number };

/** `?run=short` plays only the message's first word (for tests: the whole one takes 40 s). */
const SHORT =
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('run') === 'short';

export function FortyWinters({ api, onRoom }: { api: SubjectApi; onRoom?: () => void }) {
  const [progress, setProgress] = useState<MorseProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
  const last = useRef<string | null>(null);
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
  if (!progress) return <p className="lesson__loading">Climbing to the lantern room…</p>;

  const begin = () => {
    void audio()?.tone.unlock();
    const message = pickMessage(last.current);
    last.current = message.id;
    setStage({ kind: 'hear', message, started: performance.now() });
  };

  const finish = (s: Extract<Stage, { kind: 'key' }>, text: string, ditMs: number) => {
    const result = finaleResult(s.message, s.answers, { text, ditMs });
    const first = result.passed && !finalePassed(progress);
    const next = applyFinale(progress, result);
    setProgress(next);
    setStage({
      kind: 'result',
      message: s.message,
      answers: s.answers,
      result,
      xp: first ? FINALE_XP.pass : FINALE_XP.try,
    });
    reportFinale(api, progress, next, result, (performance.now() - s.started) / 1000).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  return (
    <section className="lesson send qso finale" aria-label={FINALE_STORY.title}>
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your night at the key couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {stage.kind === 'intro' && (
        <Intro ready={finaleOpen(progress)} passed={finalePassed(progress)} onBegin={begin} />
      )}
      {stage.kind === 'hear' && (
        <Hear
          message={stage.message}
          audio={audio}
          onHeard={() =>
            setStage({
              ...stage,
              kind: 'ask',
              choices: stage.message.questions.map((q) => choicesFor(q)),
            })
          }
        />
      )}
      {stage.kind === 'ask' && (
        <Ask
          message={stage.message}
          choices={stage.choices}
          onDone={(answers) => setStage({ ...stage, kind: 'key', answers })}
        />
      )}
      {stage.kind === 'key' && (
        <div className="finale__key">
          <p className="qso__say">
            Now the reply. Key it at 15 wpm or faster, cleanly:{' '}
            <strong>{stage.message.reply}</strong>
          </p>
          <Keying
            text={stage.message.reply}
            startDitMs={progress.sending.ditMs ?? START_DIT_MS}
            audio={audio}
            onDone={(marks) => {
              const read = decode(marks, {
                startDitMs: progress.sending.ditMs ?? START_DIT_MS,
              });
              finish(stage, read.text, read.ditMs);
            }}
          />
        </div>
      )}
      {stage.kind === 'result' &&
        (stage.result.passed ? (
          <Finale xp={stage.xp} onRoom={onRoom} />
        ) : (
          <Missed stage={stage} onAgain={begin} />
        ))}
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
      <p className="lesson__kicker">The finale · the Silent Beacon</p>
      <h2 className="lesson__title">{FINALE_STORY.title}</h2>
      <p>{FINALE_STORY.intro}</p>
      <p className="lesson__note">{FINALE_STORY.rules}</p>
      {passed && <p className="lesson__note">Passed. The far voice sends every night.</p>}
      {ready ? (
        <button type="button" className="lesson__go" onClick={onBegin}>
          Listen
        </button>
      ) : (
        <p className="lesson__note">Opens once you are a Ghost of the Ether.</p>
      )}
    </div>
  );
}

/** The message, once. Nothing to type: head copy. */
function Hear({
  message,
  audio,
  onHeard,
}: {
  message: FinaleMessage;
  audio: () => Audio | null;
  onHeard: () => void;
}) {
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    let live = true;
    void (async () => {
      const pb = await audio()?.player.play(
        SHORT ? (message.text.split(' ')[0] ?? '') : message.text,
        {
          charWpm: FINALE_WPM,
          effWpm: FINALE_WPM,
        },
      );
      await pb?.done;
      if (live) setPlaying(false);
    })();
    return () => {
      live = false;
      audio()?.player.stop();
    };
  }, [audio, message.text]);
  return (
    <div className="lesson__card qso__card">
      <p className="lesson__kicker">The far voice · {FINALE_WPM} wpm, once</p>
      <p className="qso__air" aria-live="polite">
        {playing ? 'On the air… Listen. Don’t write.' : 'Quiet now.'}
      </p>
      <div className="lesson__actions">
        <button type="button" className="lesson__go" disabled={playing} onClick={onHeard}>
          I have it
        </button>
      </div>
    </div>
  );
}

function Ask({
  message,
  choices,
  onDone,
}: {
  message: FinaleMessage;
  choices: string[][];
  onDone: (answers: string[]) => void;
}) {
  const [answers, setAnswers] = useState<string[]>([]);
  const filled = message.questions.every((_, i) => answers[i]);
  return (
    <form
      className="lesson__card qso__card"
      onSubmit={(e) => {
        e.preventDefault();
        if (filled) onDone(answers);
      }}
    >
      <p className="lesson__kicker">What did it say?</p>
      {message.questions.map((q, i) => (
        <fieldset key={q.ask} className="qso__choices">
          <legend>{q.ask}</legend>
          {(choices[i] ?? []).map((c) => (
            <label key={c} className={answers[i] === c ? 'is-picked' : ''}>
              <input
                type="radio"
                name={`q${i}`}
                value={c}
                checked={answers[i] === c}
                onChange={() =>
                  setAnswers((a) => {
                    const next = [...a];
                    next[i] = c;
                    return next;
                  })
                }
              />
              {c}
            </label>
          ))}
        </fieldset>
      ))}
      <div className="lesson__actions">
        <button type="submit" className="lesson__go" disabled={!filled}>
          Answer it
        </button>
      </div>
    </form>
  );
}

function Missed({
  stage,
  onAgain,
}: {
  stage: Extract<Stage, { kind: 'result' }>;
  onAgain: () => void;
}) {
  const { message, answers, result, xp } = stage;
  return (
    <div className="lesson__card send__result">
      <p className="lesson__kicker">The far voice has signed off</p>
      <h2 className="lesson__title">Not tonight</h2>
      <p>{FINALE_STORY.missed}</p>
      <p className="lesson__note">It sent: {message.text}</p>
      <ul className="qso__log">
        {message.questions.map((q, i) => {
          const ok = answers[i] === q.answer;
          return (
            <li key={q.ask} className={ok ? 'is-right' : 'is-wrong'}>
              <span>{q.ask}</span>
              <strong>{answers[i] || '—'}</strong>
              {!ok && <small>it said: {q.answer}</small>}
            </li>
          );
        })}
        <li className={result.read ? 'is-right' : 'is-wrong'}>
          <span>Your reply</span>
          <strong>{message.reply}</strong>
          {!result.read && <small>the tower couldn’t read all of it</small>}
        </li>
        <li className={result.fast ? 'is-right' : 'is-wrong'}>
          <span>Your speed</span>
          <strong>{result.wpm} wpm</strong>
          {!result.fast && <small>15 wpm or faster</small>}
        </li>
      </ul>
      <p className="lesson__note">+{xp} XP</p>
      <div className="lesson__actions">
        <NextStep onHere={onAgain} />
        <button type="button" className="lesson__go" onClick={onAgain}>
          Listen again
        </button>
      </div>
    </div>
  );
}

/** The finale screen: worth reaching. */
function Finale({ xp, onRoom }: { xp: number; onRoom?: () => void }) {
  const picture = useMemo(() => pictureUrl('beacon', BEACON_STAGE, paintBeacon), []);
  return (
    <div className="lesson__card finale__card">
      <img className="finale__picture" src={picture} alt={FINALE_STORY.screen} />
      <p className="lesson__kicker">The Silent Beacon · the end of the road</p>
      <h2 className="lesson__title">{FINALE_STORY.title}</h2>
      <p className="finale__epilogue">{FINALE_STORY.epilogue}</p>
      <p className="finale__reward">
        You are <strong>Keeper of the Hour</strong>. The beacon lens is in your wardrobe.
      </p>
      <p className="lesson__note">+{xp} XP</p>
      <div className="lesson__actions">
        {onRoom && (
          <button type="button" className="lesson__go" onClick={onRoom}>
            Somebody is calling: the Radio Room
          </button>
        )}
      </div>
    </div>
  );
}
