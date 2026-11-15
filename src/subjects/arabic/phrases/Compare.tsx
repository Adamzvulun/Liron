// Record yourself and compare with the speaker (#45, ADR 0013), with the opt-in "would they
// understand me?" check (ADR 0014). Used by the coffee corner and the word path (#195).
import { useState } from 'react';
import { SpeechError, type Heard, type SpeechProblem } from '../../../core/speech.ts';
import { judge, type Verdict } from './understood.ts';
import { useRecorder } from './useRecorder.ts';

/**
 * Record yourself and play it back beside the speaker. Nothing leaves the browser unless the
 * learner presses the "understood" check (`check`, on the Say it cards only).
 */
export function Compare({
  audio,
  target,
  play,
  check,
}: {
  /** The speaker's recording (a private media path). */
  audio: string;
  /** What should be said, in Arabic, for the "understood" check. */
  target: string;
  play: (path: string) => void;
  check?: (audio: Blob) => Promise<Heard>;
}) {
  const rec = useRecorder();
  if (rec.state === 'unsupported')
    return <p className="arabic__note">Say it aloud, then play the speaker again to compare.</p>;
  return (
    <div className="arabic__compare">
      {rec.state === 'recording' ? (
        <button type="button" className="lesson__go arabic__rec is-on" onClick={rec.stop}>
          ■ Stop
        </button>
      ) : (
        <button
          type="button"
          className="lesson__plain arabic__rec"
          disabled={rec.state === 'starting'}
          onClick={() => void rec.start()}
        >
          ● {rec.url ? 'Record again' : 'Record yourself'}
        </button>
      )}
      {rec.url && (
        <>
          <button type="button" className="lesson__plain" onClick={() => play(audio)}>
            ▶ Speaker
          </button>
          <button
            type="button"
            className="lesson__plain"
            onClick={() => void new Audio(rec.url ?? '').play()}
          >
            ▶ You
          </button>
        </>
      )}
      {rec.url && rec.blob && check && (
        <UnderstoodCheck key={rec.url} audio={rec.blob} target={target} check={check} />
      )}
      {rec.state === 'denied' && (
        <p className="arabic__note">
          No microphone, so no recording: say it aloud and compare by ear.
        </p>
      )}
    </div>
  );
}

const PROBLEMS: Record<SpeechProblem, string> = {
  'daily-limit': 'That’s all of today’s checks. Judge it by ear; more tomorrow.',
  busy: 'Groq is busy right now. Try again in a minute.',
  'too-big': 'That one’s too long to check. Keep it under half a minute.',
  'not-set-up': 'The check isn’t set up yet. Judge it by ear.',
  'signed-out': 'Sign in again to use the check.',
  'not-allowed': 'The check isn’t open to your account. Judge it by ear.',
  failed: 'Couldn’t check that one. Try again, or judge it by ear.',
};

type Checked =
  | { kind: 'ready' }
  | { kind: 'checking' }
  | { kind: 'heard'; heard: string; verdict: Verdict; left: number }
  | { kind: 'problem'; problem: SpeechProblem };

/**
 * "Did it understand you?" (ADR 0014): on request, sends this one recording to Groq and shows
 * what it heard. It only advises; the learner still rates the phrase. With `hint` (shadowing,
 * #196) it only shows what it heard, with no verdict: a take made over the speaker may hold the
 * speaker's voice too.
 */
export function UnderstoodCheck({
  audio,
  target,
  check,
  hint = false,
}: {
  audio: Blob;
  target: string;
  check: (audio: Blob) => Promise<Heard>;
  hint?: boolean;
}) {
  const [state, setState] = useState<Checked>({ kind: 'ready' });
  const run = () => {
    setState({ kind: 'checking' });
    check(audio).then(
      ({ text, left }) =>
        setState({ kind: 'heard', heard: text, verdict: judge(text, target), left }),
      (e: unknown) =>
        setState({ kind: 'problem', problem: e instanceof SpeechError ? e.problem : 'failed' }),
    );
  };
  return (
    <div className="arabic__check" aria-live="polite">
      {(state.kind === 'ready' || state.kind === 'checking') && (
        <>
          <button
            type="button"
            className="lesson__plain"
            disabled={state.kind === 'checking'}
            onClick={run}
          >
            {state.kind === 'checking'
              ? 'Listening…'
              : hint
                ? 'What would they hear?'
                : 'Would they understand me?'}
          </button>
          <p className="arabic__note">
            Sends this recording to Groq, which writes down what it heard.
            {hint && ' Wear headphones when you shadow, or it hears the speaker too.'}
          </p>
        </>
      )}
      {state.kind === 'heard' && hint && (
        <p className="arabic__heard">
          It heard:{' '}
          <bdi lang="ar" dir="rtl" className="arabic__heard-ar">
            {state.heard || '(nothing)'}
          </bdi>
        </p>
      )}
      {state.kind === 'heard' && !hint && (
        <p className={`arabic__heard ${state.verdict.understood ? 'is-right' : 'is-wrong'}`}>
          {state.verdict.understood ? 'Understood ✓' : 'Not quite'} · Groq heard{' '}
          <bdi lang="ar" dir="rtl" className="arabic__heard-ar">
            {state.heard || '(nothing)'}
          </bdi>
        </p>
      )}
      {state.kind === 'problem' && <p className="arabic__note">{PROBLEMS[state.problem]}</p>}
    </div>
  );
}
