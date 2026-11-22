import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '../../../core/Link.tsx';
import type { SubjectApi } from '../../../core/subject.ts';
import type { WireLink, WireState } from '../../../core/fellowship/wire.ts';
import { decode, START_DIT_MS, type Mark } from '../send/decoder.ts';
import { useDeskAudio, type Audio } from '../send/deskAudio.ts';
import { Keying, Strip } from '../send/SendDrill.tsx';
import { Sidetone } from '../send/sidetone.ts';
import { Playback } from './playback.ts';
import '../lesson/lesson.css';
import '../send/send.css';
import './wire.css';

type Friend = { id: string; name: string };

/** The friend's tone: a little higher than yours, so the two keys are easy to tell apart. */
const FRIEND_PITCH = 760;

/**
 * The wire (task 3.6, #331; ADR 0046): two friends at the telegraph table, each hearing the
 * other's key as it happens. Pick a friend, open the line; when they open theirs, you're on.
 */
export function Wire({ api }: { api: SubjectApi }) {
  const audio = useDeskAudio();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [friend, setFriend] = useState<Friend | null>(null);
  /** Counts lines opened, so "Try again" opens a fresh one. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    api.wire.friends().then(
      (f) => live && setFriends(f),
      () => live && setFriends([]),
    );
    return () => {
      live = false;
    };
  }, [api]);

  if (!friends) return <p className="lesson__loading">Checking the lines…</p>;

  if (friend) {
    return (
      <Line
        key={attempt}
        api={api}
        audio={audio}
        friend={friend}
        onRetry={() => setAttempt((n) => n + 1)}
        onHangUp={() => setFriend(null)}
      />
    );
  }

  return (
    <section className="lesson wire" aria-label="The wire">
      <div className="lesson__card lesson__start">
        <p className="lesson__kicker">The telegraph table · live</p>
        <h2 className="lesson__title">Key to a friend</h2>
        {friends.length === 0 ? (
          <p>
            The wire is for friends. Add one with your friend code in{' '}
            <Link href="/house#fellowship">Your House</Link>, and you can key to each other here.
          </p>
        ) : (
          <>
            <p>
              Open a line to a friend. When they open theirs to you, each of you hears the other’s
              key as it happens. Nothing is kept.
            </p>
            <div className="wire__friends">
              {friends.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="lesson__go"
                  onClick={() => {
                    // The tap that opens the line is the one that lets the browser make sound.
                    void audio()?.tone.unlock();
                    setFriend(f);
                  }}
                >
                  Open a line to {f.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function stateLine(state: WireState, name: string): string {
  switch (state) {
    case 'connecting':
      return 'Opening the line…';
    case 'waiting':
      return `Your line is open. Waiting for ${name} to open theirs.`;
    case 'open':
      return `${name} is on the line.`;
    case 'dropped':
      return 'The line dropped. Reconnecting…';
    case 'lost':
      return 'The line is down.';
    case 'failed':
      return `The line couldn’t be opened. Check your connection, and that ${name} is still your friend.`;
  }
}

function Line({
  api,
  audio,
  friend,
  onRetry,
  onHangUp,
}: {
  api: SubjectApi;
  audio: () => Audio | null;
  friend: Friend;
  onRetry: () => void;
  onHangUp: () => void;
}) {
  const [state, setState] = useState<WireState>('connecting');
  const [marks, setMarks] = useState<readonly Mark[]>([]);
  const [held, setHeld] = useState<number | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const link = useRef<WireLink | null>(null);
  const tone = useRef<Sidetone | null>(null);

  const friendTone = useCallback(() => {
    const a = audio();
    if (!a) return null;
    if (!tone.current) {
      tone.current = new Sidetone(a.ctx, FRIEND_PITCH, 0.35);
      void tone.current.unlock();
    }
    return tone.current;
  }, [audio]);

  useEffect(() => {
    const playback = new Playback();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const l = api.wire.open(friend.id, {
      onState: setState,
      onEdge: (edge) => {
        const arrived = performance.now();
        const at = playback.at(edge, arrived);
        const timer = setTimeout(
          () => {
            timers.delete(timer);
            if (edge.down) friendTone()?.down();
            else friendTone()?.up();
            setMarks([...playback.sound(edge, performance.now())]);
            setHeld(playback.held);
          },
          Math.max(0, at - arrived),
        );
        timers.add(timer);
      },
    });
    link.current = l;
    return () => {
      timers.forEach(clearTimeout);
      l.close();
      link.current = null;
      tone.current?.close();
      tone.current = null;
    };
  }, [api, friend.id, friendTone]);

  // A clock for the friend's strip and reading.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setNow(performance.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const send = useCallback((down: boolean, t: number) => link.current?.key(down, t), []);
  const heard = decode(marks, { startDitMs: START_DIT_MS, now });
  const ended = state === 'lost' || state === 'failed';

  return (
    <section className="lesson wire" aria-label={`The wire to ${friend.name}`}>
      <p
        className={`wire__state wire__state--${state}`}
        role={ended ? 'alert' : 'status'}
        aria-live="polite"
      >
        <span className="wire__lamp" aria-hidden="true" />
        {stateLine(state, friend.name)}
      </p>
      <div className="lesson__card wire__theirs">
        <p className="send__read" aria-live="polite">
          <span className="send__read-label">{friend.name} keys</span>
          <span className="send__read-text" data-testid="wire-heard">
            {heard.text || (heard.keying ? '' : '…')}
            {heard.keying && <span className="send__keying" aria-label="keying" />}
          </span>
        </p>
        <Strip marks={[...marks]} downAt={held} now={now} />
      </div>
      <Keying
        text=""
        free
        startDitMs={START_DIT_MS}
        audio={audio}
        onDone={() => {}}
        onEdge={send}
        readLabel="You key"
      />
      <div className="lesson__actions wire__actions">
        {ended && (
          <button type="button" className="lesson__go" onClick={onRetry}>
            Try again
          </button>
        )}
        <button type="button" className="lesson__plain" onClick={onHangUp}>
          Hang up
        </button>
      </div>
    </section>
  );
}
