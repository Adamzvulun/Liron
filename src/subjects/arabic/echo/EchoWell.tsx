import { useEffect, useRef, useState } from 'react';
import type { Item } from '../../../core/content/schema.ts';
import type { SubjectApi } from '../../../core/subject.ts';
import { Ar } from '../lesson/ScriptLesson.tsx';
import { seeded } from '../lesson/questions.ts';
import { useAudio } from '../lesson/useAudio.ts';
import { parseProgress, type ArabicProgress } from '../progress.ts';
import { DECK, ECHO_POOL, wordsFrom, type Word } from '../words.ts';
import {
  applyRound,
  audioOf,
  currentPair,
  HEARD_STREAK,
  PAIRS,
  roundQuestions,
  type PairQuestion,
  type Side,
  type SoundPair,
} from './pairs.ts';
import { reportRound, xpOfRound, type PairAnswer } from './report.ts';
import { Shadowing } from './Shadowing.tsx';
import './echo.css';
import { NextStep } from '../../../core/road/NextStep.tsx';
import { NoDeck } from '../NoDeck.tsx';

type Stage =
  | { kind: 'start' }
  | { kind: 'shadow' }
  | {
      kind: 'round';
      questions: PairQuestion[];
      index: number;
      answers: PairAnswer[];
      startedAt: number;
    }
  | { kind: 'result'; answers: PairAnswer[]; heard: SoundPair | null; next: ArabicProgress };

const secondsSince = (t: number) => (performance.now() - t) / 1000;
const SIDES: readonly Side[] = ['a', 'b'];
/** A choice shows the word alone, without the plural the deck adds in brackets. */
const bare = (s: string) => s.replace(/\s*\(.*?\)/g, '');

/**
 * The echo well (#193, E14): "Hear the difference", ear training on the sounds a Hebrew
 * speaker mixes up, one pair at a time (docs/game/mic-practice.md §2).
 */
