import { useEffect, useRef, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { PartnerError, type CoachTip, type InnTurn } from '../../../core/partner.ts';
import { parseProgress, type ArabicProgress } from '../progress.ts';
import type { Regular } from '../questline.ts';
import { CoachPhrases } from './CoachPhrases.tsx';
import {
  afterChat,
  CHAT_XP,
  chatAsk,
  cleanTyped,
  fromHebrew,
  GOODBYE,
  lineInHebrew,
  linesOf,
  LINES_FOR_XP,
  MAX_LINES,
  MAX_TYPED,
  regularsToTalkTo,
  tipsFrom,
  dueTips,
  withTips,
} from './innChat.ts';

// "Sit and talk" at the innkeeper's table (E17, ADR 0038): a short chat in Palestinian Arabic
// with one of the regulars. Their lines are written live by api/partner.ts on Groq; when it
// can't answer, the regular has to go and serve someone, and the chat ends kindly.

/** The on-screen keyboard: the letters in alphabetical order, then the other forms. */
const LETTERS = [
  ...'ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي'.split(' '),
  ...'ة ى ء أ إ آ ؤ ئ'.split(' '),
];

type Stage =
  | { kind: 'pick' }
  /** Practicing the Coach's phrases that are due. */
  | { kind: 'tips'; tips: ArabicProgress['chat']['tips'] }
  | {
      kind: 'chat';
      regular: Regular;
      turns: InnTurn[];
      waiting: boolean;
      /** Why the chat ended, once it has. */
      ended?: string;
      started: number;
    };

function endLine(r: Regular, e: unknown): string {
  if (e instanceof PartnerError && e.problem === 'daily-limit')
    return 'That’s enough talk for one day. The regulars will be here tomorrow.';
  return `${r.who} has to serve a customer. Come back in a while.`;
}

export function InnChat({ api }: { api: SubjectApi }) {
  const [progress, setProgress] = useState<ArabicProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'pick' });
  const [name, setName] = useState('');
  const [typed, setTyped] = useState('');
  const [shown, setShown] = useState<ReadonlySet<number>>(new Set());
  /** The Coach after a chat (ADR 0007): not asked, asking, the tips, or no answer. */
  const [coach, setCoach] = useState<'idle' | 'asking' | 'failed' | CoachTip[]>('idle');
  /** Review items due now (only the Coach's `tip:` ones matter here). */
  const [due, setDue] = useState<readonly { itemId: string }[]>([]);
  const saved = useRef(false);
  const lines = useRef<HTMLOListElement>(null);
  // The newest line is always in view: the list scrolls to its end as the chat grows.
  const count = stage.kind === 'chat' ? stage.turns.length + (stage.waiting ? 1 : 0) : 0;
  useEffect(() => {
    const el = lines.current;
    if (el && count) el.scrollTop = el.scrollHeight;
  }, [count]);
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    api.loadState().then(
      (s) => {
        if (!live.current) return;
        const p = parseProgress(s);
        setProgress(p);
        setName(p.chat.name);
      },
      () => live.current && setFailed(true),
    );
    // The Coach's phrases only add a button: if they can't be read, it doesn't show.
    api.dueItems({ limit: 200 }).then(
      (d) => live.current && setDue(d),
      () => undefined,
    );
    return () => {
      live.current = false;
    };
  }, [api]);

  if (failed)
    return (
      <p className="lesson__card">
        The innkeeper’s table couldn’t load. Check your connection and reload the page.
      </p>
    );
  if (!progress) return <p className="arabic__loading">Setting the table…</p>;
  const regulars = regularsToTalkTo(progress);
  if (!regulars.length)
    return (
      <p className="lesson__card">
        The regulars talk with guests of the house: pass the Painted Sign first.
      </p>
    );

  const save = (
    s: Extract<Stage, { kind: 'chat' }>,
    turns: InnTurn[],
    now: number,
    p: ArabicProgress,
  ) => {
    if (saved.current || !linesOf(turns)) return;
    saved.current = true;
    const next = afterChat(p, s.regular, turns);
    setProgress(next);
    api
      .saveSession({
        state: next,
        xp: linesOf(turns) >= LINES_FOR_XP ? CHAT_XP : 0,
        // For the daily contract and the achievement (migration 20261209000000).
        events: [
          { kind: 'inn-chat' },
          ...(p.chat.told[String(s.regular.number)] ? [] : [{ kind: 'inn-regular' }]),
        ],
        minutes: Math.round((now - s.started) / 60000),
      })
      .then(
        () => setSaveFailed(false),
        () => setSaveFailed(true),
      );
  };

  const ask = (s: Extract<Stage, { kind: 'chat' }>, turns: InnTurn[], p: ArabicProgress) => {
    setStage({ ...s, turns, waiting: true });
    // A reply counts only for the chat still going (not one you've left).
    const same = (now: Stage) => now.kind === 'chat' && now.started === s.started && !now.ended;
    api.partner(chatAsk(s.regular, p, turns)).then(
      (reply) => {
        if (!live.current) return;
        const them: InnTurn[] = [...turns, { who: 'them', text: reply.text }];
        setStage((now) => (same(now) ? { ...s, turns: them, waiting: false } : now));
      },
      (e: unknown) => {
        if (!live.current) return;
        setStage((now) =>
          same(now) ? { ...s, turns, waiting: false, ended: endLine(s.regular, e) } : now,
        );
        save(s, turns, Date.now(), p);
      },
    );
  };

  const sit = (regular: Regular, now: number) => {
    const clean = name.trim().slice(0, 24);
    const p = { ...progress, chat: { ...progress.chat, name: clean } };
    setProgress(p);
    saved.current = false;
    setShown(new Set());
    setCoach('idle');
    setTyped('');
    ask({ kind: 'chat', regular, turns: [], waiting: true, started: now }, [], p);
  };

  if (stage.kind === 'tips')
    return (
      <section className="lesson arabic" aria-label="The Coach’s phrases">
        <CoachPhrases
          api={api}
          tips={stage.tips}
          onDone={() => {
            const done = new Set(stage.tips.map((t) => t.id));
            setDue((d) => d.filter((x) => !done.has(x.itemId)));
            setStage({ kind: 'pick' });
          }}
        />
      </section>
    );

  const practice = dueTips(progress, due);
  if (stage.kind === 'pick')
    return (
      <section className="lesson arabic" aria-label="Sit and talk">
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">The innkeeper’s table · sit and talk</p>
          <h2 className="lesson__title">Who will you sit with?</h2>
          <p>
            Talk with a regular in Arabic, up to {MAX_LINES} of your lines. Tap their line to see it
            in Hebrew letters.
          </p>
          <label className="arabic__chat-name">
            The name they know you by
            <input
              value={name}
              maxLength={24}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <ul className="arabic__chat-who">
            {regulars.map((r) => (
              <li key={r.number}>
                <button
                  type="button"
                  className="lesson__plain"
                  disabled={!name.trim()}
                  onClick={() => sit(r, Date.now())}
                >
                  <strong>{r.who}</strong> · {r.title}
                </button>
              </li>
            ))}
          </ul>
          {practice.length > 0 && (
            <div className="lesson__actions">
              <button
                type="button"
                className="lesson__go"
                onClick={() => setStage({ kind: 'tips', tips: practice })}
              >
                The Coach’s phrases · {practice.length}
              </button>
            </div>
          )}
          <p className="arabic__note">
            Said openly: the regulars’ lines are written by an AI (Groq), and what you type is sent
            to it. Type nothing private.
          </p>
        </div>
      </section>
    );

  const s = stage;
  const mine = linesOf(s.turns);
  const hebrew = progress.chat.hebrew;
  /** What they'll read: what you typed, from Hebrew letters if that's how you type. */
  const line = cleanTyped(hebrew ? fromHebrew(typed) : typed);
  const setHebrew = (on: boolean) => {
    setProgress({ ...progress, chat: { ...progress.chat, hebrew: on } });
    setTyped('');
  };
  const send = (now: number) => {
    const text = line;
    if (!text || s.waiting || s.ended) return;
    setTyped('');
    const turns: InnTurn[] = [...s.turns, { who: 'you', text }];
    if (linesOf(turns) >= MAX_LINES) {
      const last: InnTurn[] = [...turns, { who: 'them', text: GOODBYE }];
      setStage({ ...s, turns: last, ended: `${s.regular.who} has to go.` });
      save(s, last, now, progress);
      return;
    }
    ask(s, turns, progress);
  };
  const leave = (now: number) => {
    setStage({ ...s, ended: 'You leave the table.' });
    save(s, s.turns, now, progress);
  };
  const askCoach = () => {
    setCoach('asking');
    api.partner({ kind: 'inn-coach', turns: s.turns }).then(
      (reply) => {
        if (!live.current) return;
        const tips = tipsFrom(reply.text);
        setCoach(tips ?? 'failed');
        if (!tips?.length) return;
        // Kept for practice: each new tip becomes a review item, due again soon.
        const next = withTips(progress, tips);
        const have = new Set(progress.chat.tips.map((t) => t.id));
        const fresh = next.chat.tips.filter((t) => !have.has(t.id));
        setProgress(next);
        api
          .saveSession({
            state: next,
            reviews: fresh.map((t) => ({ itemId: t.id, grade: 'good' as const })),
          })
          .then(
            () => setSaveFailed(false),
            () => setSaveFailed(true),
          );
      },
      () => live.current && setCoach('failed'),
    );
  };
  const toggle = (i: number) =>
    setShown((now) => {
      const next = new Set(now);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section className="lesson arabic" aria-label={`Talking with ${s.regular.who}`}>
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your chat couldn’t be saved. Check your connection and try again.
        </p>
      )}
      <div className="lesson__card arabic__chat">
        <p className="lesson__kicker">
          Sit and talk · {s.regular.who} · {mine} of {MAX_LINES}
        </p>
        <ol className="arabic__chat-lines" aria-live="polite" ref={lines}>
          {s.turns.map((t, i) => (
            <li key={i} className={`arabic__bubble arabic__bubble--${t.who}`}>
              {t.who === 'them' ? (
                <button type="button" onClick={() => toggle(i)} aria-pressed={shown.has(i)}>
                  <span lang="ar" dir="rtl">
                    {t.text}
                  </span>
                  {shown.has(i) && (
                    <span lang="he" dir="rtl" className="arabic__bubble-he">
                      {lineInHebrew(t.text)}
                    </span>
                  )}
                </button>
              ) : (
                <span lang="ar" dir="rtl">
                  {t.text}
                </span>
              )}
            </li>
          ))}
          {s.waiting && <li className="arabic__bubble arabic__bubble--them arabic__typing">…</li>}
        </ol>
        {s.ended ? (
          <>
            <p className="arabic__note">{s.ended}</p>
            {mine >= LINES_FOR_XP && <p className="arabic__xp">+{CHAT_XP} XP</p>}
            {Array.isArray(coach) && (
              <div className="arabic__coach" aria-label="The Coach">
                <p className="lesson__kicker">The Coach</p>
                {coach.length === 0 ? (
                  <p>Nothing to fix. Well said!</p>
                ) : (
                  <ol>
                    {coach.map((t) => (
                      <li key={t.said}>
                        <span className="arabic__coach-said" lang="ar" dir="rtl">
                          {t.said}
                        </span>
                        <span className="arabic__coach-better" lang="ar" dir="rtl">
                          {t.better}
                        </span>
                        <span className="arabic__bubble-he" lang="he" dir="rtl">
                          {lineInHebrew(t.better)}
                        </span>
                        <span className="arabic__coach-why">{t.why}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {coach.length > 0 && (
                  <p className="arabic__note">
                    Kept for practice: they’ll come back at this table.
                  </p>
                )}
              </div>
            )}
            {coach === 'failed' && (
              <p className="arabic__note">
                The Coach couldn’t look at this chat. Try another time.
              </p>
            )}
            <div className="lesson__actions">
              {mine > 0 && (coach === 'idle' || coach === 'asking') && (
                <button
                  type="button"
                  className="lesson__plain"
                  disabled={coach === 'asking'}
                  onClick={askCoach}
                >
                  {coach === 'asking' ? 'The Coach is reading…' : 'Ask the Coach'}
                </button>
              )}
              <button
                type="button"
                className="lesson__go"
                onClick={() => setStage({ kind: 'pick' })}
              >
                Back to the table
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="arabic__chat-mode" role="group" aria-label="Type in">
              <button type="button" aria-pressed={!hebrew} onClick={() => setHebrew(false)}>
                Arabic
              </button>
              <button type="button" aria-pressed={hebrew} onClick={() => setHebrew(true)}>
                Hebrew letters
              </button>
            </div>
            <form
              className="arabic__chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                send(Date.now());
              }}
            >
              <input
                lang={hebrew ? 'he' : 'ar'}
                dir="rtl"
                aria-label={hebrew ? 'Your line, in Hebrew letters' : 'Your line, in Arabic'}
                value={typed}
                maxLength={MAX_TYPED}
                autoComplete="off"
                onChange={(e) => setTyped(e.target.value)}
              />
              <button type="submit" className="lesson__go" disabled={s.waiting || !line}>
                Say it
              </button>
            </form>
            {hebrew ? (
              <p className="arabic__chat-reads">
                They read:{' '}
                <bdi lang="ar" dir="rtl">
                  {line || '…'}
                </bdi>
              </p>
            ) : (
              <div className="arabic__keys" role="group" aria-label="Arabic keyboard" dir="rtl">
                {LETTERS.map((l) => (
                  <button key={l} type="button" onClick={() => setTyped((t) => t + l)}>
                    {l}
                  </button>
                ))}
                <button type="button" onClick={() => setTyped((t) => t + '؟')}>
                  ؟
                </button>
                <button type="button" onClick={() => setTyped((t) => t + '،')}>
                  ،
                </button>
                <button
                  type="button"
                  className="arabic__key-wide"
                  aria-label="Space"
                  onClick={() => setTyped((t) => t + ' ')}
                >
                  ␣
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => setTyped((t) => [...t].slice(0, -1).join(''))}
                >
                  ⌫
                </button>
              </div>
            )}
            <div className="lesson__actions">
              <button type="button" className="lesson__plain" onClick={() => leave(Date.now())}>
                Leave the table
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
