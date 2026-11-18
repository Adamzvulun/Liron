import { useEffect, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { LESSON_COUNT } from '../letters.ts';
import { applyTrial, parseProgress, type ArabicProgress } from '../progress.ts';
import { CHAPTER, questStatus } from '../questline.ts';
import { ArabicText } from '../ArabicText.tsx';
import { DECK, wordsFrom, type Word } from '../words.ts';
import { readQuestions, seeded, type Question, sessionAudio } from './questions.ts';
import { reportSession, scoreOf, xpFor, type Answer } from './report.ts';
import { Practice } from './ScriptLesson.tsx';
import { useAudio } from './useAudio.ts';
import { NextStep } from '../../../core/road/NextStep.tsx';
import { NoDeck } from '../NoDeck.tsx';

type Stage =
  | { kind: 'start' }
  | { kind: 'practice'; questions: Question[]; index: number; answers: Answer[]; startedAt: number }
  | { kind: 'result'; answers: Answer[]; passed: boolean };

/**
 * The Painted Sign (#43), the trial at the end of "The Long Road In" chapter 1: read the inn's
 * signs, words from every letter, at 90% or better. Passing makes you ضيف, a guest of the house.
 */
export function Trial({ api }: { api: SubjectApi }) {
  const [progress, setProgress] = useState<ArabicProgress | null>(null);
  const [words, setWords] = useState<Word[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'start' });
  const play = useAudio(api, stage?.kind === 'practice' ? sessionAudio(stage.questions) : []);
  const trial = CHAPTER.trial;

  useEffect(() => {
    let live = true;
    Promise.all([api.loadState(), api.privateContent(DECK)]).then(
      ([state, pack]) => {
        if (!live) return;
        setProgress(parseProgress(state));
        setWords(wordsFrom(pack.items));
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [api]);

  if (failed)
    return (
      <p className="lesson__card">
        The inn’s ledger couldn’t be read. Check your connection and reload the page.
      </p>
    );
  if (!progress || !words) return <p className="arabic__loading">Lighting the lamps…</p>;
  if (words.length === 0) return <NoDeck what="words" />;
  // Reached by its address before every milestone is lit (code review, 2026-11-04).
  if (!progress.guest && !questStatus(progress).trialReady)
    return (
      <p className="lesson__card">
        Not yet: light all {CHAPTER.lessons} milestones on the road first.
      </p>
    );

  const begin = () =>
    setStage({
      kind: 'practice',
      questions: readQuestions(
        words,
        LESSON_COUNT,
        seeded(Date.now()),
        trial.words,
        progress.knownChoices,
      ),
      index: 0,
      answers: [],
      startedAt: performance.now(),
    });

  const finish = (answers: Answer[], startedAt: number) => {
    const { next, passed } = applyTrial(progress, scoreOf(answers), trial.accuracy);
    setProgress(next);
    setStage({ kind: 'result', answers, passed });
    reportSession(
      api,
      next,
      answers,
      passed ? trial.xp : 0,
      (performance.now() - startedAt) / 1000,
    ).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  const current = stage.kind === 'practice' ? stage.questions[stage.index] : undefined;
  return (
    <section className="lesson arabic" aria-label="Trial">
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your trial couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {stage.kind === 'start' && (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">Trial · {CHAPTER.questline} · Chapter 1</p>
          <h2 className="lesson__title">{trial.name}</h2>
          <p>{trial.text}</p>
          {progress.guest && (
            <p className="arabic__note">You’re already a guest here. This run is practice.</p>
          )}
          <button type="button" className="lesson__go" onClick={begin}>
            Read the sign
          </button>
        </div>
      )}
      {stage.kind === 'practice' && stage.questions.length === 0 && (
        <p className="lesson__card">
          No words are ready for this yet: the deck has none that use only the letters you’ve met.
          Meet the next letters first.
        </p>
      )}
      {stage.kind === 'practice' && current && (
        <Practice
          key={stage.index}
          question={current}
          index={stage.index}
          count={stage.questions.length}
          play={play}
          onAnswered={(answer) => {
            const answers = [...stage.answers, answer];
            if (stage.index + 1 >= stage.questions.length) finish(answers, stage.startedAt);
            else setStage({ ...stage, index: stage.index + 1, answers });
          }}
        />
      )}
      {stage.kind === 'result' && (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">{trial.name}</p>
          <p className="arabic__pct">{Math.round(scoreOf(stage.answers) * 100)}%</p>
          {stage.passed ? (
            <>
              <blockquote className="arabic__beat">
                <ArabicText text={CHAPTER.outro} />
              </blockquote>
              <p className="arabic__rank-won">
                You are <bdi lang="ar">ضيف</bdi>, a guest of the house.
              </p>
            </>
          ) : (
            <p>
              {progress.guest
                ? 'Good practice. The sign still reads the same.'
                : `You need ${Math.round(trial.accuracy * 100)}% to pass. The innkeeper waits: try again when you’re ready.`}
            </p>
          )}
          <p className="arabic__xp">+{xpFor(stage.answers, stage.passed ? trial.xp : 0)} XP</p>
          <NextStep />
          {!stage.passed && (
            <button type="button" className="lesson__go" onClick={begin}>
              Try again
            </button>
          )}
        </div>
      )}
    </section>
  );
}
