import { useCallback, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { SayLine } from './SayLine.tsx';
import { cleanTyped, fromHebrew, MAX_TYPED } from './innChat.ts';

// Where a line of yours is typed at the inn (E17): in Arabic on the on-screen keyboard, in Hebrew
// letters turned into Arabic, or said into the microphone. Shared by "Sit and talk" and the
// finale's "Your Story" (task 4.2).

/** The on-screen keyboard: the letters in alphabetical order, then the other forms. */
const LETTERS = [
  ...'ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي'.split(' '),
  ...'ة ى ء أ إ آ ؤ ئ'.split(' '),
];

export function LineInput({
  api,
  hebrew,
  onHebrew,
  disabled,
  onSay,
}: {
  api: SubjectApi;
  /** Typing in Hebrew letters (the player's choice, kept in their progress). */
  hebrew: boolean;
  onHebrew: (on: boolean) => void;
  /** While the other side is answering. */
  disabled: boolean;
  /** The line, cleaned and in Arabic. */
  onSay: (line: string) => void;
}) {
  const [typed, setTyped] = useState('');
  /** What Whisper heard you say: it goes into the text box in Arabic, to fix before sending. */
  const heard = useCallback((text: string) => setTyped(text.slice(0, MAX_TYPED)), []);
  /** What they'll read: what you typed, from Hebrew letters if that's how you type. */
  const line = cleanTyped(hebrew ? fromHebrew(typed) : typed);
  const mode = (on: boolean) => {
    onHebrew(on);
    setTyped('');
  };
  return (
    <>
      <div className="arabic__chat-mode" role="group" aria-label="Type in">
        <button type="button" aria-pressed={!hebrew} onClick={() => mode(false)}>
          Arabic
        </button>
        <button type="button" aria-pressed={hebrew} onClick={() => mode(true)}>
          Hebrew letters
        </button>
      </div>
      <form
        className="arabic__chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!line || disabled) return;
          setTyped('');
          onSay(line);
        }}
      >
        <input
          lang={hebrew ? 'he' : 'ar'}
          dir="rtl"
          aria-label={hebrew ? 'Your line, in Hebrew letters' : 'Your line, in Arabic'}
          value={typed}
          maxLength={MAX_TYPED}
          autoComplete="off"
          onChange={(e) => setTyped(e.target.value)}
        />
        <button type="submit" className="lesson__go" disabled={disabled || !line}>
          Say it
        </button>
      </form>
      <SayLine api={api} disabled={disabled} onHeard={heard} />
      {hebrew ? (
        <>
          <p className="arabic__chat-reads">
            They read:{' '}
            <bdi lang="ar" dir="rtl">
              {line || '…'}
            </bdi>
          </p>
          <p className="arabic__chat-hint">
            A <bdi lang="he">ה</bdi> at the end is <bdi lang="ar">ة</bdi>; type{' '}
            <bdi lang="he">ה׳</bdi> for <bdi lang="ar">ه</bdi>, as in <bdi lang="he">כלה׳</bdi> (
            <bdi lang="ar">كله</bdi>).
          </p>
        </>
      ) : (
        <div className="arabic__keys" role="group" aria-label="Arabic keyboard" dir="rtl">
          {LETTERS.map((l) => (
            <button key={l} type="button" onClick={() => setTyped((t) => t + l)}>
              {l}
            </button>
          ))}
          <button type="button" onClick={() => setTyped((t) => t + '؟')}>
            ؟
          </button>
          <button type="button" onClick={() => setTyped((t) => t + '،')}>
            ،
          </button>
          <button
            type="button"
            className="arabic__key-wide"
            aria-label="Space"
            onClick={() => setTyped((t) => t + ' ')}
          >
            ␣
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => setTyped((t) => [...t].slice(0, -1).join(''))}
          >
            ⌫
          </button>
        </div>
      )}
    </>
  );
}
