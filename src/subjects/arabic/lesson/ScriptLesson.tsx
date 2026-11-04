import { useEffect, useMemo, useRef, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { formsOf, LESSONS, type Letter } from '../letters.ts';
import { applySession, parseProgress, PASSES_NEEDED, type ArabicProgress } from '../progress.ts';
import { DECK, readableWith, wordsFrom, type Word } from '../words.ts';
import { listenQuestions, readQuestions, seeded, type Question } from './questions.ts';
import { LESSON_BONUS, reportSession, scoreOf, xpFor, type Answer } from './report.ts';
import { useAudio } from './useAudio.ts';

type Stage =
  | { kind: 'meet'; index: number }
  | { kind: 'practice'; questions: Question[]; index: number; answers: Answer[]; startedAt: number }
  | { kind: 'result'; answers: Answer[]; passed: boolean; next: ArabicProgress };

/** An Arabic word, right to left, in the Arabic font. */
export function Ar({ children, className }: { children: string; className?: string }) {
  return (
    <bdi lang="ar" dir="rtl" className={className}>
      {children}
    </bdi>
  );
}

/** Practice of one kind only, from the courtyard: the fountain (listen), the storyteller (read). */
export type Only = 'listen' | 'read';

/** Questions in a fountain or storyteller round. */
export const ONLY_COUNT = 12;

/**
 * A script lesson (#38–#41): meet the new letters, then Listen and Read, then the result.
 * With `only`, a round of one kind over the letters you know: practice that feeds your reviews
 * and ratings but doesn't count toward passing a lesson.
 */
export function ScriptLesson({ api, only }: { api: SubjectApi; only?: Only }) {
  const [progress, setProgress] = useState<ArabicProgress | null>(null);
  const [words, setWords] = useState<Word[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage | null>(null);
  const play = useAudio(api);

  useEffect(() => {
    let live = true;
    Promise.all([api.loadState(), api.privateContent(DECK)]).then(
      ([state, pack]) => {
        if (!live) return;
        const p = parseProgress(state);
        setProgress(p);
        setWords(wordsFrom(pack.items));
        const fresh = LESSONS[p.lesson - 1]?.letters.filter((l) => !p.met.includes(l.id)) ?? [];
        setStage(fresh.length && !only ? { kind: 'meet', index: 0 } : null);
      },
      () =>
        live &&
        setFailed('The inn’s ledger couldn’t be read. Check your connection and reload the page.'),
    );
    return () => {
      live = false;
    };
  }, [api, only]);

  if (failed) return <p className="lesson__card">{failed}</p>;
  if (!progress || !words) return <p className="arabic__loading">Lighting the lamps…</p>;
  if (words.length === 0)
    return <p className="lesson__card">The deck’s words haven’t been loaded into Waymark yet.</p>;

  const lesson = LESSONS[progress.lesson - 1];
  if (!lesson) return null;

  // A fountain or storyteller round uses the letters you've met: this lesson's once you've
  // met them, the ones before it otherwise.
  const metAll = lesson.letters.every((l) => progress.met.includes(l.id));
  const knownLesson = progress.done || metAll ? lesson.order : Math.max(1, lesson.order - 1);

  const startPractice = () => {
    const rand = seeded(Date.now());
    setStage({
      kind: 'practice',
      questions:
        only === 'listen'
          ? listenQuestions(words, knownLesson, rand, ONLY_COUNT)
          : only === 'read'
            ? readQuestions(words, knownLesson, rand, ONLY_COUNT)
            : [
                ...listenQuestions(words, lesson.order, rand),
                ...readQuestions(words, lesson.order, rand),
              ],
      index: 0,
      answers: [],
      startedAt: performance.now(),
    });
  };

  const finish = (answers: Answer[], startedAt: number) => {
    const { next, passed } = only
      ? { next: { ...progress, sessions: progress.sessions + 1 }, passed: false }
      : applySession(
          progress,
          scoreOf(answers),
          lesson.letters.map((l) => l.id),
        );
    setProgress(next);
    setStage({ kind: 'result', answers, passed, next });
    reportSession(
      api,
      next,
      answers,
      passed ? LESSON_BONUS : 0,
      (performance.now() - startedAt) / 1000,
    ).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  return (
    <section className="lesson arabic" aria-label="Script lesson">
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your session couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {!stage && only && <OnlyStart only={only} lesson={knownLesson} onStart={startPractice} />}
      {!stage && !only && (
        <Start
          lesson={lesson.order}
          title={lesson.title}
          letters={lesson.letters}
          progress={progress}
          onMeet={() => setStage({ kind: 'meet', index: 0 })}
          onStart={startPractice}
        />
      )}
      {stage?.kind === 'meet' && (
        <Meet
          letter={lesson.letters[stage.index] as Letter}
          count={lesson.letters.length}
          index={stage.index}
          words={words}
          known={lesson.order}
          play={play}
          onNext={() =>
            stage.index + 1 < lesson.letters.length
              ? setStage({ kind: 'meet', index: stage.index + 1 })
              : startPractice()
          }
        />
      )}
      {stage?.kind === 'practice' && (
        <Practice
          key={stage.index}
          question={stage.questions[stage.index] as Question}
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
      {stage?.kind === 'result' && (
        <Result
          stage={stage}
          only={only}
          onAgain={() =>
            !only && lesson.letters.some((l) => !stage.next.met.includes(l.id))
              ? setStage({ kind: 'meet', index: 0 })
              : startPractice()
          }
        />
      )}
    </section>
  );
}

const ONLY_TEXT = {
  listen: {
    place: 'The fountain',
    title: 'Which letter?',
    text: 'Travellers call out words by the water. Name the first letter of each.',
  },
  read: {
    place: 'The storyteller',
    title: 'Short words',
    text: 'The storyteller points at words in her book. Say how each one sounds.',
  },
} as const;

function OnlyStart({ only, lesson, onStart }: { only: Only; lesson: number; onStart: () => void }) {
  const t = ONLY_TEXT[only];
  return (
    <div className="lesson__card lesson__start">
      <p className="lesson__kicker">
        {t.place} · letters up to lesson {lesson}
      </p>
      <h2 className="lesson__title">{t.title}</h2>
      <p>{t.text}</p>
      <p className="arabic__note">
        Practice: {ONLY_COUNT} questions. It sharpens your letters but doesn’t pass a lesson.
      </p>
      <button type="button" className="lesson__go" onClick={onStart}>
        Begin
      </button>
    </div>
  );
}

function Start({
  lesson,
  title,
  letters,
  progress,
  onMeet,
  onStart,
}: {
  lesson: number;
  title: string;
  letters: readonly Letter[];
  progress: ArabicProgress;
  onMeet: () => void;
  onStart: () => void;
}) {
  return (
    <div className="lesson__card lesson__start">
      <p className="lesson__kicker">
        The scribe’s table · lesson {lesson} of {LESSONS.length}
      </p>
      <h2 className="lesson__title">{title}</h2>
      <p className="arabic__row">
        {letters.map((l) => (
          <Ar key={l.id} className="arabic__chip">
            {l.letter}
          </Ar>
        ))}
      </p>
      <p>
        Listen for each word’s first letter, then read short words. Score 90% in {PASSES_NEEDED}{' '}
        sessions in a row to learn these letters
        {progress.streak > 0 ? ` (you have ${progress.streak} of ${PASSES_NEEDED})` : ''}.
      </p>
      {progress.done && (
        <p className="arabic__note">You’ve learned every letter. Keep them sharp.</p>
      )}
      <div className="lesson__actions">
        <button type="button" className="lesson__plain" onClick={onMeet}>
          Meet the letters again
        </button>
        <button type="button" className="lesson__go" onClick={onStart}>
          Practise
        </button>
      </div>
    </div>
  );
}

const FORM_NAMES = [
  ['isolated', 'Alone'],
  ['initial', 'Start'],
  ['medial', 'Middle'],
  ['final', 'End'],
] as const;

function Meet({
  letter,
  index,
  count,
  words,
  known,
  play,
  onNext,
}: {
  letter: Letter;
  index: number;
  count: number;
  words: readonly Word[];
  known: number;
  play: (path: string) => void;
  onNext: () => void;
}) {
  const forms = formsOf(letter);
  const examples = useMemo(() => {
    const knownIds = new Set(LESSONS.slice(0, known).flatMap((l) => l.letters.map((x) => x.id)));
    const has = (w: Word) => w.letters.some((l) => l.id === letter.id) && w.letters.length <= 6;
    const readable = readableWith(words, knownIds).filter(has);
    const starts = words.filter((w) => w.letters[0]?.id === letter.id && w.letters.length <= 5);
    return [...new Set([...readable, ...starts, ...words.filter(has)])].slice(0, 3);
  }, [words, letter, known]);
  return (
    <div className="lesson__card arabic__meet">
      <p className="lesson__kicker">
        Meet a letter · {index + 1} of {count}
      </p>
      <div className="arabic__hero">
        <Ar className="arabic__big">{letter.letter}</Ar>
        <div>
          <p className="arabic__bridge">
            Like <bdi lang="he">{letter.hebrew}</bdi>
          </p>
          <p className="arabic__name">
            <Ar>{letter.name}</Ar> · {letter.nameLatin}
          </p>
          <p className="arabic__sound">Sound: /{letter.sound}/</p>
        </div>
      </div>
      <div className="arabic__forms" role="list" aria-label="Its shapes">
        {FORM_NAMES.map(([key, name]) => {
          const shape = forms[key];
          return (
            <div key={key} className={`arabic__form${shape ? '' : ' is-none'}`} role="listitem">
              {shape ? (
                <Ar className="arabic__form-glyph">{shape}</Ar>
              ) : (
                <span className="arabic__form-glyph">–</span>
              )}
              <span>{name}</span>
            </div>
          );
        })}
      </div>
      <p className="arabic__joins">
        {letter.letter === 'ء'
          ? 'It stands alone: it never joins either side.'
          : letter.connectsForward
            ? 'It joins the next letter.'
            : 'It never joins the next letter: a small gap follows it.'}
      </p>
      {letter.note && <p className="arabic__note">{letter.note}</p>}
      {examples.length > 0 && (
        <ul className="arabic__examples">
          {examples.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                className="arabic__play"
                onClick={() => play(w.audio)}
                aria-label={`Play ${w.meaning || w.sound}`}
              >
                ▶
              </button>
              <Ar className="arabic__example">{w.arabic}</Ar>
              <span>
                {w.sound} · {w.meaning}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="lesson__go" onClick={onNext}>
        {index + 1 < count ? 'Next letter' : 'Start practice'}
      </button>
    </div>
  );
}

export function Practice({
  question,
  index,
  count,
  play,
  onAnswered,
}: {
  question: Question;
  index: number;
  count: number;
  play: (path: string) => void;
  onAnswered: (a: Answer) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const word = question.word;
  const listen = question.kind === 'listen';
  const right = listen
    ? question.choices.findIndex((c) => c.id === question.answer.id)
    : question.choices.indexOf(word.hebrew);
  const played = useRef(false);
  useEffect(() => {
    if (listen && !played.current) {
      played.current = true;
      play(word.audio);
    }
  }, [listen, play, word.audio]);

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (!listen) play(word.audio);
  };
  const next = () =>
    onAnswered({
      kind: question.kind,
      wordId: word.id,
      letters: listen ? [question.answer.id] : [...new Set(word.letters.map((l) => l.id))],
      right: picked === right,
    });

  return (
    <div className="lesson__card arabic__question">
      <p className="lesson__kicker">
        {listen ? 'Listen' : 'Read'} · {index + 1} of {count}
      </p>
      <div className="arabic__bar" aria-hidden="true">
        <span style={{ width: `${(index / count) * 100}%` }} />
      </div>
      {listen ? (
        <>
          <h2 className="lesson__subtitle">Which letter does it start with?</h2>
          <button type="button" className="arabic__listen" onClick={() => play(word.audio)}>
            ▶ Play the word again
          </button>
        </>
      ) : (
        <>
          <h2 className="lesson__subtitle">How does it sound?</h2>
          <Ar className="arabic__word">{word.arabic}</Ar>
        </>
      )}
      <div
        className={`arabic__choices${listen ? '' : ' is-words'}`}
        role="group"
        aria-label="Choices"
      >
        {question.choices.map((c, i) => {
          const label = typeof c === 'string' ? c : c.letter;
          const state =
            picked === null ? '' : i === right ? ' is-right' : i === picked ? ' is-wrong' : '';
          return (
            <button
              key={label}
              type="button"
              className={`arabic__choice${state}`}
              onClick={() => choose(i)}
              disabled={picked !== null}
              lang={listen ? 'ar' : 'he'}
              dir="rtl"
            >
              {label}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="arabic__feedback" aria-live="polite">
          <p className={picked === right ? 'arabic__good' : 'arabic__bad'}>
            {picked === right ? 'Right!' : 'Not quite.'}
          </p>
          <p>
            <Ar className="arabic__example">{word.arabic}</Ar> · <bdi lang="he">{word.hebrew}</bdi>{' '}
            · {word.sound}
            {word.meaning ? ` · ${word.meaning}` : ''}
          </p>
          <button type="button" className="lesson__go" onClick={next} autoFocus>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function Result({
  stage,
  only,
  onAgain,
}: {
  stage: Extract<Stage, { kind: 'result' }>;
  only?: Only;
  onAgain: () => void;
}) {
  const { answers, passed, next } = stage;
  const score = scoreOf(answers);
  const pct = Math.round(score * 100);
  const missed = [
    ...new Set(
      answers.filter((a) => !a.right).flatMap((a) => (a.kind === 'listen' ? a.letters : [])),
    ),
  ];
  return (
    <div className="lesson__card lesson__start">
      <p className="lesson__kicker">Session done</p>
      <p className="arabic__pct">{pct}%</p>
      <p>
        {only
          ? score >= 0.9
            ? 'Sharp. Those letters are settling in.'
            : 'Good practice. The letters you missed are below.'
          : passed
            ? next.done
              ? 'You’ve passed the last script lesson. Every letter is yours.'
              : `Lesson passed! Next: lesson ${next.lesson}, ${LESSONS[next.lesson - 1]?.title ?? ''}.`
            : score >= 0.9
              ? `90% or better: one more session like this passes the lesson.`
              : 'Under 90% this time. Another session will sharpen it.'}
      </p>
      {missed.length > 0 && (
        <p className="arabic__note">
          Listen again for:{' '}
          {missed.map((id) => (
            <Ar key={id} className="arabic__chip">
              {LESSONS.flatMap((l) => l.letters).find((l) => l.id === id)?.letter ?? ''}
            </Ar>
          ))}
        </p>
      )}
      <p className="arabic__xp">+{xpFor(answers, passed ? LESSON_BONUS : 0)} XP</p>
      <button type="button" className="lesson__go" onClick={onAgain}>
        Practise again
      </button>
    </div>
  );
}
