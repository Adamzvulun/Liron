import { useEffect, useRef, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { SpeechError } from '../../../core/speech.ts';
import { useRecorder } from '../phrases/useRecorder.ts';

// Say your line instead of typing it (E17, ADR 0014, 0038): one recording goes to Groq Whisper
// through our own function, the same check as "Say it", and what it heard lands in the text box
// for you to fix before you send. Nothing is recorded until you press the button.

const PROBLEM: Record<string, string> = {
  'daily-limit': 'That’s all the listening for today. Type your line instead.',
  'site-limit': 'The listening is used up for everyone today. Type your line instead.',
  'too-big': 'That was too long. Say a shorter line.',
  'not-allowed': 'Listening isn’t open to your account. Type your line instead.',
};

export function SayLine({
  api,
  disabled,
  onHeard,
}: {
  api: SubjectApi;
  disabled: boolean;
  onHeard: (text: string) => void;
}) {
  const rec = useRecorder();
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('');
  const sent = useRef<Blob | null>(null);
  const { blob, reset } = rec;

  useEffect(() => {
    if (!blob || sent.current === blob) return;
    sent.current = blob;
    let live = true;
    setListening(true);
    api.transcribe(blob).then(
      (heard) => {
        if (!live) return;
        setListening(false);
        reset();
        const text = heard.text.trim();
        setNote(text ? '' : 'Nothing was heard. Try again, a little louder.');
        if (text) onHeard(text);
      },
      (e: unknown) => {
        if (!live) return;
        setListening(false);
        reset();
        const problem = e instanceof SpeechError ? e.problem : 'failed';
        setNote(PROBLEM[problem] ?? 'The listening didn’t work just now. Type your line instead.');
      },
    );
    return () => {
      live = false;
    };
  }, [api, blob, reset, onHeard]);

  if (rec.state === 'unsupported') return null;
  const recording = rec.state === 'recording';
  return (
    <div className="arabic__say-line">
      <button
        type="button"
        className="lesson__plain"
        disabled={disabled || listening || rec.state === 'starting'}
        aria-pressed={recording}
        onClick={() => {
          setNote('');
          if (recording) rec.stop();
          else void rec.start();
        }}
      >
        {listening ? 'Listening…' : recording ? '■ Stop' : '🎙 Say your line'}
      </button>
      {rec.state === 'denied' && (
        <p className="arabic__note">The microphone is off for this site. Type your line instead.</p>
      )}
      {note && <p className="arabic__note">{note}</p>}
    </div>
  );
}
