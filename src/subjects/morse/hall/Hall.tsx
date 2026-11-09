import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useStage } from '../../../core/city/useStage.ts';
import type { SkillRating, SubjectApi } from '../../../core/subject.ts';
import { MORSE_CHARS } from '../code.ts';
import {
  CHAR_WPM,
  parseProgress,
  pendingTrial,
  unlockedChars,
  type MorseProgress,
} from '../lesson/progress.ts';
import { questStatus, roman } from '../questline.ts';
import {
  BANNER,
  GATE,
  lampSpots,
  paintTower,
  SCROLL,
  TOWER_STAGE,
  type Box,
  type StationId,
} from './paintTower.ts';
import './hall.css';

// Inside the Signal Tower (#33): a painted room. The questline's stair climbs the back wall,
// one lamp per letter, to the trial's gate (#34); the chapter is written on the scroll, your
// rank on the guild's banner, and each activity is a station on the floor. On an upright phone
// the room pans sideways and the same things follow below it as cards.

const LETTERS = MORSE_CHARS.filter((c) => c.kind === 'letter').map((c) => c.char);

/** Guild ranks (discovery 04). Only the first step is reachable in M2. */
function rankOf(p: MorseProgress) {
  const letters = unlockedChars(p).filter((c) => LETTERS.includes(c)).length;
  return letters >= LETTERS.length
    ? {
        rank: 'Listener',
        next: 'Keyer',
        need: 'Clean sending of every letter (the rank comes later)',
      }
    : {
        rank: 'Initiate',
        next: 'Listener',
        need: `${letters} / ${LETTERS.length} letters`,
        progress: letters / LETTERS.length,
      };
}

export type HallDoor = 'koch' | 'recognition' | 'trial' | 'sending';

// The room never changes, so it's painted once per page load.
let painted: ReturnType<typeof paintTower> | undefined;
const room = () => (painted ??= paintTower());

/** Below this scale the writing on the walls is too small to read; it moves below the room. */
const READABLE_SCALE = 0.62;

/**
 * The room keeps its sides: windows narrower than 16:9 show all of it, and the dark ceiling
 * fills what's left above. Wider windows are filled, cutting a little off the top and bottom.
 */
function towerFit(width: number, height: number) {
  const sx = width / TOWER_STAGE.width;
  const sy = height / TOWER_STAGE.height;
  if (sx <= sy) return { scale: sx, x: 0, y: height - TOWER_STAGE.height * sx };
  const scale = Math.min(sx, sy / 0.82);
  const overY = TOWER_STAGE.height * scale - height;
  return { scale, x: (width - TOWER_STAGE.width * scale) / 2, y: -overY * 0.6 };
}

const at = ({ x, y, w, h }: Box): CSSProperties => ({ left: x, top: y, width: w, height: h });

