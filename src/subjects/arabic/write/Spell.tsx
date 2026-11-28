import { useEffect, useMemo, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { NextStep } from '../../../core/road/NextStep.tsx';
import { ArabicKeys } from '../chat/LineInput.tsx';
import { seeded } from '../lesson/questions.ts';
import { useAudio } from '../lesson/useAudio.ts';
import { NoDeck } from '../NoDeck.tsx';
import { parseProgress } from '../progress.ts';
import { DECK, wordsFrom, type Word } from '../words.ts';
import {
  isSpelledRight,
  markLetters,
  pickSpellRound,
  spellGrade,
  spellItemId,
  spellEvents,
  spellScore,
  SPELL_PASS,
  XP_PER_WORD,
  type Cluster,
} from './spell.ts';

/** A try, 1 or 2, that was right; null if neither was. */
type Tries = 1 | 2 | null;
/** What you see after a try: `wrong` is the right spelling, letter by letter. */
type Shown = { kind: 'wrong' } | { kind: 'done'; tries: Tries };

/** Letters apart, the wrong ones struck through as well as colored (not by color alone). */
function Letters({ of, label }: { of: Cluster[]; label: string }) {
  return (
    <p className="arabic__spell-letters" lang="ar" dir="rtl" role="group" aria-label={label}>
      {of.map((c, i) => (
        <span key={i} className={c.ok ? undefined : 'arabic__spell-wrong'}>
          {c.text}
          {!c.ok && <span className="arabic__sr-only"> (wrong)</span>}
        </span>
      ))}
    </p>
  );
}

/**
 * Spell it (#519): hear a word and read its meaning, then type it on the Arabic keyboard or your
 * own. Only its letters are checked. One wrong try shows the right spelling letter by letter,
 * a second shows it in full.
 */
export function Spell({ api }: { api: SubjectApi }) {
  const [round, setRound] = useState<Word[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [shown, setShown] = useState<Shown | null>(null);
  const [tried, setTried] = useState<Tries[]>([]);
  const [started] = useState(() => Date.now());
  const [saved, setSaved] = useState<'no' | 'yes' | 'failed'>('no');
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([api.loadState(), api.privateContent(DECK), api.dueItems({ limit: 500 })]).then(
      async ([state, pack, due]) => {
        const met = new Set(parseProgress(state).met);
        const words = wordsFrom(pack.items);
        // Which words are new: of a sample of the rest, those with no card yet.
        const dueIds = new Set(due.map((d) => d.itemId));
        const ids = words.map(spellItemId).filter((id) => !dueIds.has(id));
        // shortcut: only the first 200 count as maybe-seen; the rest are taken as new. Fine while
        // reviewStatus is one call; page through all ids if the deck's order starts to show.
        const seen = await api.reviewStatus(ids.slice(0, 200));
        if (!live) return;
        const picked = pickSpellRound(
          words,
          met,
          dueIds,
          (id) => !seen.has(id),
          seeded(Date.now()),
        );
        setEmpty(picked.length === 0);
        setRound(picked);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [api]);

  const upcoming = useMemo(() => round?.map((w) => w.audio) ?? [], [round]);
  const play = useAudio(api, upcoming);

  if (failed)
    return (
      <p className="lesson__card">
        The slate couldn’t be loaded. Check your connection and reload the page.
      </p>
    );
  if (!round) return <p className="arabic__loading">Lighting the lamps…</p>;
  if (empty) return <NoDeck what="words" />;

  const word = round[index];
  const done = index >= round.length;
  const right = tried.filter((t) => t !== null).length;

  const finish = (all: Tries[]) => {
    const share = all.filter((t) => t !== null).length / round.length;
    (async () => {
      await api.saveSession({
        reviews: round.map((w, i) => ({
          itemId: spellItemId(w),
          grade: spellGrade(all[i] ?? null),
        })),
        results: round.map((w, i) => ({
          skill: 'write',
          itemId: spellItemId(w),
          score: spellScore(all[i] ?? null),
        })),
        xp: all.filter((t) => t !== null).length * XP_PER_WORD,
        minutes: (Date.now() - started) / 60000,
        events: spellEvents(share),
        at: new Date(),
      });
      // Three passed rounds open the inn on the Arabic keyboard (EARS 6). If only this write
      // fails, the round is saved but not counted; the player sees the save message.
      if (share >= SPELL_PASS) {
        const p = parseProgress(await api.loadState());
        await api.saveState({ ...p, spelled: p.spelled + 1 });
      }
    })().then(
      () => setSaved('yes'),
      () => setSaved('failed'),
    );
  };

  const check = () => {
    if (!word || shown?.kind === 'done') return;
    const wrong = shown?.kind === 'wrong';
    if (isSpelledRight(word.arabic, typed)) setShown({ kind: 'done', tries: wrong ? 2 : 1 });
    else setShown(wrong ? { kind: 'done', tries: null } : { kind: 'wrong' });
  };

  const next = () => {
    if (shown?.kind !== 'done') return;
    const all = [...tried, shown.tries];
    setTried(all);
    setShown(null);
    setTyped('');
    setIndex(index + 1);
    if (index + 1 >= round.length) finish(all);
  };

  if (done)
    return (
      <section className="lesson arabic" aria-label="Spell it">
        {saved === 'failed' && (
          <p className="lesson__warning" role="alert">
            Your spelling couldn’t be saved. Check your connection and try again.
          </p>
        )}
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">Spell it · done</p>
          <p className="arabic__pct">
            {right} / {round.length}
          </p>
          <p>Words spelled right. Spelling helps you read and write them.</p>
          <p className="arabic__xp">+{right * XP_PER_WORD} XP</p>
          <NextStep />
        </div>
      </section>
    );
  if (!word) return null;

  const marks = markLetters(word.arabic, typed);
  return (
    <section className="lesson arabic" aria-label="Spell it">
      <div className="lesson__card arabic__slate">
        <p className="lesson__kicker">
          Spell it · word {index + 1} of {round.length}
        </p>
        <h2 className="lesson__subtitle">Spell “{word.meaning}”</h2>
        <button type="button" className="arabic__listen" onClick={() => play(word.audio)}>
          ▶ Hear it
        </button>
        <form
          className="arabic__chat-form arabic__spell-form"
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <input
            lang="ar"
            dir="rtl"
            aria-label="Your spelling, in Arabic"
            value={typed}
            maxLength={40}
            autoComplete="off"
            readOnly={shown?.kind === 'done'}
            onChange={(e) => setTyped(e.target.value)}
          />
          {shown?.kind !== 'done' && (
            <button type="submit" className="lesson__go" disabled={!typed.trim()}>
              Check
            </button>
          )}
        </form>
        <div className="arabic__feedback" aria-live="polite">
          {shown?.kind === 'wrong' && (
            <>
              <p className="arabic__bad">Not quite. Here is the spelling, letter by letter.</p>
              <Letters of={marks.right} label="The right spelling" />
              <p className="arabic__note">Your wrong letters are marked. Try once more.</p>
            </>
          )}
          {shown?.kind === 'done' && (
            <>
              <p className={shown.tries ? 'arabic__good' : 'arabic__bad'}>
                {shown.tries === 1
                  ? 'Right!'
                  : shown.tries === 2
                    ? 'Right this time.'
                    : 'Not this time. Here it is.'}
              </p>
              <p className="arabic__spell-full" lang="ar" dir="rtl">
                {word.arabic}
              </p>
              {shown.tries === null && <Letters of={marks.yours} label="What you wrote" />}
              <button type="button" className="lesson__go" onClick={next} autoFocus>
                Next
              </button>
            </>
          )}
        </div>
        {shown?.kind !== 'done' && (
          <ArabicKeys
            punctuation={false}
            onType={(c) => setTyped((t) => t + c)}
            onDelete={() => setTyped((t) => [...t].slice(0, -1).join(''))}
          />
        )}
      </div>
    </section>
  );
}
