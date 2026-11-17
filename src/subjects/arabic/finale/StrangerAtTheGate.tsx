import { useEffect, useMemo, useRef, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import type { InnTurn, Verdict } from '../../../core/partner.ts';
import { paintTable, TABLE_STAGE } from '../../../core/city/paintTable.ts';
import { pictureUrl } from '../../../core/city/picture.ts';
import { NextStep } from '../../../core/road/NextStep.tsx';
import { parseProgress, type ArabicProgress } from '../progress.ts';
import { loadOwnSentences } from '../core/coreWords.ts';
import { LineInput } from '../chat/LineInput.tsx';
import { lineInHebrew, MAX_LINES } from '../chat/innChat.ts';
import { Pad } from '../write/Slate.tsx';
import { glyphGrid } from '../write/glyph.ts';
import { dilate, FREE_PASS, scoreTrace, type TraceScore } from '../write/trace.ts';
import {
  FINALE_STORY,
  finaleOpen,
  finalePassed,
  FINALE_XP,
  guestPage,
  PAGE_LINES,
  PAGE_PASS,
  pageRead,
  pickStranger,
  readVerdict,
  reportFinale,
  STORY_LINES,
  storyPassed,
  yourLines,
  type PageLine,
  type Stranger,
} from './stranger.ts';
import '../../../core/city/finale.css';
import './stranger.css';

// The Stranger at the Gate (tasks 4.2 and 4.3; ADR 0047): the Long Road In's last chapter. Read
// the guest book, write the stranger's name, tell the table your story; then the finale screen.
// The rules are in stranger.ts, the story in content/arabic/finale.json.

/** Tries at the stranger's name before the part is missed. */
const NAME_TRIES = 3;

type Stage =
  | { kind: 'intro' }
  | { kind: 'book'; page: PageLine[]; started: number }
  | { kind: 'slate'; stranger: Stranger; tries: number; started: number }
  | { kind: 'story'; turns: InnTurn[]; waiting: boolean; ended?: string; started: number }
  | { kind: 'judging'; turns: InnTurn[]; started: number }
  | { kind: 'missed'; why: string; verdict?: Verdict; xp: number }
  | { kind: 'passed'; xp: number };

export function StrangerAtTheGate({
  api,
  onTable,
}: {
  api: SubjectApi;
  /** Opens "Sit and talk": the table is never empty (the daily loop, docs/game/the-road.md §6). */
  onTable?: () => void;
}) {
  const [progress, setProgress] = useState<ArabicProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
  const [noPage, setNoPage] = useState(false);
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    api.loadState().then(
      (s) => live.current && setProgress(parseProgress(s)),
      () => live.current && setFailed(true),
    );
    return () => {
      live.current = false;
    };
  }, [api]);

  if (failed)
    return (
      <p className="lesson__card">
        The innkeeper’s book couldn’t be found. Check your connection and reload the page.
      </p>
    );
  if (!progress) return <p className="arabic__loading">Lighting the lamps…</p>;

  const end = (passed: boolean, started: number, why: string, verdict?: Verdict) => {
    const first = passed && !progress.finale;
    setStage(
      passed
        ? { kind: 'passed', xp: first ? FINALE_XP.pass : FINALE_XP.try }
        : { kind: 'missed', why, verdict, xp: FINALE_XP.try },
    );
    reportFinale(api, progress, passed, (Date.now() - started) / 1000).then(
      (next) => {
        if (!live.current) return;
        setProgress(next);
        setSaveFailed(false);
      },
      () => live.current && setSaveFailed(true),
    );
  };

  const begin = () => {
    const started = Date.now();
    loadOwnSentences().then(
      (sentences) => {
        if (!live.current) return;
        const page = guestPage(progress.words.met, sentences);
        if (!page) {
          setNoPage(true);
          return;
        }
        setStage({ kind: 'book', page, started });
      },
      () => live.current && setFailed(true),
    );
  };

  const ask = (s: Extract<Stage, { kind: 'story' }>, turns: InnTurn[]) => {
    setStage({ ...s, turns, waiting: true });
    api
      .partner({ kind: 'inn-story', learner: { name: progress.chat.name || 'traveler' }, turns })
      .then(
        (reply) => {
          if (!live.current) return;
          setStage({ ...s, turns: [...turns, { who: 'them', text: reply.text }], waiting: false });
        },
        () => {
          if (!live.current) return;
          setStage({
            ...s,
            turns,
            waiting: false,
            ended: 'The innkeeper is called to the kitchen. Tell your story another evening.',
          });
        },
      );
  };

  const judge = (turns: InnTurn[], started: number) => {
    setStage({ kind: 'judging', turns, started });
    api.partner({ kind: 'inn-judge', turns }).then(
      (reply) => {
        if (!live.current) return;
        const verdict = readVerdict(reply.text);
        if (!verdict) {
          setStage({ kind: 'missed', why: 'The table couldn’t agree tonight.', xp: 0 });
          return;
        }
        const passed = storyPassed(verdict, turns);
        end(passed, started, verdict.why, verdict);
      },
      () =>
        live.current &&
        setStage({
          kind: 'missed',
          why: 'The table couldn’t agree tonight. Your story is still yours: tell it again another evening.',
          xp: 0,
        }),
    );
  };

  return (
    <section className="lesson arabic finale" aria-label={FINALE_STORY.title}>
      {saveFailed && (
        <p className="lesson__warning" role="alert">
          Your evening couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {stage.kind === 'intro' && (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">The finale · the Long Road In</p>
          <h2 className="lesson__title">{FINALE_STORY.title}</h2>
          <p>{FINALE_STORY.intro}</p>
          <p className="arabic__note">{FINALE_STORY.rules}</p>
          <p className="arabic__note">
            Said openly: the innkeeper’s lines and the judge are an AI (Groq), and what you type or
            say is sent to it. Say nothing private.
          </p>
          {finalePassed(progress) && (
            <p className="arabic__note">Passed. The table is never empty: tell it again.</p>
          )}
          {noPage && (
            <p className="arabic__note">
              The guest book needs more of the words you’ve met. Meet more at the innkeeper’s table.
            </p>
          )}
          {finaleOpen(progress) ? (
            <button type="button" className="lesson__go" onClick={begin}>
              Go to the gate
            </button>
          ) : (
            <p className="arabic__note">Opens once you are a Storyteller.</p>
          )}
        </div>
      )}
      {stage.kind === 'book' && (
        <GuestBook
          page={stage.page}
          onDone={(answers) => {
            const read = pageRead(stage.page, answers);
            if (read < PAGE_PASS)
              end(
                false,
                stage.started,
                `You read ${read} of ${PAGE_LINES} lines; the book needs ${PAGE_PASS}.`,
              );
            else
              setStage({
                kind: 'slate',
                stranger: pickStranger(),
                tries: 0,
                started: stage.started,
              });
          }}
        />
      )}
      {stage.kind === 'slate' && (
        <NameSlate
          key={stage.tries}
          stranger={stage.stranger}
          tries={stage.tries}
          onDone={(ok) => {
            if (ok) {
              const s = {
                kind: 'story' as const,
                turns: [],
                waiting: true,
                started: stage.started,
              };
              ask(s, []);
            } else if (stage.tries + 1 >= NAME_TRIES) {
              end(false, stage.started, `The name didn’t come out right in ${NAME_TRIES} tries.`);
            } else setStage({ ...stage, tries: stage.tries + 1 });
          }}
        />
      )}
      {(stage.kind === 'story' || stage.kind === 'judging') && (
        <Story
          api={api}
          progress={progress}
          onHebrew={(on) => setProgress({ ...progress, chat: { ...progress.chat, hebrew: on } })}
          turns={stage.turns}
          waiting={stage.kind === 'judging' || stage.waiting}
          judging={stage.kind === 'judging'}
          ended={stage.kind === 'story' ? stage.ended : undefined}
          onSay={(line) => {
            if (stage.kind !== 'story') return;
            const turns: InnTurn[] = [...stage.turns, { who: 'you', text: line }];
            if (yourLines(turns) >= MAX_LINES) judge(turns, stage.started);
            else ask(stage, turns);
          }}
          onFinish={() => judge(stage.turns, stage.started)}
          onLeave={() => setStage({ kind: 'intro' })}
        />
      )}
      {stage.kind === 'missed' && (
        <div className="lesson__card stranger__result">
          <p className="lesson__kicker">The table goes quiet</p>
          <h2 className="lesson__title">Not tonight</h2>
          <p>{FINALE_STORY.missed}</p>
          {stage.verdict && <Verdicts verdict={stage.verdict} />}
          <p className="arabic__note">{stage.why}</p>
          {stage.xp > 0 && <p className="arabic__xp">+{stage.xp} XP</p>}
          <div className="lesson__actions">
            <NextStep onHere={begin} />
            <button type="button" className="lesson__go" onClick={begin}>
              Try again
            </button>
          </div>
        </div>
      )}
      {stage.kind === 'passed' && <Finale xp={stage.xp} onTable={onTable} />}
    </section>
  );
}

function GuestBook({ page, onDone }: { page: PageLine[]; onDone: (answers: string[]) => void }) {
  const [answers, setAnswers] = useState<string[]>([]);
  const filled = page.every((_, i) => answers[i]);
  return (
    <form
      className="lesson__card stranger__card"
      onSubmit={(e) => {
        e.preventDefault();
        if (filled) onDone(answers);
      }}
    >
      <p className="lesson__kicker">The guest book · part 1 of 3</p>
      <p>{FINALE_STORY.book}</p>
      {page.map((l, i) => (
        <fieldset key={l.arabic} className="stranger__choices">
          <legend>
            <span lang="ar" dir="rtl" className="finale__arabic">
              {l.arabic}
            </span>
          </legend>
          {l.choices.map((c) => (
            <label key={c} className={answers[i] === c ? 'is-picked' : ''}>
              <input
                type="radio"
                name={`line${i}`}
                value={c}
                checked={answers[i] === c}
                onChange={() =>
                  setAnswers((a) => {
                    const next = [...a];
                    next[i] = c;
                    return next;
                  })
                }
              />
              {c}
            </label>
          ))}
        </fieldset>
      ))}
      <div className="lesson__actions">
        <button type="submit" className="lesson__go" disabled={!filled}>
          Read it to them
        </button>
      </div>
    </form>
  );
}

function NameSlate({
  stranger,
  tries,
  onDone,
}: {
  stranger: Stranger;
  tries: number;
  onDone: (ok: boolean) => void;
}) {
  const [score, setScore] = useState<TraceScore | null>(null);
  return (
    <div className="lesson__card arabic__slate">
      <p className="lesson__kicker">The slate · part 2 of 3</p>
      <p>{FINALE_STORY.slate}</p>
      <p className="finale__say">
        “My name is {stranger.latin}” · like <bdi lang="he">{stranger.hebrew}</bdi>
      </p>
      <p className="arabic__note">
        Write it in Arabic letters, from memory. Try {tries + 1} of {NAME_TRIES}.
      </p>
      <Pad
        letter={stranger.arabic}
        guide={false}
        score={score}
        onCheck={(ink) => {
          const shape = glyphGrid(stranger.arabic);
          if (!shape) return;
          setScore(scoreTrace(shape, dilate(shape, 4), ink, FREE_PASS));
        }}
        onClear={() => setScore(null)}
      />
      {score && (
        <div className="arabic__feedback" aria-live="polite">
          <p className={score.passed ? 'arabic__good' : 'arabic__bad'}>
            {score.passed ? (
              <>
                Good: <bdi lang="ar">{stranger.arabic}</bdi>. The stranger nods.
              </>
            ) : (
              'The stranger tilts their head. That isn’t quite their name.'
            )}
          </p>
          <button
            type="button"
            className="lesson__go"
            onClick={() => onDone(score.passed)}
            autoFocus
          >
            {score.passed ? 'Write it in the book' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  );
}

function Story({
  api,
  progress,
  onHebrew,
  turns,
  waiting,
  judging,
  ended,
  onSay,
  onFinish,
  onLeave,
}: {
  api: SubjectApi;
  progress: ArabicProgress;
  onHebrew: (on: boolean) => void;
  turns: InnTurn[];
  waiting: boolean;
  judging: boolean;
  ended?: string;
  onSay: (line: string) => void;
  onFinish: () => void;
  onLeave: () => void;
}) {
  const [shown, setShown] = useState<ReadonlySet<number>>(new Set());
  const mine = yourLines(turns);
  const lines = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = lines.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, waiting]);
  return (
    <div className="lesson__card arabic__chat">
      <p className="lesson__kicker">
        Your story · part 3 of 3 · {mine} of {MAX_LINES}
      </p>
      {turns.length <= 1 && <p>{FINALE_STORY.story}</p>}
      <ol className="arabic__chat-lines" aria-live="polite" ref={lines}>
        {turns.map((t, i) => (
          <li key={i} className={`arabic__bubble arabic__bubble--${t.who}`}>
            {t.who === 'them' ? (
              <button
                type="button"
                aria-pressed={shown.has(i)}
                onClick={() =>
                  setShown((now) => {
                    const next = new Set(now);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  })
                }
              >
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
        {waiting && !judging && (
          <li className="arabic__bubble arabic__bubble--them arabic__typing">…</li>
        )}
      </ol>
      {judging ? (
        <p className="arabic__note" aria-live="polite">
          The table talks it over…
        </p>
      ) : ended ? (
        <>
          <p className="arabic__note">{ended}</p>
          <div className="lesson__actions">
            <button type="button" className="lesson__go" onClick={onLeave}>
              Back to the gate
            </button>
          </div>
        </>
      ) : (
        <>
          <LineInput
            api={api}
            hebrew={progress.chat.hebrew}
            onHebrew={onHebrew}
            disabled={waiting}
            onSay={onSay}
          />
          <div className="lesson__actions">
            {mine >= STORY_LINES ? (
              <button type="button" className="lesson__go" onClick={onFinish} disabled={waiting}>
                That’s my story
              </button>
            ) : (
              <p className="arabic__note">
                Tell at least {STORY_LINES} lines; the table listens to {MAX_LINES}.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const PARTS: [keyof Omit<Verdict, 'why'>, string][] = [
  ['understood', 'You understood them'],
  ['answered', 'You answered, in Arabic they could follow'],
  ['keptGoing', 'You kept it going'],
];

function Verdicts({ verdict }: { verdict: Verdict }) {
  return (
    <ul className="stranger__log">
      {PARTS.map(([k, label]) => (
        <li key={k} className={verdict[k] ? 'is-right' : 'is-wrong'}>
          <span>{label}</span>
          <strong>{verdict[k] ? 'Yes' : 'Not yet'}</strong>
        </li>
      ))}
    </ul>
  );
}

/** The finale screen: worth reaching. */
function Finale({ xp, onTable }: { xp: number; onTable?: () => void }) {
  const picture = useMemo(() => pictureUrl('table', TABLE_STAGE, paintTable), []);
  return (
    <div className="lesson__card finale__card">
      <img className="finale__picture" src={picture} alt={FINALE_STORY.screen} />
      <p className="lesson__kicker">The Long Road In · the end of the road</p>
      <h2 className="lesson__title">{FINALE_STORY.title}</h2>
      <p className="finale__epilogue">{FINALE_STORY.epilogue}</p>
      <p className="finale__reward">
        You are <strong>Keeper of the Table</strong>. The innkeeper’s pen is in your wardrobe.
      </p>
      <p className="arabic__xp">+{xp} XP</p>
      <div className="lesson__actions">
        {onTable && (
          <button type="button" className="lesson__go" onClick={onTable}>
            The table is never empty: sit and talk
          </button>
        )}
      </div>
    </div>
  );
}
