import { useEffect, useMemo, useState } from 'react';
import type { ReviewGrade, SubjectApi } from '../../../core/subject.ts';
import { parseProgress, type ArabicProgress } from '../progress.ts';
import { endsSentence, longChoices, seeded } from '../lesson/questions.ts';
import { useAudio } from '../lesson/useAudio.ts';
import { DECK } from '../words.ts';
import {
  PHRASE_SETS,
  phrasesOf,
  SET_PASS,
  coffeeXp,
  understandQuestions,
  type Phrase,
  type UnderstandQuestion,
} from './sets.ts';
import { Compare } from './Compare.tsx';
import type { Heard } from '../../../core/speech.ts';
import { NextStep } from '../../../core/road/NextStep.tsx';
import { NoDeck } from '../NoDeck.tsx';

/** Due phrases from earlier sets mixed into a session. */
const REVIEWS = 5;

type Stage =
  | { kind: 'start' }
  | { kind: 'meet'; index: number }
  | { kind: 'understand'; questions: UnderstandQuestion[]; index: number; right: string[] }
  | { kind: 'say'; index: number; right: string[]; said: string[] }
  | {
      kind: 'result';
      right: string[];
      said: string[];
      asked: number;
      passed: boolean;
      /** The set that comes after the one just passed, or null if it was the last. */
      nextTitle: string | null;
    };

/**
 * The coffee corner (#45): survival phrases from the deck. Meet a set's phrases (hear them,
 * record yourself and compare), then understand them by ear, then say each one and judge it
 * yourself. Understanding 90% of a set passes it; every phrase is reviewed with FSRS.
 */
