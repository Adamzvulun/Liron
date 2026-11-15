import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import {
  applyWordSession,
  applyWordTrial,
  parseProgress,
  PASS_SCORE,
  PASSES_NEEDED,
  wordsOpen,
  type ArabicProgress,
} from '../progress.ts';
import { seeded } from '../lesson/questions.ts';
import { ArabicText } from '../ArabicText.tsx';
import { regularStatus, type Regular } from '../questline.ts';
import { useAudio } from '../lesson/useAudio.ts';
import { DECK } from '../words.ts';
import { Compare } from '../phrases/Compare.tsx';
import {
  coreWordsFrom,
  loadOwnSentences,
  pickSession,
  shuffle,
  WORD_CHAPTERS,
  wordQuestions,
  wordXp,
  type CoreWord,
  type WordQuestion,
} from './coreWords.ts';
import {
  cardDue,
  cardsRead,
  grammarFrom,
  loadGrammarCards,
  withCardRead,
  type GrammarCard,
} from './grammar.ts';
import { reportWords, reportWordTrial, scoreOfWords, type WordAnswer } from './report.ts';

type Stage =
  | { kind: 'start' }
  | { kind: 'card'; card: GrammarCard; fresh: CoreWord[]; words: CoreWord[] }
  | { kind: 'book'; open: GrammarCard | null }
  | { kind: 'meet'; fresh: CoreWord[]; words: CoreWord[]; index: number }
  | {
      kind: 'ask';
      questions: WordQuestion[];
      index: number;
      answers: WordAnswer[];
      trial?: Regular;
    }
  | { kind: 'result'; answers: WordAnswer[]; passed: boolean; sameDay: boolean; trial?: Regular };

/** `?run=short` makes a session 3 words (for tests). */
const sessionSize = () =>
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('run') === 'short'
    ? 3
    : undefined;

/**
 * The innkeeper's table (#160): the word path's lessons. Meet a session's new words, then
 * practice them with the words due and the words you know: hear it, read it, or recall it.
 * With `trial`, it's the current regular's trial instead (#161).
 */
