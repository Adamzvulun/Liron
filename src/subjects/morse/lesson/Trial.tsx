import { useEffect, useMemo, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { MorsePlayer } from '../player.ts';
import { roman } from '../questline.ts';
import { schedule } from '../timing.ts';
import {
  applyTrial,
  CHAR_WPM,
  parseProgress,
  pendingTrial,
  reportRun,
  unlockedChars,
  weightsFor,
  type MorseProgress,
} from './progress.ts';
import { Run } from './Lesson.tsx';
import type { RunScore } from './score.ts';
import './lesson.css';

// A chapter's trial (#34): with every lamp lit, copy the trial's characters (50) at its accuracy
// (90%) to open the gate. Passing unlocks the next chapter's first character and pays the
// trial's XP; failing costs nothing but the attempt.

type Stage =
  { kind: 'intro' } | { kind: 'run' } | { kind: 'result'; score: RunScore; passed: boolean };

export function Trial({ api, onLeave }: { api: SubjectApi; onLeave: () => void }) {
  const player = useMemo(() => new MorsePlayer(), []);
  useEffect(() => () => player.stop(), [player]);
  const [progress, setProgress] = useState<MorseProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
  /** The trial being faced; kept after passing, when progress no longer has it pending. */
  const [chapter, setChapter] = useState<ReturnType<typeof pendingTrial>>(undefined);

  useEffect(() => {
    let live = true;
    api.loadState().then(
      (s) => {
        if (!live) return;
        const p = parseProgress(s);
        setProgress(p);
        setChapter(pendingTrial(p));
      },
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
  if (!progress) return <p className="lesson__loading">Lighting the lamps…</p>;
  if (!chapter) {
    return <p className="lesson__card">No gate is closed right now. Light the next lamps first.</p>;
  }
  const { trial } = chapter;
  const unlocked = unlockedChars(progress);
  const speed = { charWpm: CHAR_WPM, effWpm: progress.effWpm };

  const finish = (score: RunScore) => {
    const at = new Date();
    const { next, passed } = applyTrial(progress, chapter, score, at);
    setProgress(next);
    setStage({ kind: 'result', score, passed });
    const plan = score.results.map((r) => r.char).join('');
    const seconds = schedule(plan.replace(/(.{5})/g, '$1 '), speed).duration;
    reportRun(api, next, score, false, seconds, at)
      .then(() => (passed ? api.awardXP(trial.xp) : undefined))
      .then(
        () => setSaveFailed(false),
        () => setSaveFailed(true),
      );
  };

  return (
    <section className="lesson" aria-label={`Trial: ${trial.name}`}>
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your trial couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {stage.kind === 'intro' && (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">Chapter {roman(chapter.number)} · Trial</p>
          <h2 className="lesson__title">{trial.name}</h2>
          <p>{trial.text}</p>
          <p className="lesson__note">
            {trial.chars} characters · {Math.round(trial.accuracy * 100)}% to pass · +{trial.xp} XP
          </p>
          <button
            type="button"
            className="lesson__go"
            onClick={() => {
              void player.unlock();
              setStage({ kind: 'run' });
            }}
          >
            Face the trial
          </button>
        </div>
      )}
      {stage.kind === 'run' && (
        <Run
          unlocked={unlocked}
          weights={weightsFor(progress, new Set())}
          speed={speed}
          seconds={0}
          count={trial.chars}
          player={player}
          onDone={finish}
        />
      )}
      {stage.kind === 'result' && (
        <div className="lesson__card lesson__start">
          <p className={`lesson__pct${stage.passed ? ' is-good' : ''}`}>
            {Math.round(stage.score.accuracy * 100)}%
          </p>
          <p className="lesson__kicker">
            {stage.score.right} of {stage.score.played} right
          </p>
          {stage.passed ? (
            <>
              <h2 className="lesson__title">The gate opens</h2>
              <p>{chapter.outro}</p>
              <p className="lesson__note">+{trial.xp} XP · a new chapter begins</p>
              <button type="button" className="lesson__go" onClick={onLeave}>
                Back to the tower hall
              </button>
            </>
          ) : (
            <>
              <h2 className="lesson__title">The gate holds</h2>
              <p>
                {trial.name} needs {Math.round(trial.accuracy * 100)}%. Practise in the lessons, or
                try again now.
              </p>
              <div className="lesson__actions">
                <button type="button" className="lesson__plain" onClick={onLeave}>
                  Back to the hall
                </button>
                <button
                  type="button"
                  className="lesson__go"
                  onClick={() => setStage({ kind: 'run' })}
                >
                  Try again
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
