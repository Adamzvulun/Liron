import { useEffect, useMemo, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import {
  applyWordSession,
  parseProgress,
  PASS_SCORE,
  PASSES_NEEDED,
  wordsOpen,
  type ArabicProgress,
} from '../progress.ts';
import { seeded } from '../lesson/questions.ts';
import { useAudio } from '../lesson/useAudio.ts';
import { DECK } from '../words.ts';
import {
  coreWordsFrom,
  pickSession,
  WORD_CHAPTERS,
  wordQuestions,
  wordXp,
  type CoreWord,
  type WordQuestion,
} from './coreWords.ts';
import { reportWords, scoreOfWords, type WordAnswer } from './report.ts';

type Stage =
  | { kind: 'start' }
  | { kind: 'meet'; fresh: CoreWord[]; words: CoreWord[]; index: number }
  | { kind: 'ask'; questions: WordQuestion[]; index: number; answers: WordAnswer[] }
  | { kind: 'result'; answers: WordAnswer[]; passed: boolean; sameDay: boolean };

/** `?run=short` makes a session 3 words (for tests). */
const sessionSize = () =>
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('run') === 'short'
    ? 3
    : undefined;

/**
 * The innkeeper's table (#160): the word path's lessons. Meet a session's new words, then
 * practice them with the words due and the words you know: hear it, read it, or recall it.
 */
export function WordLessons({ api }: { api: SubjectApi }) {
  const [progress, setProgress] = useState<ArabicProgress | null>(null);
  const [chapters, setChapters] = useState<CoreWord[][] | null>(null);
  const [due, setDue] = useState<ReadonlySet<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'start' });
  const [started, setStarted] = useState(0);
  const [size] = useState(sessionSize);

  useEffect(() => {
    let live = true;
    Promise.all([api.loadState(), api.privateContent(DECK), api.dueItems({ limit: 200 })]).then(
      ([state, pack, dueItems]) => {
        if (!live) return;
        setProgress(parseProgress(state));
        setChapters(coreWordsFrom(pack.items));
        setDue(new Set(dueItems.map((d) => d.itemId)));
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [api]);

  const chapterNo = Math.min(progress?.words.chapter ?? 1, WORD_CHAPTERS.length);
  const upcoming = useMemo(() => {
    if (stage.kind === 'meet')
      return stage.fresh.flatMap((w) => [w.audio, ...(w.sentence ? [w.sentence.audio] : [])]);
    if (stage.kind === 'ask') return stage.questions.map((q) => q.word.audio);
    return (chapters?.[chapterNo - 1] ?? []).slice(0, 5).map((w) => w.audio);
  }, [stage, chapters, chapterNo]);
  const play = useAudio(api, upcoming);

  if (failed)
    return (
      <p className="lesson__card">
        The innkeeper’s table couldn’t load. Check your connection and reload the page.
      </p>
    );
  if (!progress || !chapters) return <p className="arabic__loading">Setting the table…</p>;
  if (!wordsOpen(progress))
    return (
      <p className="lesson__card">
        The innkeeper’s table opens once you’re a guest of the house: pass the Painted Sign first.
      </p>
    );
  const chapter = WORD_CHAPTERS[chapterNo - 1];
  if (!chapter || !chapters.some((c) => c.length))
    return <p className="lesson__card">The deck’s words haven’t been loaded into Waymark yet.</p>;

  const met = new Set(progress.words.met);
  const pool = chapters.flat();

  const ask = (words: CoreWord[], now: number) => {
    setStage({
      kind: 'ask',
      questions: wordQuestions(words, pool, seeded(now)),
      index: 0,
      answers: [],
    });
  };

  const begin = (now: number) => {
    setStarted(now);
    const { words, fresh } = pickSession(chapters, chapterNo, met, due, seeded(now), size);
    if (fresh.length) setStage({ kind: 'meet', fresh, words, index: 0 });
    else ask(words, now);
  };

  const finish = (answers: WordAnswer[], now: number) => {
    const fresh = answers.map((a) => a.question.word.deck).filter((d) => !met.has(d));
    const { next, passed, sameDay } = applyWordSession(
      progress,
      scoreOfWords(answers),
      fresh,
      WORD_CHAPTERS.length,
    );
    setProgress(next);
    setStage({ kind: 'result', answers, passed, sameDay });
    reportWords(api, next, answers, passed, (now - started) / 1000).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  const current = stage.kind === 'ask' ? stage.questions[stage.index] : undefined;
  const w = progress.words;
  return (
    <section className="lesson arabic" aria-label="The innkeeper’s table">
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your session couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {stage.kind === 'start' && (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">
            The innkeeper’s table ·{' '}
            {w.done ? 'every chapter' : `chapter ${chapterNo} of ${WORD_CHAPTERS.length}`}
          </p>
          <h2 className="lesson__title">{w.done ? 'Keep them fresh' : chapter.title}</h2>
          <p>
            {w.done
              ? 'You’ve passed every chapter. A session keeps your words fresh.'
              : chapter.theme}
          </p>
          <p className="arabic__note">
            {chapter.words.filter((x) => met.has(x.deck)).length} of {chapter.words.length} words
            met. Score {Math.round(PASS_SCORE * 100)}% in two sessions, on different days, to pass
            the chapter.
            {w.streak > 0 && ` ${w.streak}/${PASSES_NEEDED} so far.`}
          </p>
          <div className="lesson__actions">
            <button type="button" className="lesson__go" onClick={() => begin(Date.now())}>
              Start a session
            </button>
          </div>
        </div>
      )}
      {stage.kind === 'meet' && stage.fresh[stage.index] && (
        <MeetWord
          key={stage.index}
          word={stage.fresh[stage.index] as CoreWord}
          index={stage.index}
          count={stage.fresh.length}
          play={play}
          onNext={(now) =>
            stage.index + 1 < stage.fresh.length
              ? setStage({ ...stage, index: stage.index + 1 })
              : ask(stage.words, now)
          }
        />
      )}
      {stage.kind === 'ask' && current && (
        <Ask
          key={stage.index}
          question={current}
          index={stage.index}
          count={stage.questions.length}
          play={play}
          onAnswered={(right, now) => {
            const answers = [...stage.answers, { question: current, right }];
            if (stage.index + 1 < stage.questions.length)
              setStage({ ...stage, index: stage.index + 1, answers });
            else finish(answers, now);
          }}
        />
      )}
      {stage.kind === 'result' && (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">The innkeeper’s table · done</p>
          <p className="arabic__pct">
            {stage.answers.filter((a) => a.right).length} / {stage.answers.length}
          </p>
          <p>
            {stage.passed
              ? progress.words.done
                ? 'Chapter passed! That’s all 300 words.'
                : `Chapter passed! Next: ${WORD_CHAPTERS[progress.words.chapter - 1]?.title ?? ''}.`
              : stage.sameDay
                ? 'Another good session. Come back tomorrow for the second pass.'
                : scoreOfWords(stage.answers) >= PASS_SCORE
                  ? `A good session: ${progress.words.streak}/${PASSES_NEEDED} toward the chapter.`
                  : `Reach ${Math.round(PASS_SCORE * 100)}% to count toward the chapter.`}
          </p>
          <p className="arabic__xp">
            +{wordXp(stage.answers.filter((a) => a.right).length, stage.passed)} XP
          </p>
          <ul className="arabic__words">
            {stage.answers.map((a) => (
              <li key={a.question.word.deck} className={a.right ? 'is-right' : 'is-wrong'}>
                <bdi lang="ar" dir="rtl">
                  {a.question.word.arabic}
                </bdi>{' '}
                {a.question.word.meaning}
              </li>
            ))}
          </ul>
          <button type="button" className="lesson__go" onClick={() => setStage({ kind: 'start' })}>
            Another session
          </button>
        </div>
      )}
    </section>
  );
}

/** A word's card: the Arabic, how it sounds (Hebrew letters and the deck's Latin), its meaning. */
function WordCard({ word, play }: { word: CoreWord; play: (path: string) => void }) {
  return (
    <div className="arabic__phrase">
      <button
        type="button"
        className="arabic__play"
        onClick={() => play(word.audio)}
        aria-label="Play the word"
      >
        ▶
      </button>
      <bdi lang="ar" dir="rtl" className="arabic__phrase-ar">
        {word.arabic}
      </bdi>
      <bdi lang="he" dir="rtl" className="arabic__phrase-he">
        {word.hebrew}
      </bdi>
      <span className="arabic__phrase-latin">{word.latin}</span>
      <span className="arabic__phrase-meaning">{word.meaning}</span>
    </div>
  );
}

function Sentence({ word, play }: { word: CoreWord; play: (path: string) => void }) {
  const s = word.sentence;
  if (!s) return null;
  return (
    <div className="arabic__sentence">
      <button
        type="button"
        className="arabic__play"
        onClick={() => play(s.audio)}
        aria-label="Play the sentence"
      >
        ▶
      </button>
      <bdi lang="ar" dir="rtl" className="arabic__sentence-ar">
        {s.arabic}
      </bdi>
      <span className="arabic__sentence-en">{s.english}</span>
    </div>
  );
}

function MeetWord({
  word,
  index,
  count,
  play,
  onNext,
}: {
  word: CoreWord;
  index: number;
  count: number;
  play: (path: string) => void;
  onNext: (now: number) => void;
}) {
  useEffect(() => {
    play(word.audio);
  }, [play, word.audio]);
  return (
    <div className="lesson__card arabic__question">
      <p className="lesson__kicker">
        New word · {index + 1} of {count}
      </p>
      <WordCard word={word} play={play} />
      <Sentence word={word} play={play} />
      <div className="lesson__actions">
        <button type="button" className="lesson__go" onClick={() => onNext(Date.now())} autoFocus>
          {index + 1 < count ? 'Next word' : 'Practice'}
        </button>
      </div>
    </div>
  );
}

const PROMPT: Record<WordQuestion['kind'], string> = {
  listen: 'What does it mean?',
  read: 'What does it mean?',
  recall: 'Which one is it?',
};

function Ask({
  question,
  index,
  count,
  play,
  onAnswered,
}: {
  question: WordQuestion;
  index: number;
  count: number;
  play: (path: string) => void;
  onAnswered: (right: boolean, now: number) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const { word, kind } = question;
  useEffect(() => {
    if (kind === 'listen') play(word.audio);
  }, [play, word.audio, kind]);
  const pick = (c: string) => {
    setPicked(c);
    if (kind !== 'listen') play(word.audio);
  };
  return (
    <div className="lesson__card arabic__question">
      <p className="lesson__kicker">
        {kind === 'listen' ? 'Listen' : kind === 'read' ? 'Read' : 'Recall'} · {index + 1} of{' '}
        {count}
      </p>
      <h2 className="lesson__subtitle">{PROMPT[kind]}</h2>
      {kind === 'listen' && (
        <button type="button" className="arabic__listen" onClick={() => play(word.audio)}>
          ▶ Play it again
        </button>
      )}
      {kind === 'read' && (
        <p className="arabic__word">
          <bdi lang="ar" dir="rtl">
            {word.arabic}
          </bdi>
        </p>
      )}
      {kind === 'recall' && <p className="arabic__word arabic__word--meaning">{word.meaning}</p>}
      <div
        className={`arabic__choices${kind === 'recall' ? ' is-words' : ' is-meanings'}`}
        role="group"
        aria-label="Choices"
      >
        {question.choices.map((c) => (
          <button
            key={c}
            type="button"
            lang={kind === 'recall' ? 'ar' : undefined}
            dir={kind === 'recall' ? 'rtl' : undefined}
            className={`arabic__choice${picked === null ? '' : c === question.answer ? ' is-right' : c === picked ? ' is-wrong' : ''}`}
            disabled={picked !== null}
            onClick={() => pick(c)}
          >
            {c}
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className="arabic__feedback arabic__feedback--word" aria-live="polite">
          <p className={picked === question.answer ? 'arabic__good' : 'arabic__bad'}>
            {picked === question.answer ? 'Right!' : 'Not quite.'}
          </p>
          <WordCard word={word} play={play} />
          <button
            type="button"
            className="lesson__go"
            onClick={() => onAnswered(picked === question.answer, Date.now())}
            autoFocus
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
