import { useEffect, useMemo, useRef, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { formsOf, LESSONS, LETTERS, type Letter } from '../letters.ts';
import { marksOfLesson, marksUpTo, withMarks, type Mark } from '../marks.ts';
import { applySession, parseProgress, PASSES_NEEDED, type ArabicProgress } from '../progress.ts';
import { DECK, readableWith, spokenHebrew, wordsFrom, type Word } from '../words.ts';
import {
  LATIN_AFTER,
  listenQuestions,
  readQuestions,
  seeded,
  type KnownChoices,
  type Question,
  sessionAudio,
} from './questions.ts';
import { LESSON_BONUS, reportSession, scoreOf, xpFor, type Answer } from './report.ts';
import { useAudio } from './useAudio.ts';

type Stage =
  | { kind: 'meet'; index: number }
  | { kind: 'practice'; questions: Question[]; index: number; answers: Answer[]; startedAt: number }
  | {
      kind: 'result';
      answers: Answer[];
      passed: boolean;
      /** A second 90% on the same day: it passes only on a later day. */
      sameDay: boolean;
      next: ArabicProgress;
    };

const stripMarks = (w: string) => withMarks(w, []);
const secondsSince = (t: number) => (performance.now() - t) / 1000;

/** What a lesson introduces, in order: its letters, then its vowel marks (#40). */
type Card = Letter | Mark;
const cardsOf = (lesson: number): Card[] => [
  ...(LESSONS[lesson - 1]?.letters ?? []),
  ...marksOfLesson(lesson),
];
const isMark = (c: Card): c is Mark => 'mark' in c;
/** What a choice shows: a letter to listen for, or a word in Hebrew or Latin letters. */
const choiceLabel = (c: string | { letter: string } | undefined) =>
  typeof c === 'string' ? c : (c?.letter ?? '');

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
  const play = useAudio(api, stage?.kind === 'practice' ? sessionAudio(stage.questions) : []);

  useEffect(() => {
    let live = true;
    Promise.all([api.loadState(), api.privateContent(DECK)]).then(
      ([state, pack]) => {
        if (!live) return;
        const p = parseProgress(state);
        setProgress(p);
        setWords(wordsFrom(pack.items));
        // Meet what you haven't met yet, from the first such card.
        const first = cardsOf(p.lesson).findIndex((c) => !p.met.includes(c.id));
        setStage(first >= 0 && !only ? { kind: 'meet', index: first } : null);
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
  // met them, the ones before it otherwise. None before the first lesson's are met, so a new
  // learner is sent to meet them rather than quizzed on letters never seen (review, 2026-11-15).
  const cards = cardsOf(lesson.order);
  const metAll = lesson.letters.every((l) => progress.met.includes(l.id));
  const knownLesson = progress.done || metAll ? lesson.order : lesson.order - 1;
  if (only && knownLesson < 1) {
    return (
      <p className="lesson__card">
        {ONLY_TEXT[only].place} waits for letters you’ve met. Meet the first ones at the scribe’s
        table first, then come back.
      </p>
    );
  }

  const startPractice = () => {
    const rand = seeded(Date.now());
    setStage({
      kind: 'practice',
      questions:
        only === 'listen'
          ? listenQuestions(words, knownLesson, rand, ONLY_COUNT)
          : only === 'read'
            ? readQuestions(words, knownLesson, rand, ONLY_COUNT, progress.knownChoices)
            : [
                ...listenQuestions(words, lesson.order, rand),
                ...readQuestions(words, lesson.order, rand, undefined, progress.knownChoices),
              ],
      index: 0,
      answers: [],
      startedAt: performance.now(),
    });
  };

  const finish = (answers: Answer[], startedAt: number) => {
    const { next, passed, sameDay } = only
      ? {
          next: {
            ...progress,
            sessions: progress.sessions + 1,
            only: { ...progress.only, [only]: progress.only[only] + 1 },
          },
          passed: false,
          sameDay: false,
        }
      : applySession(
          progress,
          scoreOf(answers),
          cards.map((c) => c.id),
        );
    setProgress(next);
    setStage({ kind: 'result', answers, passed, sameDay, next });
    reportSession(api, next, answers, passed ? LESSON_BONUS : 0, secondsSince(startedAt)).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  const setKnownChoices = (knownChoices: KnownChoices) => {
    const next = { ...progress, knownChoices };
    setProgress(next);
    api.saveState(next).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  const meetIndex = stage?.kind === 'meet' ? stage.index : -1;
  const meetCard = cards[meetIndex];
  const nextCard = () =>
    meetIndex + 1 < cards.length
      ? setStage({ kind: 'meet', index: meetIndex + 1 })
      : startPractice();

  const current = stage?.kind === 'practice' ? stage.questions[stage.index] : undefined;
  return (
    <section className="lesson arabic" aria-label="Script lesson">
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your session couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {!stage && only && (
        <OnlyStart
          only={only}
          lesson={knownLesson}
          onStart={startPractice}
          choices={only === 'read' ? progress.knownChoices : undefined}
          onChoices={setKnownChoices}
        />
      )}
      {!stage && !only && (
        <Start
          lesson={lesson.order}
          title={lesson.title}
          letters={lesson.letters}
          progress={progress}
          onMeet={() => setStage({ kind: 'meet', index: 0 })}
          onStart={startPractice}
          onChoices={setKnownChoices}
        />
      )}
      {meetCard && isMark(meetCard) && (
        <MeetMark
          mark={meetCard}
          index={meetIndex}
          count={cards.length}
          words={words}
          known={lesson.order}
          play={play}
          onNext={nextCard}
        />
      )}
      {meetCard && !isMark(meetCard) && (
        <Meet
          letter={meetCard}
          count={cards.length}
          index={meetIndex}
          words={words}
          known={lesson.order}
          play={play}
          onNext={nextCard}
        />
      )}
      {stage?.kind === 'practice' && stage.questions.length === 0 && (
        <p className="lesson__card">
          No words are ready for this yet: the deck has none that use only the letters you’ve met.
          Meet the next letters first.
        </p>
      )}
      {stage?.kind === 'practice' && current && (
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
      {stage?.kind === 'result' && (
        <Result
          stage={stage}
          only={only}
          onAgain={() =>
            !only && cards.some((c) => !stage.next.met.includes(c.id))
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
    text: 'Travelers call out words by the water. Name the first letter of each.',
  },
  read: {
    place: 'The storyteller',
    title: 'Short words',
    text: 'The storyteller points at words in her book. Say how each one sounds.',
  },
} as const;

/** Latin instead of recordings for well-known words: a choice, for readers who like it. */
function ChoicesToggle({
  choices,
  onChoices,
}: {
  choices: KnownChoices;
  onChoices: (c: KnownChoices) => void;
}) {
  return (
    <label className="arabic__toggle">
      <input
        type="checkbox"
        checked={choices === 'latin'}
        onChange={(e) => onChoices(e.target.checked ? 'latin' : 'sound')}
      />
      Words you know well: show Latin letters instead of recordings
    </label>
  );
}

function OnlyStart({
  only,
  lesson,
  onStart,
  choices,
  onChoices,
}: {
  only: Only;
  lesson: number;
  onStart: () => void;
  choices?: KnownChoices;
  onChoices: (c: KnownChoices) => void;
}) {
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
      {choices && <ChoicesToggle choices={choices} onChoices={onChoices} />}
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
  onChoices,
}: {
  lesson: number;
  title: string;
  letters: readonly Letter[];
  progress: ArabicProgress;
  onMeet: () => void;
  onStart: () => void;
  onChoices: (c: KnownChoices) => void;
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
        sessions in a row, on different days, to learn these letters
        {progress.streak > 0 ? ` (you have ${progress.streak} of ${PASSES_NEEDED})` : ''}.
      </p>
      {progress.done && (
        <p className="arabic__note">You’ve learned every letter. Keep them sharp.</p>
      )}
      {lesson > LATIN_AFTER && (
        <ChoicesToggle choices={progress.knownChoices} onChoices={onChoices} />
      )}
      <div className="lesson__actions">
        <button type="button" className="lesson__plain" onClick={onMeet}>
          Meet the letters again
        </button>
        <button type="button" className="lesson__go" onClick={onStart}>
          Practice
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
        {index + 1 < count ? 'Next' : 'Start practice'}
      </button>
    </div>
  );
}

/** Meet a vowel mark (#40): on a letter you know, with its niqqud twin and deck words. */
function MeetMark({
  mark,
  index,
  count,
  words,
  known,
  play,
  onNext,
}: {
  mark: Mark;
  index: number;
  count: number;
  words: readonly Word[];
  known: number;
  play: (path: string) => void;
  onNext: () => void;
}) {
  const carriers = ['ب', 'ت', 'ن'];
  // Tanween sits on a final alif: بًا is how it looks in words like شكراً.
  const onLetter = (c: string) =>
    mark.id === 'mark:tanween' ? `${c}${mark.mark}ا` : `${c}${mark.mark}`;
  const examples = useMemo(() => {
    const knownIds = new Set(LESSONS.slice(0, known).flatMap((l) => l.letters.map((x) => x.id)));
    const has = (w: Word) => w.arabic.includes(mark.mark) && w.letters.length <= 6;
    const readable = readableWith(words, knownIds).filter(has);
    return [...new Set([...readable, ...words.filter(has)])].slice(0, 3);
  }, [words, mark, known]);
  return (
    <div className="lesson__card arabic__meet">
      <p className="lesson__kicker">
        Meet a vowel mark · {index + 1} of {count}
      </p>
      <div className="arabic__hero">
        <Ar className="arabic__big">{onLetter('ب')}</Ar>
        <div>
          <p className="arabic__bridge">
            Like <bdi lang="he">{`בּ${mark.hebrew}`.normalize('NFC')}</bdi>
          </p>
          <p className="arabic__name">
            <Ar>{mark.name}</Ar> · {mark.nameLatin} · <bdi lang="he">{mark.hebrewName}</bdi>
          </p>
          <p className="arabic__sound">Sound: {mark.sound}</p>
        </div>
      </div>
      <div
        className="arabic__forms arabic__forms--marks"
        role="list"
        aria-label="On letters you know"
      >
        {carriers.map((c) => (
          <div key={c} className="arabic__form" role="listitem">
            <Ar className="arabic__form-glyph">{onLetter(c)}</Ar>
          </div>
        ))}
      </div>
      <p className="arabic__note">{mark.note}</p>
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
              <Ar className="arabic__example">{withMarks(w.arabic, marksUpTo(known))}</Ar>
              <span>
                {w.sound} · {w.meaning}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="lesson__go" onClick={onNext}>
        {index + 1 < count ? 'Next' : 'Start practice'}
      </button>
    </div>
  );
}

/** The deck's special Latin letters that appear in these choices, with their Arabic letters. */
function LatinKey({ choices }: { choices: readonly string[] }) {
  const used = LETTERS.filter((l) => l.latin && choices.some((c) => c.includes(l.latin ?? '')));
  if (!used.length) return null;
  return (
    <p className="arabic__key">
      Key:{' '}
      {used.map((l, i) => (
        <span key={l.id}>
          {i > 0 && ' · '}
          {l.latin} = <Ar>{l.letter}</Ar>
        </span>
      ))}
      . Accents mark the stressed vowel; ā ī ū are long.
    </p>
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
  /** The recording you last played, for a choice of recordings: answered with "This one". */
  const [heard, setHeard] = useState<number | null>(null);
  const word = question.word;
  const listen = question.kind === 'listen';
  const sound = question.kind === 'read' && question.script === 'sound';
  const spoken = spokenHebrew(word);
  const right = listen
    ? question.choices.findIndex((c) => c.id === question.answer.id)
    : question.choices.indexOf(question.answer);
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
    // A recording you picked was just heard; after a wrong one, hear the right one.
    if (!listen && (!sound || i !== right)) play(word.audio);
  };
  const next = () =>
    onAnswered({
      kind: question.kind,
      wordId: word.id,
      letters: listen
        ? [question.answer.id]
        : [...new Set(word.letters.map((l) => l.id)), ...question.marks.map((m) => m.id)],
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
          <h2 className="lesson__subtitle">
            {sound ? 'Which recording says it?' : 'How does it sound?'}
          </h2>
          <Ar className="arabic__word">{question.shown}</Ar>
          {question.shown === stripMarks(question.shown) && word.arabic !== question.shown && (
            <p className="arabic__note">No marks this time, the way real signs are written.</p>
          )}
        </>
      )}
      {sound ? (
        <>
          <div className="arabic__choices is-sounds" role="group" aria-label="Recordings">
            {question.choices.map((c, i) => {
              const state =
                picked === null
                  ? i === heard
                    ? ' is-heard'
                    : ''
                  : i === right
                    ? ' is-right'
                    : i === picked
                      ? ' is-wrong'
                      : '';
              return (
                <button
                  key={c}
                  type="button"
                  className={`arabic__choice arabic__sound${state}`}
                  aria-pressed={picked === null ? i === heard : undefined}
                  onClick={() => {
                    play(c);
                    if (picked === null) setHeard(i);
                  }}
                >
                  ▶ {i + 1}
                  {picked !== null && i === right && <span className="arabic__mark"> ✓</span>}
                  {picked !== null && i === picked && i !== right && (
                    <span className="arabic__mark"> ✕</span>
                  )}
                </button>
              );
            })}
          </div>
          {picked === null && (
            <button
              type="button"
              className="lesson__go"
              disabled={heard === null}
              onClick={() => heard !== null && choose(heard)}
            >
              {heard === null ? 'Play the recordings' : `This one: ${heard + 1}`}
            </button>
          )}
        </>
      ) : (
        <div
          className={`arabic__choices${listen ? '' : ' is-words'}`}
          role="group"
          aria-label="Choices"
        >
          {question.choices.map((c, i) => {
            const label = choiceLabel(c);
            const state =
              picked === null ? '' : i === right ? ' is-right' : i === picked ? ' is-wrong' : '';
            return (
              <button
                key={label}
                type="button"
                className={`arabic__choice${state}`}
                onClick={() => choose(i)}
                disabled={picked !== null}
                lang={listen ? 'ar' : question.script === 'latin' ? 'en' : 'he'}
                dir={!listen && question.script === 'latin' ? 'ltr' : 'rtl'}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
      {!listen && question.script === 'latin' && <LatinKey choices={question.choices} />}
      {picked !== null && (
        <div className="arabic__feedback" aria-live="polite">
          <p className={picked === right ? 'arabic__good' : 'arabic__bad'}>
            {picked === right ? (
              'Right!'
            ) : sound ? (
              `Not quite: it was ${right + 1}.`
            ) : (
              <>
                Not quite: it was{' '}
                <bdi
                  lang={listen ? 'ar' : question.script === 'latin' ? 'en' : 'he'}
                  dir={!listen && question.script === 'latin' ? 'ltr' : 'rtl'}
                >
                  {choiceLabel(question.choices[right])}
                </bdi>
                .
              </>
            )}
          </p>
          <p>
            <Ar className="arabic__example">{word.arabic}</Ar> ·{' '}
            <bdi lang="he">{listen || sound ? word.hebrew : question.answer}</bdi> · {word.sound}
            {word.meaning ? ` · ${word.meaning}` : ''}
          </p>
          {spoken && (
            <p className="arabic__said">
              Said here: <bdi lang="he">{spoken}</bdi>
            </p>
          )}
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
  const { answers, passed, sameDay, next } = stage;
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
            : sameDay
              ? '90% again! Come back tomorrow: one more like this on another day passes the lesson.'
              : score >= 0.9
                ? '90% or better: one more like this on another day passes the lesson.'
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
        Practice again
      </button>
    </div>
  );
}