/** A full-stage SVG layer, painted by our own painter (never from user input). */
function Layer({ svg }: { svg: string }) {
  return (
    <svg
      className="tower__layer"
      aria-hidden="true"
      width={TOWER_STAGE.width}
      height={TOWER_STAGE.height}
      viewBox={`0 0 ${TOWER_STAGE.width} ${TOWER_STAGE.height}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** A station's painting, filling its station (which is placed at `box`). */
function Part({ svg, box }: { svg: string; box: Box }) {
  return (
    <svg
      className="tower__part"
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
  /** The plaque, in stage coordinates (its top centre). */
  plaque: { x: number; y: number };
  title: string;
  text: string;
  open?: HallDoor;
}

/** The questline's lamps on the stair: lit ones glow, the next one flickers. */
function Lamps({ letters, lit }: { letters: readonly string[]; lit: readonly string[] }) {
  const spots = lampSpots(letters.length);
  const next = letters.findIndex((c) => !lit.includes(c));
  return (
    <svg
      className="tower__layer tower__lamps"
      role="img"
      aria-label={`${lit.length} of ${letters.length} lamps lit`}
      width={TOWER_STAGE.width}
      height={TOWER_STAGE.height}
      viewBox={`0 0 ${TOWER_STAGE.width} ${TOWER_STAGE.height}`}
    >
      <defs>
        <radialGradient id="tower-glow">
          <stop offset="0" stopColor="#FFE7A0" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#FFD36B" stopOpacity="0.4" />
          <stop offset="1" stopColor="#FFD36B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tower-lit" cx="0.4" cy="0.35">
          <stop offset="0" stopColor="#FFF6D6" />
          <stop offset="0.5" stopColor="#FFD36B" />
          <stop offset="1" stopColor="#C98A2A" />
        </radialGradient>
        <radialGradient id="tower-dark" cx="0.4" cy="0.35">
          <stop offset="0" stopColor="#7A6A58" />
          <stop offset="1" stopColor="#3A2E26" />
        </radialGradient>
      </defs>
      {letters.map((c, i) => {
        const p = spots[i];
        if (!p) return null;
        const on = lit.includes(c);
        const isNext = i === next;
        return (
          <g key={c} transform={`translate(${p.x} ${p.y})`}>
            {on && <circle r="100" fill="url(#tower-glow)" />}
            {/* an iron bracket from the wall, and the lamp's brass cap */}
            <path
              d="M0 -40 V-60 H-24 V-48"
              fill="none"
              stroke="#24160E"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M-16 -27 L-10 -41 H10 L16 -27 Z"
              fill={on ? '#E8A93A' : '#8A6A3A'}
              stroke="#24160E"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <circle
              r="31"
              fill={on ? 'url(#tower-lit)' : 'url(#tower-dark)'}
              stroke={isNext ? '#FFD36B' : on ? '#24160E' : '#9A7A44'}
              strokeWidth={isNext ? 6 : 4.5}
              className={isNext ? 'tower__flicker' : undefined}
            />
            <text
              y="11"
              textAnchor="middle"
              className="tower__lamp-char"
              fill={on ? '#24160E' : '#FFD36B'}
            >
              {on || isNext ? c : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Hall({ api, onOpen }: { api: SubjectApi; onOpen: (door: HallDoor) => void }) {
  const [progress, setProgress] = useState<MorseProgress | null>(null);
  const [ratings, setRatings] = useState<ReadonlyMap<string, SkillRating>>(new Map());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([api.loadState(), api.skillRatings()]).then(
      ([state, ratings]) => {
        if (!live) return;
        setProgress(parseProgress(state));
        setRatings(ratings);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [api]);

  if (failed) {
    return (
      <p className="lesson__card">
        The tower’s records couldn’t be read. Check your connection and reload the page.
      </p>
    );
  }
  if (!progress) return <p className="lesson__loading">Lighting the lamps…</p>;
  return <Room progress={progress} ratings={ratings} onOpen={onOpen} />;
}

function Room({
  progress,
  ratings,
  onOpen,
}: {
  progress: MorseProgress;
  ratings: ReadonlyMap<string, SkillRating>;
  onOpen: (door: HallDoor) => void;
}) {
  const [ref, { scale, x, y, pan }] = useStage(GATE.x, towerFit);
  const compact = pan || scale < READABLE_SCALE;
  const tower = room();

  const unlocked = unlockedChars(progress);
  const quest = questStatus(unlocked);
  const rank = rankOf(progress);
  const lessonNo = progress.unlocked - 1;
  const trial = pendingTrial(progress);
  const newest = unlocked[unlocked.length - 1];

  const stations: Station[] = [
    {
      id: 'lessons',
      plaque: { x: 360, y: 900 },
      title: 'Lessons',
      text: trial
        ? 'Practice your letters'
        : lessonNo === 1
          ? 'Lesson 1 · Hear K and M'
          : `Lesson ${lessonNo} · Add ${newest ?? ''}`,
      open: 'koch',
    },
    {
      id: 'recognition',
      plaque: { x: 1500, y: 800 },
      title: 'Instant Recognition',
      text: progress.recognition.best
        ? `Your best: ${progress.recognition.best}`
        : 'Name the letter before the lamp fades',
      open: 'recognition',
    },
    {
      id: 'sending',
      plaque: { x: 1210, y: 950 },
      title: 'Sending',
      text: progress.sending.drills
        ? `Your fist: ${Math.round(1200 / (progress.sending.ditMs ?? 100))} wpm`
        : 'Key letters with the straight key',
      open: 'sending',
    },
    {
      id: 'radio',
      plaque: { x: 1800, y: 790 },
      title: 'Radio Room',
      text: 'Locked · Operator rank',
    },
  ];

  /** The chapter's trial is behind you: only after the last chapter, the beacon relit. */
  const passed = !!quest && progress.trials.includes(quest.chapter.number);
  const trialLine = quest
    ? passed
      ? 'Passed.'
      : quest.trialReady
        ? quest.chapter.trial.text
        : `Light all ${quest.chapter.letters.length} lamps to face it. ${quest.lit.length} lit.`
    : '';

  const story: ReactNode = quest && (
    <>
      <p className="tower__kicker">Main questline · {quest.chapter.questline}</p>
      <h2 className="tower__chapter">
        Chapter {roman(quest.chapter.number)}: {quest.chapter.title}
      </h2>
      <blockquote className="tower__beat">
        {passed ? quest.chapter.outro : (quest.beat ?? quest.chapter.intro)}
      </blockquote>
      <p className="tower__trial">
        <strong>Trial: {quest.chapter.trial.name}.</strong> {trialLine}
      </p>
    </>
  );

  const stats = (
    <dl className="tower__stats">
      {(['receive', 'send'] as const).map((skill) => {
        const r = ratings.get(skill);
        return (
          <div key={skill}>
            <dt>{skill === 'receive' ? 'Receive' : 'Send'}</dt>
            <dd>
              {r ? Math.round(r.rating) : '—'}
              {r?.provisional && <small> provisional</small>}
            </dd>
          </div>
        );
      })}
      <div>
        <dt>Speed</dt>
        <dd>
          {CHAR_WPM}/{progress.effWpm} <small>wpm</small>
        </dd>
      </div>
    </dl>
  );

  return (
    <div className={`place-scene tower${pan ? ' tower--pan' : ''}${compact ? ' is-compact' : ''}`}>
      <div className="tower__view" ref={ref}>
        {pan && (
          <div
            className="tower__sizer"
            style={{ width: TOWER_STAGE.width * scale, height: TOWER_STAGE.height * scale }}
          />
        )}
        <div
          className="tower__stage"
          style={{
            width: TOWER_STAGE.width,
            height: TOWER_STAGE.height,
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
          }}
        >
          <Layer svg={`<defs>${tower.defs}</defs>${tower.back}`} />
          <Layer svg={trial ? tower.gate.open : tower.gate.shut} />
          {quest && <Lamps letters={quest.chapter.letters} lit={quest.lit} />}

          {!compact && quest && (
            <section className="tower__scroll" style={at(SCROLL)} aria-label="Main questline">
              {story}
            </section>
          )}
          {!compact && (
            <aside
              className="tower__banner"
              style={at(BANNER)}
              aria-label="Your standing in the guild"
            >
              <p className="tower__guild">Guild of Signalers</p>
              <p className="tower__rank">{rank.rank}</p>
              <p className="tower__next">
                Next: {rank.next}
                <br />
                {rank.need}
              </p>
              {stats}
            </aside>
          )}

          {stations.map((s) => {
            const part = tower.stations[s.id];
            const plaque = (
              <span
                className="tower__plaque"
                style={{ left: s.plaque.x - part.box.x, top: s.plaque.y - part.box.y }}
              >
                <span className="tower__plaque-title">{s.title}</span>
                <span className="tower__plaque-text">{s.text}</span>
              </span>
            );
            return s.open ? (
              <button
                key={s.id}
                type="button"
                className={`tower__station tower__station--${s.id}`}
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
                className={`tower__station tower__station--${s.id} is-locked`}
                style={at(part.box)}
                aria-hidden={compact || undefined}
              >
                <Part svg={part.svg} box={part.box} />
                {plaque}
              </div>
            );
          })}

          {trial && (
            <button
              type="button"
              className="tower__gate"
              style={at(tower.gate.box)}
              onClick={() => onOpen('trial')}
              tabIndex={compact ? -1 : undefined}
              aria-hidden={compact || undefined}
            >
              <span className="tower__plaque tower__plaque--trial" style={{ left: -130, top: 60 }}>
                <span className="tower__plaque-title">Face {trial.trial.name}</span>
                <span className="tower__plaque-text">
                  Trial · Chapter {roman(trial.number)} · open the gate
                </span>
              </span>
            </button>
          )}
          <Layer svg={tower.front} />
        </div>
      </div>

      {compact && (
        <div className="tower__below">
          {quest && (
            <section className="hall__card hall__quest" aria-label="Main questline">
              {story}
            </section>
          )}
          <nav className="hall__doors" aria-label="Signal Tower">
            {trial && (
              <button
                type="button"
                className="hall__card hall__door is-main is-trial"
                onClick={() => onOpen('trial')}
              >
                <span className="hall__kicker">Trial · Chapter {roman(trial.number)}</span>
                <span className="hall__door-title">Face {trial.trial.name}</span>
                <span className="hall__door-go">Open the gate →</span>
              </button>
            )}
            {stations.map((s) =>
              s.open ? (
                <button
                  key={s.id}
                  type="button"
                  className={`hall__card hall__door${s.id === 'lessons' && !trial ? ' is-main' : ''}`}
                  onClick={() => s.open && onOpen(s.open)}
                >
                  <span className="hall__door-title">{s.title}</span>
                  <span className="hall__door-text">{s.text}</span>
                </button>
              ) : (
                <div key={s.id} className="hall__card hall__door is-locked">
                  <span className="hall__door-title">{s.title}</span>
                  <span className="hall__door-text">{s.text}</span>
                </div>
              ),
            )}
          </nav>
          <aside className="hall__card hall__guild" aria-label="Your standing in the guild">
            <p className="hall__kicker">Guild of Signalers</p>
            <p className="hall__rank">{rank.rank}</p>
            <p className="hall__next">
              Next: <strong>{rank.next}</strong> · {rank.need}
            </p>
            {rank.progress !== undefined && (
              <span className="hall__meter" aria-hidden="true">
                <span style={{ width: `${rank.progress * 100}%` }} />
              </span>
            )}
            {stats}
          </aside>
        </div>
      )}
    </div>
  );
}
