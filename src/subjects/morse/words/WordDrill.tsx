import { useCallback, useEffect, useRef, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { MorsePlayer } from '../player.ts';
import { CHAR_WPM, parseProgress, unlockedChars, type MorseProgress } from '../lesson/progress.ts';
import { openWords, written, type MorseWord } from '../words.ts';
import {
  applyWords,
  isRight,
  pickRound,
  reportWords,
  ROUND_WORDS,
  scoreOf,
  wordsOpen,
  xpForWords,
  type WordAttempt,
} from './drill.ts';
import '../lesson/lesson.css';
import './words.css';

// The Codebook (#154): head copy of whole words. A word plays once; you type it when the sound
// has ended. AGN plays it again, once, for half credit. Q-codes, abbreviations and prosigns show
// their meaning after you answer. Design: docs/game/morse-words.md.

/** `?run=short` makes a round 3 words (for tests). */
const roundSize = () =>
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('run') === 'short'
    ? 3
    : ROUND_WORDS;

const KIND_LABEL: Record<MorseWord['kind'], string> = {
  word: 'Word',
  'q-code': 'Q-code',
  abbreviation: 'Abbreviation',
  prosign: 'Prosign',
};

interface Round {
  words: MorseWord[];
  progress: MorseProgress;
}

export function WordDrill({ api }: { api: SubjectApi }) {
  const [progress, setProgress] = useState<MorseProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [round, setRound] = useState<Round | null>(null);
  const [result, setResult] = useState<WordAttempt[] | null>(null);
  const [starting, setStarting] = useState(false);
  const latest = useRef<MorseProgress | null>(null);

  useEffect(() => {
    let live = true;
    api.loadState().then(
      (s) => {
        if (!live) return;
        const p = parseProgress(s);
        latest.current = p;
        setProgress(p);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [api]);

  const start = useCallback(async () => {
    const p = latest.current;
    if (!p) return;
    setStarting(true);
    const open = openWords(unlockedChars(p));
    const ids = open.map((w) => w.id);
    // Without the review records, a round still works: it just treats every word as new.
    const [due, status] = await Promise.all([
      api.dueItems({ limit: 100 }).catch(() => []),
      api.reviewStatus(ids).catch(() => new Map()),
    ]);
    setStarting(false);
    setResult(null);
    setRound({
      progress: p,
      words: pickRound(
        open,
        due.map((d) => d.itemId),
        new Set(status.keys()),
        Math.random,
        roundSize(),
      ),
    });
  }, [api]);

  const finish = useCallback(
    (attempts: WordAttempt[], seconds: number) => {
      const before = latest.current;
      if (!before) return;
      const next = applyWords(before, attempts);
      latest.current = next;
      setProgress(next);
      setRound(null);
      setResult(attempts);
      reportWords(api, next, attempts, seconds).then(
        () => setSaveFailed(false),
        () => setSaveFailed(true),
      );
    },
    [api],
  );

  if (failed) {
    return (
      <p className="lesson__card">
        The tower’s records couldn’t be read. Check your connection and reload the page.
      </p>
    );
  }
  if (!progress) return <p className="lesson__loading">Opening the codebook…</p>;

  const open = openWords(unlockedChars(progress));

  return (
    <section className="lesson words" aria-label="The Codebook">
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your last round couldn’t be saved. Your next round will try again.
        </p>
      )}
      {round ? (
        <Copy round={round} onDone={finish} />
      ) : result ? (
        <Summary attempts={result} onAgain={() => void start()} />
      ) : (
        <div className="lesson__card lesson__start">
          <span className="lesson__lamp lesson__lamp--small" aria-hidden="true">
            📖
          </span>
          <h2 className="lesson__title">The Codebook</h2>
          {wordsOpen(progress) ? (
            <>
              <p>
                Operators hear whole words, not letters. A word plays once. When the sound ends,
                type it. Ask for <strong>AGN</strong> to hear it again, for half credit.
              </p>
              <p className="lesson__note">
                {open.length} words open · a round is 10 words
                {progress.words.best > 0 && ` · your best: ${progress.words.best} of 10`}
              </p>
              <button
                type="button"
                className="lesson__go"
                onClick={() => void start()}
                disabled={starting}
              >
                {starting ? 'Opening…' : 'Start a round'}
              </button>
            </>
          ) : (
            <p>The codebook is locked. Pass the Gatekeeper, chapter I’s trial, to open it.</p>
          )}
        </div>
      )}
    </section>
  );
}

type Step = 'listening' | 'typing' | 'answered';

function Copy({
  round,
  onDone,
}: {
  round: Round;
  onDone: (attempts: WordAttempt[], seconds: number) => void;
}) {
  const { words, progress } = round;
  const keys = unlockedChars(progress).filter((c) => /^[A-Z0-9]$/.test(c));
  const [n, setN] = useState(0);
  const [step, setStep] = useState<Step>('listening');
  const [typed, setTyped] = useState('');
  const [again, setAgain] = useState(false);
  const [attempts, setAttempts] = useState<WordAttempt[]>([]);
  const player = useRef<MorsePlayer | null>(null);
  const started = useRef(0);
  /** Counts plays, so only the latest one's end lets you type. */
  const plays = useRef(0);
  const word = words[n];

  /** Plays a word; the caller has set the step to 'listening'. */
  const play = useCallback(
    async (w: MorseWord) => {
      const p = (player.current ??= new MorsePlayer());
      const id = ++plays.current;
      const pb = await p.play(written(w), { charWpm: CHAR_WPM, effWpm: progress.effWpm });
      await pb.done;
      if (id === plays.current) setStep((s) => (s === 'listening' ? 'typing' : s));
    },
    [progress.effWpm],
  );

  useEffect(() => {
    if (word) void play(word);
  }, [word, play]);

  useEffect(() => {
    started.current = performance.now();
    return () => player.current?.close();
  }, []);

  const submit = useCallback(() => {
    if (!word || step !== 'typing' || !typed) return;
    setAttempts((a) => [...a, { word, typed, again }]);
    setStep('answered');
  }, [word, step, typed, again]);

  const next = useCallback(() => {
    if (n + 1 >= words.length) {
      onDone(attempts, (performance.now() - started.current) / 1000);
      return;
    }
    setN(n + 1);
    setStep('listening');
    setTyped('');
    setAgain(false);
  }, [n, words.length, attempts, onDone]);

  const repeat = useCallback(() => {
    if (!word || again || step === 'answered') return;
    setAgain(true);
    setTyped('');
    setStep('listening');
    void play(word);
  }, [word, again, step, play]);

  const press = useCallback(
    (k: string) => {
      if (step === 'answered') {
        if (k === 'Enter') next();
        return;
      }
      if (step !== 'typing') return;
      if (k === 'Enter') submit();
      else if (k === '⌫') setTyped((t) => t.slice(0, -1));
      else if (keys.includes(k)) setTyped((t) => (t.length < 12 ? t + k : t));
    },
    [step, next, submit, keys],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLButtonElement && e.key === 'Enter') return;
      const k = e.key === 'Backspace' ? '⌫' : e.key === 'Enter' ? 'Enter' : e.key.toUpperCase();
      if (k !== '⌫' && k !== 'Enter' && !keys.includes(k)) return;
      e.preventDefault();
      press(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, keys]);

  if (!word) return null;
  const last = attempts[attempts.length - 1];
  const answered = step === 'answered' && last;

  return (
    <div className="lesson__run">
      <div className="lesson__card lesson__copy">
        <p className="lesson__kicker">
          Word {n + 1} of {words.length}
          {step === 'listening' && ' · listening…'}
          {step === 'typing' && ' · type what you heard'}
        </p>
        {answered ? (
          <div className={`words__answer ${isRight(last) ? 'is-right' : 'is-wrong'}`}>
            <p className="words__played">{written(word)}</p>
            <p className="words__verdict">
              {isRight(last)
                ? scoreOf(last) < 1
                  ? 'Right, on the second hearing.'
                  : 'Right.'
                : `You copied ${last.typed || 'nothing'}.`}
            </p>
            {word.meaning && (
              <p className="words__meaning">
                <span>{KIND_LABEL[word.kind]}</span> {word.meaning}
              </p>
            )}
          </div>
        ) : (
          <div className="lesson__copied words__typed" aria-live="off" data-testid="copied">
            {typed ? (
              <span>{typed}</span>
            ) : (
              <span className="lesson__hint">
                {step === 'listening' ? 'Listen to the whole word…' : 'Your copy appears here'}
              </span>
            )}
          </div>
        )}
        <p className="lesson__keys">On a keyboard: type the word · Enter to answer</p>
      </div>
      {answered ? (
        <div className="lesson__actions">
          <button type="button" className="lesson__go" onClick={next}>
            {n + 1 >= words.length ? 'See the round' : 'Next word'}
          </button>
        </div>
      ) : (
        <>
          <div className="lesson__pad" aria-label="Letter keys">
            {keys.map((c) => (
              <button
                key={c}
                type="button"
                className="lesson__key"
                onClick={() => press(c)}
                disabled={step !== 'typing'}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="lesson__aux">
            <button
              type="button"
              className="lesson__key lesson__key--aux words__agn"
              onClick={repeat}
              disabled={again || step === 'listening'}
              aria-label="AGN: hear it again"
            >
              AGN
            </button>
            <button
              type="button"
              className="lesson__key lesson__key--aux"
              onClick={() => press('⌫')}
              disabled={step !== 'typing'}
              aria-label="Delete"
            >
              ⌫
            </button>
            <button
              type="button"
              className="lesson__key lesson__key--aux words__send"
              onClick={submit}
              disabled={step !== 'typing' || !typed}
            >
              Answer
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Summary({ attempts, onAgain }: { attempts: WordAttempt[]; onAgain: () => void }) {
  const right = attempts.filter(isRight).length;
  return (
    <div className="lesson__card words__result">
      <p className="lesson__kicker">Round finished</p>
      <p className="lesson__score">
        {right} of {attempts.length} words · +{xpForWords(attempts)} XP
      </p>
      <ul className="words__list">
        {attempts.map((a, i) => (
          <li key={i} className={isRight(a) ? 'is-right' : 'is-wrong'}>
            <strong>{written(a.word)}</strong>
            {!isRight(a) && <span> you copied {a.typed}</span>}
            {isRight(a) && a.again && <span> after AGN</span>}
            {a.word.meaning && <small>{a.word.meaning}</small>}
          </li>
        ))}
      </ul>
      <div className="lesson__actions">
        <button type="button" className="lesson__go" onClick={onAgain}>
          Another round
        </button>
      </div>
    </div>
  );
}
