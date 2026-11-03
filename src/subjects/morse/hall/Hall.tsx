import { useEffect, useState } from 'react';
import type { SkillRating, SubjectApi } from '../../../core/subject.ts';
import { MORSE_CHARS } from '../code.ts';
import { CHAR_WPM, parseProgress, unlockedChars, type MorseProgress } from '../lesson/progress.ts';
import { questStatus, roman } from '../questline.ts';
import { LampPath } from './LampPath.tsx';
import './hall.css';

// Inside the Signal Tower (#33): your guild rank and ratings, the questline's lamp path (#34),
// and the doors to each activity. Wired to the Morse subject's saved progress.

const LETTERS = MORSE_CHARS.filter((c) => c.kind === 'letter').map((c) => c.char);

/** Guild ranks (discovery 04). Only the first step is reachable in M2. */
function rankOf(p: MorseProgress) {
  const letters = unlockedChars(p).filter((c) => LETTERS.includes(c)).length;
  return letters >= LETTERS.length
    ? { rank: 'Listener', next: 'Keyer', need: 'Clean sending of every letter (coming soon)' }
    : {
        rank: 'Initiate',
        next: 'Listener',
        need: `${letters} / ${LETTERS.length} letters`,
        progress: letters / LETTERS.length,
      };
}

export type HallDoor = 'koch' | 'recognition';

export function Hall({ api, onOpen }: { api: SubjectApi; onOpen: (door: HallDoor) => void }) {
  const [progress, setProgress] = useState<MorseProgress | null>(null);
  const [receive, setReceive] = useState<SkillRating | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([api.loadState(), api.skillRatings()]).then(
      ([state, ratings]) => {
        if (!live) return;
        setProgress(parseProgress(state));
        setReceive(ratings.get('receive') ?? null);
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

  const unlocked = unlockedChars(progress);
  const quest = questStatus(unlocked);
  const rank = rankOf(progress);
  const lessonNo = progress.unlocked - 1;

  return (
    <div className="hall">
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
        <dl className="hall__stats">
          <div>
            <dt>Receive</dt>
            <dd>
              {receive ? Math.round(receive.rating) : '—'}
              {receive?.provisional && <small> provisional</small>}
            </dd>
          </div>
          <div>
            <dt>Send</dt>
            <dd>
              — <small>with the straight key</small>
            </dd>
          </div>
          <div>
            <dt>Speed</dt>
            <dd>
              {CHAR_WPM} / {progress.effWpm} <small>wpm</small>
            </dd>
          </div>
          <div>
            <dt>Letters</dt>
            <dd>{unlocked.join(' ')}</dd>
          </div>
        </dl>
      </aside>

      {quest && (
        <section className="hall__card hall__quest" aria-label="Main questline">
          <p className="hall__kicker">Main questline · {quest.chapter.questline}</p>
          <h2 className="hall__title">
            Chapter {roman(quest.chapter.number)}: {quest.chapter.title}
          </h2>
          <div className="hall__path">
            <LampPath
              letters={quest.chapter.letters}
              lit={quest.lit}
              trialName={quest.chapter.trial.name}
            />
          </div>
          <blockquote className="hall__beat">{quest.beat ?? quest.chapter.intro}</blockquote>
          <p className="hall__trial">
            <strong>Trial: {quest.chapter.trial.name}.</strong>{' '}
            {quest.trialReady
              ? quest.chapter.trial.text
              : `Light all ${quest.chapter.letters.length} lamps to face it. ${quest.lit.length} lit.`}
          </p>
        </section>
      )}

      <nav className="hall__doors" aria-label="Signal Tower">
        <button
          type="button"
          className="hall__card hall__door is-main"
          onClick={() => onOpen('koch')}
        >
          <span className="hall__kicker">Lesson {lessonNo} · Koch method</span>
          <span className="hall__door-title">
            {lessonNo === 1 ? 'Hear K and M' : `Add ${unlocked.slice(-1)[0]}`}
          </span>
          <span className="hall__door-go">Begin lesson →</span>
        </button>
        <button
          type="button"
          className="hall__card hall__door"
          onClick={() => onOpen('recognition')}
        >
          <span className="hall__kicker">Game</span>
          <span className="hall__door-title">Instant Recognition</span>
          <span className="hall__door-text">
            {progress.recognition.best
              ? `Your best: ${progress.recognition.best} points`
              : 'Press the letter before the lamp goes out'}
          </span>
        </button>
        <div className="hall__card hall__door is-locked">
          <span className="hall__kicker">Coming soon</span>
          <span className="hall__door-title">Sending practice</span>
          <span className="hall__door-text">Key letters with the space bar or a tap</span>
        </div>
        <div className="hall__card hall__door is-locked">
          <span className="hall__kicker">Locked</span>
          <span className="hall__door-title">The Radio Room</span>
          <span className="hall__door-text">Reach Operator rank to go on the air</span>
        </div>
      </nav>
    </div>
  );
}
