import { Xp } from '../../../core/player/Xp.tsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAR_WPM, unlockedChars, type MorseProgress } from '../lesson/progress.ts';
import { MorsePlayer } from '../player.ts';
import {
  makeCallsign,
  nextWpm,
  RUSH_CALLS,
  RUSH_START_WPM,
  rushRight,
  summarizeRush,
  xpForRush,
  type RushCall,
} from './rush.ts';

// The callsign rush (#156): a made-up callsign plays at the rush's speed, with standard spacing.
// Type it and press Enter: right makes the next one 2 wpm faster, a miss 2 wpm slower.

/** `?run=short` makes a rush 3 calls (for tests). */
const rushSize = () =>
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('run') === 'short'
    ? 3
    : RUSH_CALLS;

export function Rush({
  progress,
  onDone,
}: {
  progress: MorseProgress;
  onDone: (calls: RushCall[], seconds: number) => void;
}) {
  const unlocked = unlockedChars(progress);
  const keys = unlocked.filter((c) => /^[A-Z0-9]$/.test(c));
  const [size] = useState(rushSize);
  const [calls, setCalls] = useState<RushCall[]>([]);
  const [current, setCurrent] = useState(() => ({
    call: makeCallsign(unlocked),
    wpm: RUSH_START_WPM,
  }));
  const [listening, setListening] = useState(true);
  const [typed, setTyped] = useState('');
  const [flash, setFlash] = useState<RushCall | null>(null);
  const player = useRef<MorsePlayer | null>(null);
  const started = useRef(0);

  useEffect(() => {
    started.current = performance.now();
    return () => player.current?.close();
  }, []);

  useEffect(() => {
    let live = true;
    const p = (player.current ??= new MorsePlayer());
    void p
      .play(current.call, { charWpm: current.wpm })
      .then((pb) => pb.done)
      .then(() => live && setListening(false));
    return () => {
      live = false;
    };
  }, [current]);

  const submit = useCallback(() => {
    if (listening || !typed) return;
    const done: RushCall = { ...current, typed };
    const all = [...calls, done];
    setCalls(all);
    setFlash(done);
    setTyped('');
    if (all.length >= size) {
      onDone(all, (performance.now() - started.current) / 1000);
      return;
    }
    setListening(true);
    setCurrent({ call: makeCallsign(unlocked), wpm: nextWpm(current.wpm, rushRight(done)) });
  }, [listening, typed, current, calls, size, onDone, unlocked]);

  const press = useCallback(
    (k: string) => {
      if (k === 'Enter') submit();
      else if (listening) return;
      else if (k === '⌫') setTyped((t) => t.slice(0, -1));
      else if (keys.includes(k)) setTyped((t) => (t.length < 8 ? t + k : t));
    },
    [submit, listening, keys],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Enter on a focused button presses it, except a letter key: after tapping letters, Enter
      // answers rather than typing the last one again (review, 2026-11-15).
      if (
        e.target instanceof HTMLButtonElement &&
        e.key === 'Enter' &&
        !e.target.closest('.lesson__pad')
      ) {
        return;
      }
      const k = e.key === 'Backspace' ? '⌫' : e.key === 'Enter' ? 'Enter' : e.key.toUpperCase();
      if (k !== '⌫' && k !== 'Enter' && !keys.includes(k)) return;
      e.preventDefault();
      press(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, keys]);

  const score = summarizeRush(calls).score;

  return (
    <div className="lesson__run">
      <div className="lesson__card lesson__copy">
        <p className="lesson__kicker">
          Call {calls.length + 1} of {size} · {current.wpm} wpm · score {score}
          {listening ? ' · listening…' : ' · type the call'}
        </p>
        <div className="lesson__copied words__typed" aria-live="off" data-testid="copied">
          {typed ? (
            <span>{typed}</span>
          ) : (
            <span className="lesson__hint">
              {listening ? 'Listen to the whole call…' : 'Your copy appears here'}
            </span>
          )}
        </div>
        {flash && (
          <p className={`words__flash ${rushRight(flash) ? 'is-right' : 'is-wrong'}`}>
            {rushRight(flash)
              ? `${flash.call} ✓ faster`
              : `${flash.call}: you copied ${flash.typed} · slower`}
          </p>
        )}
        <p className="lesson__keys">On a keyboard: type it · Enter to answer</p>
      </div>
      <div className="lesson__pad" aria-label="Letter keys">
        {keys.map((c) => (
          <button
            key={c}
            type="button"
            className="lesson__key"
            onClick={() => press(c)}
            disabled={listening}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="lesson__aux">
        <button
          type="button"
          className="lesson__key lesson__key--aux"
          onClick={() => press('⌫')}
          disabled={listening}
          aria-label="Delete"
        >
          ⌫
        </button>
        <button
          type="button"
          className="lesson__key lesson__key--aux words__send"
          onClick={submit}
          disabled={listening || !typed}
        >
          Answer
        </button>
      </div>
    </div>
  );
}

export function RushSummaryCard({
  calls,
  best,
  isBest,
  onAgain,
}: {
  calls: RushCall[];
  best: number;
  isBest: boolean;
  onAgain: () => void;
}) {
  const s = summarizeRush(calls);
  return (
    <div className="lesson__card words__result">
      <p className="lesson__kicker">Rush finished</p>
      <p className="lesson__score">
        Score {s.score} · {s.right} of {calls.length} calls · <Xp>{xpForRush(s)}</Xp>
      </p>
      {(isBest || best > 0 || s.topWpm > 0) && (
        <p className="lesson__note words__best">
          {[
            isBest ? 'A new best!' : best > 0 ? `Your best: ${best}` : '',
            s.topWpm > 0
              ? `fastest call copied: ${s.topWpm} wpm${s.topWpm > CHAR_WPM ? ' (above your lesson speed)' : ''}`
              : '',
          ]
            .filter(Boolean)
            .join(' · ')
            .replace(/^f/, 'F')}
        </p>
      )}
      <ul className="words__list">
        {calls.map((c, i) => (
          <li key={i} className={rushRight(c) ? 'is-right' : 'is-wrong'}>
            <strong>{c.call}</strong> <span>{c.wpm} wpm</span>
            {!rushRight(c) && <span> · you copied {c.typed}</span>}
          </li>
        ))}
      </ul>
      <div className="lesson__actions">
        <button type="button" className="lesson__go" onClick={onAgain}>
          Rush again
        </button>
      </div>
    </div>
  );
}