export function EchoWell({ api }: { api: SubjectApi }) {
  const [progress, setProgress] = useState<ArabicProgress | null>(null);
  const [deck, setDeck] = useState<{ words: Word[]; items: Item[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'start' });
  const play = useAudio(api, stage.kind === 'round' ? stage.questions.map(audioOf) : []);

  useEffect(() => {
    let live = true;
    Promise.all([api.loadState(), api.privateContent(DECK)]).then(
      ([state, pack]) => {
        if (!live) return;
        setProgress(parseProgress(state));
        setDeck({ words: wordsFrom(pack.items, ECHO_POOL), items: pack.items });
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
        The well’s rope couldn’t be found. Check your connection and reload the page.
      </p>
    );
  if (!progress || !deck) return <p className="arabic__loading">Lowering the bucket…</p>;
  // Every round and every sentence here is the deck's: without it, say so before the rope.
  if (deck.items.length === 0) return <NoDeck what="words" />;

  const start = () =>
    setStage({
      kind: 'round',
      questions: roundQuestions(progress, deck.words, deck.items, seeded(Date.now())),
      index: 0,
      answers: [],
      startedAt: performance.now(),
    });

  const finish = (answers: PairAnswer[], startedAt: number) => {
    const { next, heard } = applyRound(progress, answers);
    setProgress(next);
    setStage({ kind: 'result', answers, heard, next });
    reportRound(api, next, answers, heard, secondsSince(startedAt)).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  const current = stage.kind === 'round' ? stage.questions[stage.index] : undefined;
  return (
    <section className="lesson arabic echo" aria-label="The echo well">
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your round couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {stage.kind === 'start' && (
        <>
          <Start progress={progress} onStart={start} />
          <ShadowStart
            shadowed={progress.echo.shadowed}
            onStart={() => setStage({ kind: 'shadow' })}
          />
        </>
      )}
      {stage.kind === 'shadow' && (
        <Shadowing
          api={api}
          items={deck.items}
          progress={progress}
          onSaved={setProgress}
          onLeave={() => setStage({ kind: 'start' })}
        />
      )}
      {stage.kind === 'round' && stage.questions.length === 0 && <NoDeck what="words" />}
      {stage.kind === 'round' && current && (
        <Ask
          key={stage.index}
          question={current}
          index={stage.index}
          count={stage.questions.length}
          play={play}
          onAnswered={(right) => {
            const answers = [...stage.answers, { question: current, right }];
            if (stage.index + 1 >= stage.questions.length) finish(answers, stage.startedAt);
            else setStage({ ...stage, index: stage.index + 1, answers });
          }}
        />
      )}
      {stage.kind === 'result' && <Result stage={stage} onAgain={start} />}
    </section>
  );
}

/** The two letters of a pair, big, with their labels. */
function PairLetters({ pair }: { pair: SoundPair }) {
  return (
    <p className="echo__pair">
      {SIDES.map((s) => (
        <span key={s} className="echo__side">
          <Ar className="arabic__chip">{pair[s].letter.letter}</Ar>
          <span>{pair[s].label}</span>
        </span>
      ))}
    </p>
  );
}

function Start({ progress, onStart }: { progress: ArabicProgress; onStart: () => void }) {
  const pair = currentPair(progress);
  return (
    <div className="lesson__card lesson__start">
      <p className="lesson__kicker">The echo well · Hear the difference</p>
      <h2 className="lesson__title">{pair ? pair.title : 'Every pair heard'}</h2>
      {pair ? (
        <>
          <PairLetters pair={pair} />
          <p>{pair.tip}</p>
          <p className="arabic__note">
            Right in a row: {progress.echo.streak} of {HEARD_STREAK}. At {HEARD_STREAK}, you hear
            them apart and the next pair opens.
          </p>
        </>
      ) : (
        <p>
          You hear all {PAIRS.length} pairs apart. A round now mixes them all, to keep them sharp.
        </p>
      )}
      <ol className="echo__ladder" aria-label="The pairs">
        {PAIRS.map((x) => {
          const heard = progress.echo.heard.includes(x.id);
          const now = x.id === pair?.id;
          return (
            <li key={x.id} className={heard ? 'is-heard' : now ? 'is-now' : ''}>
              <Ar>{`${x.a.letter.letter} ${x.b.letter.letter}`}</Ar> {x.title}
              {heard ? ' ✓' : now ? ' · now' : ''}
            </li>
          );
        })}
      </ol>
      <button type="button" className="lesson__go" onClick={onStart}>
        Listen
      </button>
    </div>
  );
}

function ShadowStart({ shadowed, onStart }: { shadowed: number; onStart: () => void }) {
  return (
    <div className="lesson__card lesson__start">
      <p className="lesson__kicker">The echo well · Shadowing</p>
      <h2 className="lesson__title">Speak along</h2>
      <p>
        Hear a short sentence, then say it at the same time as the speaker, slower first. Listen
        back to yours, theirs, and both together.
      </p>
      <p className="arabic__note">
        Your recordings stay on this device.
        {shadowed > 0 ? ` Sentences shadowed so far: ${shadowed}.` : ''}
      </p>
      <button type="button" className="lesson__go" onClick={onStart}>
        Shadow sentences
      </button>
    </div>
  );
}

function Ask({
  question,
  index,
  count,
  play,
  onAnswered,
}: {
  question: PairQuestion;
  index: number;
  count: number;
  play: (path: string) => void;
  onAnswered: (right: boolean) => void;
}) {
  const [picked, setPicked] = useState<Side | null>(null);
  const audio = audioOf(question);
  const played = useRef(false);
  useEffect(() => {
    if (!played.current) {
      played.current = true;
      play(audio);
    }
  }, [audio, play]);

  const { pair } = question;
  const one = question.kind === 'one';
  const said = one ? question[question.answer] : question.word;
  const state = (s: Side) =>
    picked === null ? '' : s === question.answer ? ' is-right' : s === picked ? ' is-wrong' : '';

  return (
    <div className="lesson__card arabic__question">
      <p className="lesson__kicker">
        {one ? 'Which one?' : 'Which sound?'} · {index + 1} of {count}
      </p>
      <div className="arabic__bar" aria-hidden="true">
        <span style={{ width: `${(index / count) * 100}%` }} />
      </div>
      <h2 className="lesson__subtitle">
        {one ? 'Which word did you hear?' : 'Which sound does it start with?'}
      </h2>
      <button type="button" className="arabic__listen" onClick={() => play(audio)}>
        ▶ Play it again
      </button>
      <div className="arabic__choices is-words echo__choices" role="group" aria-label="Choices">
        {SIDES.map((s) => (
          <button
            key={s}
            type="button"
            className={`arabic__choice echo__choice${state(s)}`}
            disabled={picked !== null}
            onClick={() => setPicked(s)}
          >
            <Ar className="echo__glyph">
              {question.kind === 'one' ? bare(question[s].arabic) : pair[s].letter.letter}
            </Ar>
            <span className="echo__label">
              {question.kind === 'one' ? question[s].gloss : pair[s].label}
            </span>
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className="arabic__feedback" aria-live="polite">
          <p className={picked === question.answer ? 'arabic__good' : 'arabic__bad'}>
            {picked === question.answer
              ? 'Right!'
              : `Not quite: it was ${question.kind === 'one' ? question[question.answer].gloss : pair[question.answer].label}.`}
          </p>
          <p>
            <Ar className="arabic__example">{said.arabic}</Ar> ·{' '}
            {'latin' in said ? said.latin : said.sound} ·{' '}
            {'gloss' in said ? said.gloss : said.meaning}
          </p>
          {question.kind === 'one' && (
            <p className="echo__both">
              {SIDES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="arabic__play echo__hear"
                  onClick={() => play(question[s].audio)}
                >
                  ▶ {question[s].gloss}
                </button>
              ))}
            </p>
          )}
          <button
            type="button"
            className="lesson__go"
            onClick={() => onAnswered(picked === question.answer)}
            autoFocus
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function Result({
  stage,
  onAgain,
}: {
  stage: Extract<Stage, { kind: 'result' }>;
  onAgain: () => void;
}) {
  const { answers, heard, next } = stage;
  const right = answers.filter((a) => a.right).length;
  const pair = currentPair(next);
  return (
    <div className="lesson__card lesson__start">
      <p className="lesson__kicker">Round done</p>
      <p className="arabic__pct">
        {right} / {answers.length}
      </p>
      {heard ? (
        <>
          <p className="echo__heard">You hear {heard.title} apart now!</p>
          <PairLetters pair={heard} />
          <p>
            {pair
              ? `Next: ${pair.title}. The pairs you’ve heard come back now and then.`
              : 'That was the last pair. Every sound is yours.'}
          </p>
        </>
      ) : pair ? (
        <p>
          {pair.title}: {next.echo.streak} of {HEARD_STREAK} right in a row.
          {next.echo.streak === 0 ? ' A miss starts the count again: listen for the tip.' : ''}
        </p>
      ) : (
        <p>Good listening. Every pair stays sharp this way.</p>
      )}
      <p className="arabic__xp">+{xpOfRound(answers)} XP</p>
      <NextStep onHere={onAgain} />
      <button type="button" className="lesson__go" onClick={onAgain}>
        Another round
      </button>
    </div>
  );
}
