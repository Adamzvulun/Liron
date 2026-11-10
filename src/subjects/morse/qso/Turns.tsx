import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { decode } from '../send/decoder.ts';
import type { Audio } from '../send/deskAudio.ts';
import { Keying } from '../send/SendDrill.tsx';

// A contact's two kinds of turn, shared by the Far Station (#178) and the stations on the air
// (E16): hear the other station and copy what it sent, or answer it with the key.

/** One thing to copy from a hearing: typed, or picked from a few choices. */
export interface CopyBox {
  id: string;
  label: string;
  choices?: readonly string[];
}

export type Copies = Partial<Record<string, string>>;

export function HearTurn({
  kicker,
  boxes,
  play,
  qrs,
  stop,
  onAgain,
  onDone,
}: {
  kicker: string;
  boxes: readonly CopyBox[];
  /** Plays the turn as the station sends it now. */
  play: () => Promise<void>;
  /**
   * Asks the station to slow down and plays the turn again, even mid-send (you notice it's too
   * fast while it plays); absent when it can't go slower.
   */
  qrs?: () => Promise<void>;
  stop: () => void;
  /** AGN was asked (a repeat). */
  onAgain?: () => void;
  onDone: (c: Copies) => void;
}) {
  const [copies, setCopies] = useState<Copies>({});
  const [again, setAgain] = useState(false);
  const [playing, setPlaying] = useState(true);
  const plays = useRef(0);

  /** Plays with `how`; whoever calls it has set `playing`. */
  const run = useCallback(async (how: () => Promise<void>) => {
    const id = ++plays.current;
    await how();
    if (id === plays.current) setPlaying(false);
  }, []);

  useEffect(() => {
    void run(play);
    return stop;
    // Plays once, when the turn opens; AGN and QRS play again on request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filled = boxes.every((b) => (copies[b.id] ?? '').trim());
  const set = (id: string, v: string) => setCopies((c) => ({ ...c, [id]: v }));

  return (
    <form
      className="lesson__card qso__card"
      onSubmit={(e) => {
        e.preventDefault();
        if (filled) onDone(copies);
      }}
    >
      <p className="lesson__kicker">{kicker}</p>
      <p className="qso__air" aria-live="polite">
        {playing ? 'On the air…' : 'Quiet now.'}
      </p>
      {boxes.map((b) =>
        b.choices ? (
          <fieldset key={b.id} className="qso__choices">
            <legend>{b.label}</legend>
            {b.choices.map((p) => (
              <label key={p} className={copies[b.id] === p ? 'is-picked' : ''}>
                <input
                  type="radio"
                  name={b.id}
                  value={p}
                  checked={copies[b.id] === p}
                  onChange={() => set(b.id, p)}
                />
                {p}
              </label>
            ))}
          </fieldset>
        ) : (
          <label key={b.id} className="qso__field">
            <span>{b.label}</span>
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={copies[b.id] ?? ''}
              onChange={(e) => set(b.id, e.target.value.toUpperCase())}
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
            onAgain?.();
            setPlaying(true);
            void run(play);
          }}
        >
          AGN
        </button>
        {qrs && (
          <button
            type="button"
            className="lesson__plain"
            aria-label="QRS: ask them to send slower"
            onClick={() => {
              setPlaying(true);
              void run(qrs);
            }}
          >
            QRS
          </button>
        )}
        <button type="submit" className="lesson__go" disabled={!filled}>
          Over
        </button>
      </div>
    </form>
  );
}

export function KeyTurn({
  text,
  startDitMs,
  audio,
  readRight,
  asksAgain,
  onMissed,
  onDone,
}: {
  text: string;
  startDitMs: number;
  audio: () => Audio | null;
  /** Whether the station read `read` as `text`. */
  readRight: (text: string, read: string) => boolean;
  /** What the station says when it can't read you, shown with what it read. */
  asksAgain: (read: string) => ReactNode;
  /** The first try couldn't be read (the station may answer it on the air). */
  onMissed?: (read: string) => void;
  onDone: (read: string) => void;
}) {
  /** What the station read the first time, if it couldn't make it out. */
  const [missed, setMissed] = useState<string | null>(null);
  return (
    <>
      <p className="qso__say">
        {missed === null ? <>Your turn: answer them with the key.</> : asksAgain(missed)}
      </p>
      <Keying
        key={missed === null ? 'first' : 'again'}
        text={text}
        startDitMs={startDitMs}
        audio={audio}
        onDone={(marks) => {
          const read = decode(marks, { startDitMs }).text;
          if (readRight(text, read) || missed !== null) onDone(read);
          else {
            setMissed(read);
            onMissed?.(read);
          }
        }}
      />
    </>
  );
}

/**
 * Your own news, keyed freely (ADR 0037): a few words of your day for the operator to answer.
 * Nothing is scored, and you can skip it.
 */
export function FreeTurn({
  name,
  startDitMs,
  audio,
  onDone,
}: {
  /** The operator's name. */
  name: string;
  startDitMs: number;
  audio: () => Audio | null;
  /** What they read, or '' when you skipped. */
  onDone: (read: string) => void;
}) {
  return (
    <>
      <p className="qso__say">
        Your turn to chat: key a few words of your own news for {name}, like{' '}
        <strong>NEW JOB</strong> or <strong>MY DOG IS SICK</strong>, then press Done. It isn’t
        scored. Don’t key anything private: it goes to the AI that writes their answer.
      </p>
      <Keying
        text=""
        free
        startDitMs={startDitMs}
        audio={audio}
        onDone={(marks) => onDone(decode(marks, { startDitMs }).text)}
      />
      <div className="lesson__actions">
        <button type="button" className="lesson__plain" onClick={() => onDone('')}>
          Skip: no news today
        </button>
      </div>
    </>
  );
}