export function CoffeeCorner({ api }: { api: SubjectApi }) {
  const [progress, setProgress] = useState<ArabicProgress | null>(null);
  const [all, setAll] = useState<Phrase[][] | null>(null);
  const [due, setDue] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'start' });
  const [started, setStarted] = useState(0);
  // The set's recordings, signed together as soon as it's known (#124).
  const setAudio = (all?.[Math.min(progress?.phraseSet ?? 1, PHRASE_SETS.length) - 1] ?? []).map(
    (p) => p.audio,
  );
  const play = useAudio(api, setAudio);

  useEffect(() => {
    let live = true;
    Promise.all([api.loadState(), api.privateContent(DECK), api.dueItems({ limit: 50 })]).then(
      ([state, pack, dueItems]) => {
        if (!live) return;
        setProgress(parseProgress(state));
        setAll(PHRASE_SETS.map((s) => phrasesOf(s, pack.items)));
        setDue(dueItems.map((d) => d.itemId));
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [api]);

  const setNo = Math.min(progress?.phraseSet ?? 1, PHRASE_SETS.length);
  const set = PHRASE_SETS[setNo - 1];
  const phrases = useMemo(() => all?.[setNo - 1] ?? [], [all, setNo]);
  const allDone = (progress?.phraseSet ?? 1) > PHRASE_SETS.length;
  const reviews = useMemo(
    () =>
      (all ?? [])
        .slice(0, setNo - 1)
        .flat()
        .filter((p) => due.includes(p.id))
        .slice(0, REVIEWS),
    [all, setNo, due],
  );

  if (failed)
    return (
      <p className="lesson__card">
        The coffee corner couldn’t load. Check your connection and reload the page.
      </p>
    );
  if (!progress || !all || !set) return <p className="arabic__loading">Brewing the coffee…</p>;
  if (!phrases.length) return <NoDeck what="phrases" />;

  const pool = all.flat();
  const begin = (now: number) => {
    setStarted(now);
    setStage({
      kind: 'understand',
      questions: understandQuestions([...phrases, ...reviews], pool, seeded(now)),
      index: 0,
      right: [],
    });
  };

  const finish = (right: string[], said: string[], asked: number, now: number) => {
    const passed =
      !allDone &&
      right.filter((id) => phrases.some((p) => p.id === id)).length >=
        Math.ceil(phrases.length * SET_PASS);
    const next: ArabicProgress = {
      ...progress,
      phraseSet: passed ? progress.phraseSet + 1 : progress.phraseSet,
      phrasesMet: [...new Set([...progress.phrasesMet, ...phrases.map((p) => p.id)])],
      sessions: progress.sessions + 1,
    };
    setProgress(next);
    // Read the next set's title now: after setProgress, setNo already points past this set.
    const nextTitle = PHRASE_SETS[progress.phraseSet]?.title ?? null;
    setStage({ kind: 'result', right, said, asked, passed, nextTitle });
    const at = new Date();
    const heard = [...phrases, ...reviews];
    (async () => {
      const reviewGrades = heard.map((p) => {
        const ok = right.includes(p.id);
        // A due review is only understood, never said: understanding it is a good review.
        // A new phrase is good once you've also said it, hard if only understood.
        const review = !phrases.some((x) => x.id === p.id);
        const grade: ReviewGrade = !ok ? 'again' : review || said.includes(p.id) ? 'good' : 'hard';
        return { itemId: p.id, grade };
      });
      await api.saveSession({
        state: next,
        reviews: reviewGrades,
        results: heard.map((p) => ({
          skill: 'listen',
          itemId: p.id,
          score: right.includes(p.id) ? 1 : 0,
        })),
        xp: coffeeXp(right.length, said.length, passed),
        minutes: (now - started) / 60000,
        events: [{ kind: 'coffee' }],
        at,
      });
    })().then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  const current = stage.kind === 'understand' ? stage.questions[stage.index] : undefined;
  return (
    <section className="lesson arabic" aria-label="Coffee corner">
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your session couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {stage.kind === 'start' && (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">
            Coffee corner · {allDone ? 'every set' : `set ${setNo} of ${PHRASE_SETS.length}`}
          </p>
          <h2 className="lesson__title">{allDone ? 'Keep them warm' : set.title}</h2>
          <p>
            {allDone
              ? 'You’ve passed every set. A round keeps the last set and your due phrases fresh.'
              : set.intro}
          </p>
          <p className="arabic__note">
            Hear each phrase, understand it by ear, then say it yourself. Understand{' '}
            {Math.round(SET_PASS * 100)}% to pass the set.
            {reviews.length > 0 && ` ${reviews.length} earlier phrases are due for review too.`}
          </p>
          <div className="lesson__actions">
            <button
              type="button"
              className={
                phrases.every((p) => progress.phrasesMet.includes(p.id))
                  ? 'lesson__plain'
                  : 'lesson__go'
              }
              onClick={() => setStage({ kind: 'meet', index: 0 })}
            >
              Meet the phrases
            </button>
            {phrases.every((p) => progress.phrasesMet.includes(p.id)) && (
              <button type="button" className="lesson__go" onClick={() => begin(Date.now())}>
                Practice
              </button>
            )}
          </div>
        </div>
      )}
      {stage.kind === 'meet' && (
        <MeetPhrase
          key={stage.index}
          phrase={phrases[stage.index] as Phrase}
          index={stage.index}
          count={phrases.length}
          play={play}
          onNext={(now) =>
            stage.index + 1 < phrases.length
              ? setStage({ kind: 'meet', index: stage.index + 1 })
              : begin(now)
          }
        />
      )}
      {stage.kind === 'understand' && stage.questions.length === 0 && <NoDeck what="phrases" />}
      {stage.kind === 'understand' && current && (
        <Understand
          key={stage.index}
          question={current}
          index={stage.index}
          count={stage.questions.length}
          play={play}
          onAnswered={(ok) => {
            const q = stage.questions[stage.index];
            const right = ok && q ? [...stage.right, q.phrase.id] : stage.right;
            if (stage.index + 1 < stage.questions.length)
              setStage({ ...stage, index: stage.index + 1, right });
            else setStage({ kind: 'say', index: 0, right, said: [] });
          }}
        />
      )}
      {stage.kind === 'say' && (
        <SayIt
          key={stage.index}
          phrase={phrases[stage.index] as Phrase}
          index={stage.index}
          count={phrases.length}
          play={play}
          check={(audio) => api.transcribe(audio)}
          onRated={(ok, now) => {
            const p = phrases[stage.index];
            const said = ok && p ? [...stage.said, p.id] : stage.said;
            if (stage.index + 1 < phrases.length)
              setStage({ ...stage, index: stage.index + 1, said });
            else finish(stage.right, said, phrases.length + reviews.length, now);
          }}
        />
      )}
      {stage.kind === 'result' && (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">Coffee corner · done</p>
          <p className="arabic__pct">
            {stage.right.length} / {stage.asked}
          </p>
          <p>
            {stage.passed
              ? stage.nextTitle
                ? `Set passed! Next: ${stage.nextTitle}.`
                : 'Set passed! That’s every set: your first week’s Arabic.'
              : allDone
                ? 'Every set is passed already: this round was practice.'
                : `Understood by ear. Reach ${Math.round(SET_PASS * 100)}% to pass the set.`}
          </p>
          <p className="arabic__xp">
            +{coffeeXp(stage.right.length, stage.said.length, stage.passed)} XP
          </p>
          <NextStep onHere={() => setStage({ kind: 'start' })} />
          <button type="button" className="lesson__go" onClick={() => setStage({ kind: 'start' })}>
            Another round
          </button>
        </div>
      )}
    </section>
  );
}

/** A phrase's card: the Arabic, the Hebrew bridge, the deck's Latin and the meaning. */
function PhraseCard({ phrase, play }: { phrase: Phrase; play: (path: string) => void }) {
  return (
    <div className="arabic__phrase">
      <button
        type="button"
        className="arabic__play"
        onClick={() => play(phrase.audio)}
        aria-label="Play the phrase"
      >
        ▶
      </button>
      <bdi lang="ar" dir="rtl" className="arabic__phrase-ar">
        {phrase.arabic}
      </bdi>
      <bdi lang="he" dir="rtl" className="arabic__phrase-he">
        {phrase.hebrew}
      </bdi>
      <span className="arabic__phrase-latin">{phrase.latin}</span>
      <span className="arabic__phrase-meaning">{phrase.meaning}</span>
    </div>
  );
}

function MeetPhrase({
  phrase,
  index,
  count,
  play,
  onNext,
}: {
  phrase: Phrase;
  index: number;
  count: number;
  play: (path: string) => void;
  onNext: (now: number) => void;
}) {
  useEffect(() => {
    play(phrase.audio);
  }, [play, phrase.audio]);
  return (
    <div className="lesson__card arabic__meet">
      <p className="lesson__kicker">
        Meet a phrase · {index + 1} of {count}
      </p>
      <PhraseCard phrase={phrase} play={play} />
      <Compare audio={phrase.audio} target={phrase.arabic} play={play} />
      <button type="button" className="lesson__go" onClick={() => onNext(Date.now())}>
        {index + 1 < count ? 'Next' : 'Start practice'}
      </button>
    </div>
  );
}

function Understand({
  question,
  index,
  count,
  play,
  onAnswered,
}: {
  question: UnderstandQuestion;
  index: number;
  count: number;
  play: (path: string) => void;
  onAnswered: (right: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const { phrase } = question;
  useEffect(() => {
    play(phrase.audio);
  }, [play, phrase.audio]);
  return (
    <div className="lesson__card arabic__question">
      <p className="lesson__kicker">
        Understand · {index + 1} of {count}
      </p>
      <h2 className="lesson__subtitle">What does it mean?</h2>
      <button type="button" className="arabic__listen" onClick={() => play(phrase.audio)}>
        ▶ Play it again
      </button>
      <div
        className={`arabic__choices is-meanings${longChoices(question.choices) ? ' is-long' : ''}`}
        role="group"
        aria-label="Choices"
      >
        {question.choices.map((c) => (
          <button
            key={c}
            type="button"
            className={`arabic__choice${picked === null ? '' : c === phrase.meaning ? ' is-right' : c === picked ? ' is-wrong' : ''}`}
            disabled={picked !== null}
            onClick={() => setPicked(c)}
          >
            {c}
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className="arabic__feedback" aria-live="polite">
          <p className={picked === phrase.meaning ? 'arabic__good' : 'arabic__bad'}>
            {picked === phrase.meaning
              ? 'Right!'
              : `Not quite: it was “${phrase.meaning}${endsSentence(phrase.meaning) ? '' : '.'}”`}
          </p>
          <PhraseCard phrase={phrase} play={play} />
          <button
            type="button"
            className="lesson__go"
            onClick={() => onAnswered(picked === phrase.meaning)}
            autoFocus
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function SayIt({
  phrase,
  index,
  count,
  play,
  check,
  onRated,
}: {
  phrase: Phrase;
  index: number;
  count: number;
  play: (path: string) => void;
  check: (audio: Blob) => Promise<Heard>;
  onRated: (said: boolean, now: number) => void;
}) {
  return (
    <div className="lesson__card arabic__question">
      <p className="lesson__kicker">
        Say it · {index + 1} of {count}
      </p>
      <h2 className="lesson__subtitle">Say “{phrase.meaning}”</h2>
      <PhraseCard phrase={phrase} play={play} />
      <Compare audio={phrase.audio} target={phrase.arabic} play={play} check={check} />
      <p className="arabic__note">Did yours sound like the speaker?</p>
      <div className="lesson__actions">
        <button type="button" className="lesson__plain" onClick={() => onRated(false, Date.now())}>
          Not yet
        </button>
        <button type="button" className="lesson__go" onClick={() => onRated(true, Date.now())}>
          Close enough
        </button>
      </div>
    </div>
  );
}
