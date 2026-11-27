import { Xp } from '../../../core/player/Xp.tsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NextStep } from '../../../core/road/NextStep.tsx';
import type { SubjectApi } from '../../../core/subject.ts';
import { speedOf, type MorseProgress } from '../lesson/progress.ts';
import { MorsePlayer } from '../player.ts';
import { choicesFor } from '../qso/fortyWinters.ts';
import { Ask } from '../qso/Ask.tsx';
import { openOperators } from '../qso/onAir.ts';
import {
  answersScore,
  buildLine,
  copyBehind,
  copyScore,
  reportLong,
  xpForLong,
} from './longCopy.ts';

// The Long Copy (#509): one line, heard once (below 28 wpm, once more for half credit), then three
// questions; from 28 wpm you type it a word behind. Design: docs/game/morse-speed.md §3.

export function LongCopy({
  api,
  progress,
  onAgain,
  onLeave,
  onScore,
}: {
  api: SubjectApi;
  progress: MorseProgress;
  onAgain: () => void;
  onLeave: () => void;
  /** The milestone check's probe: hands over the score and saves nothing, rates nothing. */
  onScore?: (score: number) => void;
}) {
  const speed = speedOf(progress);
  const behind = copyBehind(speed.charWpm);
  const line = useMemo(() => buildLine(openOperators(progress.radio)), [progress.radio]);
  const choices = useMemo(() => line.questions.map((q) => choicesFor(q)), [line]);
  const [playing, setPlaying] = useState(true);
  const [again, setAgain] = useState(false);
  const [typed, setTyped] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [picked, setPicked] = useState(false);
  const player = useRef<MorsePlayer | null>(null);
  const started = useRef(0);

  const play = async () => {
    try {
      const pb = await (player.current ??= new MorsePlayer()).play(line.text, speed);
      await pb.done;
    } catch {
      // No sound (the browser refused it): the questions still open.
    }
  };
  useEffect(() => {
    let live = true;
    started.current = performance.now();
    void play().then(() => live && setPlaying(false));
    return () => {
      live = false;
      player.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the line plays once, when it is built
  }, [line]);

  const finish = (raw: number) => {
    const s = again ? raw / 2 : raw;
    if (onScore) return onScore(s);
    setScore(s);
    reportLong(api, s, speed.charWpm, (performance.now() - started.current) / 1000).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  const leave = () => {
    player.current?.close();
    onLeave();
  };
  const leaveButton = (
    <button type="button" className="lesson__plain" onClick={leave}>
      Leave
    </button>
  );

  if (score !== null) {
    return (
      <div className="lesson__card words__result">
        <p className="lesson__kicker">The Long Copy · {speed.charWpm} wpm</p>
        <p className="lesson__score">
          {Math.round(score * 100)}% · <Xp>{xpForLong(score)}</Xp>
        </p>
        <p className="words__played">{line.text}</p>
        {behind && <p className="lesson__note">You copied: {typed || 'nothing'}</p>}
        {saveFailed && (
          <p className="lesson__warning" role="alert">
            This round couldn’t be saved. Check your connection.
          </p>
        )}
        <div className="lesson__actions">
          <NextStep onHere={onAgain} />
          <button type="button" className="lesson__go" onClick={onAgain}>
            Another line
          </button>
          {leaveButton}
        </div>
      </div>
    );
  }

  if (behind) {
    return (
      <div className="lesson__card lesson__copy">
        <p className="lesson__kicker" aria-live="polite">
          The Long Copy · {speed.charWpm} wpm, once · {playing ? 'copy one word behind' : 'finish'}
        </p>
        <label className="words__behind">
          Your copy, word by word
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase())}
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className="lesson__actions">
          <button
            type="button"
            className="lesson__go"
            disabled={playing}
            onClick={() => finish(copyScore(line.text, typed))}
          >
            Done
          </button>
          {leaveButton}
        </div>
      </div>
    );
  }

  if (playing)
    return (
      <div className="lesson__card lesson__copy">
        <p className="lesson__kicker">The Long Copy · {speed.charWpm} wpm · listening…</p>
        <p role="status">Listen to the whole line. Nothing shows until it ends.</p>
        <div className="lesson__actions">{leaveButton}</div>
      </div>
    );

  return (
    <>
      {!again && !picked && (
        <button
          type="button"
          className="lesson__plain"
          onClick={() => {
            setAgain(true);
            setPlaying(true);
            void play().then(() => setPlaying(false));
          }}
        >
          Hear it again, for half credit
        </button>
      )}
      <Ask
        message={line}
        choices={choices}
        onDone={(answers) => finish(answersScore(line.questions, answers))}
        onPick={() => setPicked(true)}
      />
      <div className="lesson__actions">{leaveButton}</div>
    </>
  );
}
