import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useStage } from '../../../core/city/useStage.ts';
import type { SkillRating, SubjectApi } from '../../../core/subject.ts';
import { LESSONS, lettersUpTo } from '../letters.ts';
import { parseProgress, PASSES_NEEDED, wordsOpen, type ArabicProgress } from '../progress.ts';
import { questStatus, regularStatus, roman } from '../questline.ts';
import { RankUp } from '../../../core/ranks/RankUp.tsx';
import { heldRanks, needLine } from '../../../core/ranks/ranks.ts';
import { ARABIC_RANKS, arabicStanding } from '../ranks.ts';
import { KHAN_STAGE, paintKhan, paintMilestones, type Box, type StationId } from './paintKhan.ts';
import { ArabicText } from '../ArabicText.tsx';
import { PHRASE_SETS } from '../phrases/sets.ts';
import { WORD_CHAPTERS } from '../core/coreWords.ts';
import './khan.css';

// Inside the Caravanserai (#42): the inn's courtyard. "The Long Road In" (#43) runs from your
// feet to the gate, a milestone per script lesson; the chapter is written on the scroll, your
// rank on the house banner, and each activity is a station in the courtyard. On an upright
// phone the courtyard pans sideways and the same things follow below it as cards.

export type CourtyardDoor =
  'lesson' | 'listen' | 'read' | 'write' | 'phrases' | 'words' | 'trial' | 'regular';

let painted: ReturnType<typeof paintKhan> | undefined;
const courtyard = () => (painted ??= paintKhan());

/** Below this scale the writing in the courtyard is too small to read; it moves below. */
const READABLE_SCALE = 0.62;

/** Narrow windows show the whole width with the sky above; wide ones are filled. */
function khanFit(width: number, height: number) {
  const sx = width / KHAN_STAGE.width;
  const sy = height / KHAN_STAGE.height;
  if (sx <= sy) return { scale: sx, x: 0, y: height - KHAN_STAGE.height * sx };
  const scale = Math.min(sx, sy / 0.82);
  const overY = KHAN_STAGE.height * scale - height;
  return { scale, x: (width - KHAN_STAGE.width * scale) / 2, y: -overY * 0.6 };
}

const at = ({ x, y, w, h }: Box): CSSProperties => ({ left: x, top: y, width: w, height: h });