export function WordLessons({
  api,
  trial = false,
  onChat,
}: {
  api: SubjectApi;
  trial?: boolean;
  /** Opens "Sit and talk" with the regulars (E17, ADR 0038). */
  onChat?: () => void;
}) {
  const [progress, setProgress] = useState<ArabicProgress | null>(null);
  const [chapters, setChapters] = useState<CoreWord[][] | null>(null);
  const [grammar, setGrammar] = useState<GrammarCard[]>([]);
  const [due, setDue] = useState<ReadonlySet<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'start' });
  const [started, setStarted] = useState(0);
  const [size] = useState(sessionSize);

  useEffect(() => {
    let live = true;
    Promise.all([
      api.loadState(),
      api.privateContent(DECK),
      api.dueItems({ limit: 200 }),
      loadOwnSentences(),
      loadGrammarCards(),
    ]).then(
      ([state, pack, dueItems, own, cards]) => {
        if (!live) return;
        setProgress(parseProgress(state));
        setChapters(coreWordsFrom(pack.items, own));
        setGrammar(grammarFrom(pack.items, cards));
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
    if (stage.kind === 'card') return stage.card.lines.map((l) => l.audio);
    if (stage.kind === 'book') return stage.open?.lines.map((l) => l.audio) ?? [];
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

  const ask = (words: CoreWord[], now: number, regular?: Regular) => {
    setStage({
      kind: 'ask',
      questions: wordQuestions(words, pool, seeded(now)),
      index: 0,
      answers: [],
      ...(regular && { trial: regular }),
    });
  };

  /** The due list without the words just answered. */
  const without = (answers: readonly WordAnswer[]) => (now: ReadonlySet<string>) => {
    const done = new Set(answers.map((x) => x.question.word.itemId));
    return new Set([...now].filter((id) => !done.has(id)));
  };

  const road = regularStatus(progress);
  const faceTrial = (regular: Regular, now: number) => {
    setStarted(now);
    // Words you've met first: a trial tests what the path taught you.
    const all = shuffle(chapters[regular.wordChapter - 1] ?? [], seeded(now));
    const words = [...all.filter((w) => met.has(w.deck)), ...all.filter((w) => !met.has(w.deck))];
    ask(words.slice(0, regular.trial.words), now, regular);
  };

  const finishTrial = (regular: Regular, answers: WordAnswer[], now: number) => {
    const { next, passed } = applyWordTrial(
      progress,
      regular.number,
      scoreOfWords(answers),
      regular.trial.accuracy,
    );
    setProgress(next);
    setDue(without(answers));
    setStage({ kind: 'result', answers, passed, sameDay: false, trial: regular });
    reportWordTrial(
      api,
      next,
      answers,
      { road: regular.number, xp: regular.trial.xp, passed },
      (now - started) / 1000,
      met,
    ).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  const practice = (words: CoreWord[], fresh: CoreWord[], now: number) => {
    if (fresh.length) setStage({ kind: 'meet', fresh, words, index: 0 });
    else ask(words, now);
  };

  const begin = (now: number) => {
    setStarted(now);
    const { words, fresh } = pickSession(chapters, chapterNo, met, due, seeded(now), size);
    // A grammar card comes first when this chapter brings one you haven't read (#162).
    const card = cardDue(grammar, progress);
    if (card) setStage({ kind: 'card', card, words, fresh });
    else practice(words, fresh, now);
  };

  const finish = (answers: WordAnswer[], now: number) => {
    const fresh = answers.map((a) => a.question.word.deck).filter((d) => !met.has(d));
    const nowMet = new Set([...met, ...fresh]);
    const allMet = (chapters[chapterNo - 1] ?? []).every((w) => nowMet.has(w.deck));
    const { next, passed, sameDay } = applyWordSession(
      progress,
      scoreOfWords(answers),
      fresh,
      WORD_CHAPTERS.length,
      undefined,
      allMet,
    );
    setProgress(next);
    // Just reviewed: not due again for "Another session" (review, 2026-11-15).
    setDue(without(answers));
    setStage({ kind: 'result', answers, passed, sameDay });
    reportWords(api, next, answers, passed, (now - started) / 1000).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  const current = stage.kind === 'ask' ? stage.questions[stage.index] : undefined;
  const w = progress.words;
  const book = cardsRead(grammar, progress);
  return (
    <section className="lesson arabic" aria-label="The innkeeper’s table">
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your session couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {stage.kind === 'start' && trial && (
        <div className="lesson__card lesson__start">
          {road?.trialReady ? (
            <>
              <p className="lesson__kicker">The Long Road In · {road.regular.who}</p>
              <h2 className="lesson__title">{road.regular.trial.name}</h2>
              <p>{road.regular.trial.text}</p>
              <div className="lesson__actions">
                <button
                  type="button"
                  className="lesson__go"
                  onClick={() => faceTrial(road.regular, Date.now())}
                >
                  Begin the trial
                </button>
              </div>
            </>
          ) : (
            <p>
              {road?.passed
                ? `You’ve passed ${road.regular.trial.name}.`
                : `Not yet: pass the chapter “${WORD_CHAPTERS[(road?.regular.wordChapter ?? 1) - 1]?.title ?? ''}” at the innkeeper’s table first.`}
            </p>
          )}
        </div>
      )}
      {stage.kind === 'start' && !trial && (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">
            The innkeeper’s table ·{' '}
            {w.done ? 'every chapter' : `chapter ${chapterNo} of\u00a0${WORD_CHAPTERS.length}`}
          </p>
          <h2 className="lesson__title">{w.done ? 'Keep them fresh' : chapter.title}</h2>
          <p>
            {w.done
              ? 'You’ve passed every chapter. A session keeps your words fresh.'
              : chapter.theme}
          </p>
          {road && (
            <blockquote className="arabic__beat">
              <ArabicText text={road.beat ?? road.regular.intro} />
            </blockquote>
          )}
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
            {road?.trialReady && (
              <button
                type="button"
                className="lesson__go"
                onClick={() => faceTrial(road.regular, Date.now())}
              >
                Trial: {road.regular.trial.name}
              </button>
            )}
            {book.length > 0 && (
              <button
                type="button"
                className="lesson__plain"
                onClick={() => setStage({ kind: 'book', open: null })}
              >
                Grammar book · {book.length}
              </button>
            )}
            {onChat && (
              <button type="button" className="lesson__plain" onClick={onChat}>
                Sit and talk
              </button>
            )}
          </div>
        </div>
      )}
      {stage.kind === 'card' && (
        <GrammarCardView card={stage.card} play={play}>
          <button
            type="button"
            className="lesson__go"
            autoFocus
            onClick={() => {
              setProgress(withCardRead(progress, stage.card.id));
              practice(stage.words, stage.fresh, Date.now());
            }}
          >
            Got it
          </button>
        </GrammarCardView>
      )}
      {stage.kind === 'book' &&
        (stage.open ? (
          <GrammarCardView card={stage.open} play={play}>
            <button
              type="button"
              className="lesson__plain"
              onClick={() => setStage({ kind: 'book', open: null })}
            >
              Back to the book
            </button>
          </GrammarCardView>
        ) : (
          <div className="lesson__card lesson__start">
            <p className="lesson__kicker">The innkeeper’s table · grammar book</p>
            <h2 className="lesson__title">Grammar book</h2>
            <ul className="arabic__book">
              {book.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="arabic__book-card"
                    onClick={() => setStage({ kind: 'book', open: c })}
                  >
                    <span className="arabic__book-chapter">Chapter {c.chapter}</span> {c.title}
                  </button>
                </li>
              ))}
            </ul>
            <div className="lesson__actions">
              <button
                type="button"
                className="lesson__plain"
                onClick={() => setStage({ kind: 'start' })}
              >
                Back to the table
              </button>
            </div>
          </div>
        ))}
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
            else if (stage.trial) finishTrial(stage.trial, answers, now);
            else finish(answers, now);
          }}
        />
      )}
      {stage.kind === 'result' && stage.trial && (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">{stage.trial.trial.name}</p>
          <p className="arabic__pct">
            {stage.answers.filter((a) => a.right).length} / {stage.answers.length}
          </p>
          {stage.passed ? (
            <blockquote className="arabic__beat">
              <ArabicText text={stage.trial.outro} />
            </blockquote>
          ) : (
            <p>
              You need {Math.round(stage.trial.trial.accuracy * 100)}% to pass. {stage.trial.who}{' '}
              waits: try again when you’re ready.
            </p>
          )}
          <p className="arabic__xp">
            +
            {wordXp(stage.answers.filter((a) => a.right).length, false) +
              (stage.passed ? stage.trial.trial.xp : 0)}{' '}
            XP
          </p>
          {!stage.passed && (
            <button
              type="button"
              className="lesson__go"
              onClick={() => stage.trial && faceTrial(stage.trial, Date.now())}
            >
              Try again
            </button>
          )}
        </div>
      )}
      {stage.kind === 'result' && !stage.trial && (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">The innkeeper’s table · done</p>
          <p className="arabic__pct">
            {stage.answers.filter((a) => a.right).length} / {stage.answers.length}
          </p>
          <p>
            {stage.passed
              ? progress.words.done
                ? `Chapter passed! That’s all ${WORD_CHAPTERS.length * 30} words.`
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

/** A grammar card (#162): the rule in a few lines, then deck sentences that show it. */
function GrammarCardView({
  card,
  play,
  children,
}: {
  card: GrammarCard;
  play: (path: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="lesson__card arabic__grammar">
      <p className="lesson__kicker">Grammar · chapter {card.chapter}</p>
      <h2 className="lesson__title">{card.title}</h2>
      {card.points.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {card.table && (
        <table className="arabic__grammar-table">
          <tbody>
            {card.table.map(([ending, meaning]) => (
              <tr key={ending}>
                <th scope="row">{ending}</th>
                <td>{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {card.letters && (
        <p className="arabic__grammar-letters">
          <bdi lang="ar" dir="rtl">
            {card.letters}
          </bdi>
        </p>
      )}
      {card.lines.map((l) => (
        <div key={l.audio} className="arabic__sentence">
          <button
            type="button"
            className="arabic__play"
            onClick={() => play(l.audio)}
            aria-label="Play the sentence"
          >
            ▶
          </button>
          <bdi lang="ar" dir="rtl" className="arabic__sentence-ar">
            {l.arabic}
          </bdi>
          <span className="arabic__sentence-latin">{l.latin}</span>
          <span className="arabic__sentence-en">{l.english}</span>
        </div>
      ))}
      <div className="lesson__actions">{children}</div>
    </div>
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
      {word.kin && (
        <span className="arabic__kin" title="This word shares its root with a Hebrew word">
          Same root as{' '}
          <bdi lang="he" dir="rtl">
            {word.kin.hebrew}
          </bdi>
          {word.kin.note && ` (${word.kin.note})`}
        </span>
      )}
    </div>
  );
}

function Sentence({ word, play }: { word: CoreWord; play: (path: string) => void }) {
  const s = word.sentence;
  const w = word.written;
  if (!s && w)
    return (
      <div className="arabic__sentence is-written">
        <bdi lang="ar" dir="rtl" className="arabic__sentence-ar">
          {w.arabic}
        </bdi>
        <bdi lang="he" dir="rtl" className="arabic__sentence-he">
          {w.hebrew}
        </bdi>
        <span className="arabic__sentence-latin">{w.latin}</span>
        <span className="arabic__sentence-en">{w.english}</span>
        <span className="arabic__sentence-note">Our own sentence · no recording</span>
      </div>
    );
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

/**
 * Say the word yourself (#195): optional, once you've met it. Record and compare with the
 * speaker; the recording stays in this tab (ADR 0013) and doesn't change your answer.
 */
function SayWord({ word, play }: { word: CoreWord; play: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className="lesson__plain arabic__say" onClick={() => setOpen(true)}>
        Say it yourself
      </button>
    );
  return <Compare audio={word.audio} target={word.arabic} play={play} />;
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
            {picked === question.answer ? (
              'Right!'
            ) : (
              <>
                Not quite: it was{' '}
                <bdi lang={kind === 'recall' ? 'ar' : undefined}>{question.answer}</bdi>.
              </>
            )}
          </p>
          <WordCard word={word} play={play} />
          <SayWord key={word.deck} word={word} play={play} />
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