/** A full-stage SVG layer, painted by our own painter (never from user input). */
function Layer({ svg, className = '' }: { svg: string; className?: string }) {
  return (
    <svg
      className={`khan__layer ${className}`}
      aria-hidden="true"
      width={KHAN_STAGE.width}
      height={KHAN_STAGE.height}
      viewBox={`0 0 ${KHAN_STAGE.width} ${KHAN_STAGE.height}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** A station's painting, filling its station (which is placed at `box`). */
function Part({ svg, box }: { svg: string; box: Box }) {
  return (
    <svg
      className="khan__part"
      aria-hidden="true"
      width={box.w}
      height={box.h}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

interface Station {
  id: StationId;
  title: string;
  text: ReactNode;
  open?: CourtyardDoor;
}

/** An Arabic run of text inside English. */
const Ar = ({ children }: { children: string }) => (
  <bdi lang="ar" dir="rtl" className="khan__ar">
    {children}
  </bdi>
);

export function Courtyard({
  api,
  onOpen,
}: {
  api: SubjectApi;
  onOpen: (door: CourtyardDoor) => void;
}) {
  const [progress, setProgress] = useState<ArabicProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [ratings, setRatings] = useState<ReadonlyMap<string, SkillRating>>(new Map());
  useEffect(() => {
    let live = true;
    api.loadState().then(
      (s) => live && setProgress(parseProgress(s)),
      () => live && setFailed(true),
    );
    // The ratings only add a line beside the rank (#180): if they can't be read, it shows dashes.
    api.skillRatings().then(
      (r) => live && setRatings(r),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [api]);
  if (failed)
    return (
      <p className="lesson__card">
        The inn’s ledger couldn’t be read. Check your connection and reload the page.
      </p>
    );
  if (!progress) return <p className="arabic__loading">Lighting the lamps…</p>;
  const here = arabicStanding(progress);
  const fresh = heldRanks(ARABIC_RANKS, here).filter((r) => !progress.ranks.includes(r.id));
  const take = async () => {
    const next = { ...progress, ranks: [...progress.ranks, ...fresh.map((r) => r.id)] };
    await api.saveSession({ state: next, events: fresh.map((r) => ({ kind: `rank-${r.id}` })) });
    setProgress(next);
  };
  return (
    <>
      <Scene progress={progress} ratings={ratings} onOpen={onOpen} />
      {fresh.length > 0 && (
        <RankUp guild="House of the Crossing" rank={here.rank} after={here} onTake={take} />
      )}
    </>
  );
}

/** The house's main skills, rated beside the rank (#180, ADR 0024): what you do now, not what you've done. */
const RATED = [
  ['read', 'Read'],
  ['listen', 'Listen'],
] as const;

function Ratings({
  ratings,
  className,
}: {
  ratings: ReadonlyMap<string, SkillRating>;
  className: string;
}) {
  return (
    <p className={className} aria-label="Your skill ratings">
      {RATED.map(([skill, label], i) => {
        const r = ratings.get(skill);
        return (
          <span key={skill}>
            {i > 0 && <span className="khan__sep"> · </span>}
            {label} {r ? Math.round(r.rating).toLocaleString('en-US') : '—'}
            {r?.provisional && <small title="Provisional: still settling">?</small>}
          </span>
        );
      })}
    </p>
  );
}

function Scene({
  progress,
  ratings,
  onOpen,
}: {
  progress: ArabicProgress;
  ratings: ReadonlyMap<string, SkillRating>;
  onOpen: (door: CourtyardDoor) => void;
}) {
  const [ref, { scale, x, y, pan }] = useStage(KHAN_STAGE.width * 0.3, khanFit);
  const compact = pan || scale < READABLE_SCALE;
  const khan = courtyard();
  const quest = questStatus(progress);
  const standing = arabicStanding(progress);
  const rank = {
    arabic: standing.rank.arabic ?? '',
    english: standing.rank.name,
    next: standing.next?.name ?? '—',
  };
  const toward = standing.checks.filter((c) => c.done).length;
  const lesson = LESSONS[progress.lesson - 1];
  const known = lettersUpTo(progress.done ? LESSONS.length : progress.lesson - 1).length;
  const total = lettersUpTo(LESSONS.length).length;

  const stations: Station[] = [
    {
      id: 'scribe',
      title: 'The scribe’s table',
      text: progress.done ? (
        'Every letter learned · practice'
      ) : (
        <>
          Lesson {progress.lesson} · <Ar>{lesson?.letters.map((l) => l.letter).join(' ') ?? ''}</Ar>
          {progress.streak > 0 && ` · ${progress.streak}/${PASSES_NEEDED}`}
        </>
      ),
      open: 'lesson',
    },
    { id: 'slate', title: 'The slate', text: 'Write the letters you know', open: 'write' },
    {
      id: 'innkeeper',
      title: 'The innkeeper’s table',
      text: !wordsOpen(progress)
        ? 'Words · pass the Painted Sign'
        : progress.words.done
          ? 'Words · keep them fresh'
          : `Words · ${WORD_CHAPTERS[progress.words.chapter - 1]?.title ?? ''}`,
      open: wordsOpen(progress) ? 'words' : undefined,
    },
    { id: 'fountain', title: 'The fountain', text: 'Listen: which letter?', open: 'listen' },
    { id: 'storyteller', title: 'The storyteller', text: 'Read short words', open: 'read' },
    {
      id: 'coffee',
      title: 'Coffee corner',
      text:
        progress.phraseSet > PHRASE_SETS.length
          ? 'Phrases · keep them warm'
          : `Phrases · ${PHRASE_SETS[progress.phraseSet - 1]?.title ?? ''}`,
      open: 'phrases',
    },
  ];

  // After the Painted Sign, the road goes on with the regulars at the innkeeper's table (#161).
  const road = quest.guest ? regularStatus(progress) : undefined;
  const trialLine = road
    ? road.passed
      ? `${road.regular.who} keeps a place at the innkeeper’s table.`
      : road.trialReady
        ? road.regular.trial.text
        : `Pass “${WORD_CHAPTERS[road.regular.wordChapter - 1]?.title ?? ''}” at the innkeeper’s table to face it. ${road.lit} of ${road.regular.milestones.length} milestones lit.`
    : quest.guest
      ? 'You read it. You are a guest of the house.'
      : quest.trialReady
        ? quest.chapter.trial.text
        : `Light all ${quest.chapter.lessons} milestones to face it. ${quest.lit} lit.`;
  const trialDoor = road?.trialReady
    ? {
        name: road.regular.trial.name,
        where: `Trial · Chapter ${roman(road.regular.number)} · at the table`,
        open: 'regular' as const,
      }
    : quest.trialReady
      ? {
          name: `Read ${quest.chapter.trial.name}`,
          where: 'Trial · Chapter I · at the gate',
          open: 'trial' as const,
        }
      : undefined;

  const story = (
    <>
      <p className="khan__kicker">Main questline · {quest.chapter.questline}</p>
      <h2 className="khan__chapter">
        Chapter {roman(road?.regular.number ?? 1)}: {road?.regular.title ?? quest.chapter.title}
      </h2>
      <blockquote className="khan__beat">
        <ArabicText
          text={
            road
              ? (road.beat ?? road.regular.intro)
              : quest.guest
                ? quest.chapter.outro
                : (quest.beat ?? quest.chapter.intro)
          }
        />
      </blockquote>
      <p className="khan__trial">
        <strong>Trial: {road?.regular.trial.name ?? quest.chapter.trial.name}.</strong> {trialLine}
      </p>
    </>
  );

  return (
    <div className={`place-scene khan${pan ? ' khan--pan' : ''}${compact ? ' is-compact' : ''}`}>
      <div className="khan__view" ref={ref}>
        {pan && (
          <div
            className="khan__sizer"
            style={{ width: KHAN_STAGE.width * scale, height: KHAN_STAGE.height * scale }}
          />
        )}
        <div
          className="khan__stage"
          style={{
            width: KHAN_STAGE.width,
            height: KHAN_STAGE.height,
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
          }}
        >
          <Layer svg={`<defs>${khan.defs}</defs>${khan.back}`} />
          <svg
            className="khan__layer"
            role="img"
            aria-label={`${quest.lit} of ${quest.chapter.lessons} milestones lit`}
            width={KHAN_STAGE.width}
            height={KHAN_STAGE.height}
            viewBox={`0 0 ${KHAN_STAGE.width} ${KHAN_STAGE.height}`}
            dangerouslySetInnerHTML={{ __html: paintMilestones(quest.lit, quest.chapter.lessons) }}
          />

          {stations.map((s) => {
            const part = khan.stations[s.id];
            const plaque = (
              <span
                className="khan__plaque"
                style={{ left: part.plaque.x - part.box.x, top: part.plaque.y - part.box.y }}
              >
                <span className="khan__plaque-title">{s.title}</span>
                <span className="khan__plaque-text">{s.text}</span>
              </span>
            );
            return s.open ? (
              <button
                key={s.id}
                type="button"
                className={`khan__station khan__station--${s.id}`}
                style={at(part.box)}
                onClick={() => s.open && onOpen(s.open)}
                tabIndex={compact ? -1 : undefined}
                aria-hidden={compact || undefined}
              >
                <Part svg={part.svg} box={part.box} />
                {plaque}
              </button>
            ) : (
              <div
                key={s.id}
                className={`khan__station khan__station--${s.id} is-locked`}
                style={at(part.box)}
                aria-hidden={compact || undefined}
              >
                <Part svg={part.svg} box={part.box} />
                {plaque}
              </div>
            );
          })}

          {trialDoor && (
            <button
              type="button"
              className="khan__gate"
              style={at(khan.gate)}
              onClick={() => onOpen(trialDoor.open)}
              tabIndex={compact ? -1 : undefined}
              aria-hidden={compact || undefined}
            >
              <span
                className="khan__plaque khan__plaque--trial"
                style={{ left: khan.gate.w / 2, top: -96 }}
              >
                <span className="khan__plaque-title">{trialDoor.name}</span>
                <span className="khan__plaque-text">{trialDoor.where}</span>
              </span>
            </button>
          )}
          <Layer svg={khan.front} />

          {!compact && (
            <section className="khan__scroll" aria-label="Main questline">
              {story}
            </section>
          )}
          {!compact && (
            <aside
              className="khan__banner"
              style={at(khan.banner)}
              aria-label="Your standing in the house"
            >
              <p className="khan__house">House of the Crossing</p>
              <p className="khan__rank-ar" lang="ar" dir="rtl">
                {rank.arabic}
              </p>
              <p className="khan__rank">{rank.english}</p>
              <p className="khan__letters">
                {progress.guest
                  ? `${rank.next}: ${toward} / ${standing.checks.length}`
                  : `${known} / ${total} letters`}
              </p>
              <Ratings ratings={ratings} className="khan__ratings" />
            </aside>
          )}
        </div>
      </div>

      {compact && (
        <div className="khan__below">
          <section className="khan__card khan__quest" aria-label="Main questline">
            {story}
          </section>
          <nav className="khan__doors" aria-label="Caravanserai">
            {trialDoor && (
              <button
                type="button"
                className="khan__card khan__door is-main is-trial"
                onClick={() => onOpen(trialDoor.open)}
              >
                <span className="khan__card-kicker">{trialDoor.where}</span>
                <span className="khan__door-title">{trialDoor.name}</span>
                <span className="khan__door-go">Go →</span>
              </button>
            )}
            {stations.map((s) =>
              s.open ? (
                <button
                  key={s.id}
                  type="button"
                  className={`khan__card khan__door${s.id === (progress.guest ? 'innkeeper' : 'scribe') && !trialDoor ? ' is-main' : ''}`}
                  onClick={() => s.open && onOpen(s.open)}
                >
                  <span className="khan__door-title">{s.title}</span>
                  <span className="khan__door-text">{s.text}</span>
                </button>
              ) : (
                <div key={s.id} className="khan__card khan__door is-locked">
                  <span className="khan__door-title">{s.title}</span>
                  <span className="khan__door-text">{s.text}</span>
                </div>
              ),
            )}
          </nav>
          <aside className="khan__card" aria-label="Your standing in the house">
            <p className="khan__card-kicker">House of the Crossing</p>
            <p className="khan__card-rank">
              <bdi lang="ar" dir="rtl">
                {rank.arabic}
              </bdi>{' '}
              · {rank.english}
            </p>
            <p className="khan__card-next">
              Next: {rank.next} ·{' '}
              {progress.guest ? needLine(standing) : `${known} / ${total} letters`}
            </p>
            <Ratings ratings={ratings} className="khan__card-ratings" />
          </aside>
        </div>
      )}
    </div>
  );
}
