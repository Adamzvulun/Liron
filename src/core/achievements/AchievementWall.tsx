import { useCallback, useEffect, useState } from 'react';
import { GemIcon } from '../player/icons.tsx';
import { earnedTitles, plaques, type MyAchievements } from './achievements.ts';
import './achievements.css';

/**
 * Your House's wall of plaques (#177): every achievement, earned or not, with how far along you
 * are, and the title picker. Titles come only from achievements; none shows the level's title.
 */
export function AchievementWall({
  mine,
  title,
  onLoad,
  onWear,
}: {
  /** null while loading, or if it couldn't load. */
  mine: MyAchievements | null;
  /** The title worn now; '' for none. */
  title: string;
  /** Reads the wall; resolves false if it couldn't. */
  onLoad: () => Promise<boolean>;
  /** Wears a title ('' for none); resolves false if it couldn't be saved. */
  onWear: (title: string) => Promise<boolean>;
}) {
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => void onLoad().then((ok) => setFailed(!ok)), [onLoad]);
  const retry = () => {
    setFailed(false);
    load();
  };
  // The load's promise mustn't become this effect's cleanup, which crashed the app on leaving
  // the house (review, 2026-11-15).
  useEffect(() => {
    load();
  }, [load]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'failed'>('idle');
  const all = plaques(mine);
  const earned = all.filter((p) => p.earned).length;
  const titles = earnedTitles(mine);
  const wear = async (t: string) => {
    setStatus('saving');
    setStatus((await onWear(t)) ? 'idle' : 'failed');
  };
  return (
    <section className="trophies" aria-labelledby="trophies-title">
      <h2 id="trophies-title" className="trophies__heading">
        Achievements
      </h2>
      <p className="trophies__count" role="status">
        {mine ? (
          `${earned} of ${all.length} earned`
        ) : failed ? (
          <>
            The wall couldn’t be read.{' '}
            <button type="button" className="place__retry" onClick={retry}>
              Try again
            </button>
          </>
        ) : (
          'Reading the wall…'
        )}
      </p>

      <fieldset className="trophies__titles">
        <legend>Your title</legend>
        <div className="trophies__row">
          {['', ...titles].map((t) => (
            <label key={t || 'none'} className="trophies__title">
              <input
                type="radio"
                name="title"
                checked={title === t}
                disabled={status === 'saving'}
                onChange={() => void wear(t)}
              />
              <span>{t || 'Your level’s title'}</span>
            </label>
          ))}
        </div>
        {titles.length === 0 && (
          <p className="trophies__hint">Some achievements give a title to wear under your name.</p>
        )}
        <p className="trophies__status" role="status">
          {status === 'failed' && 'Couldn’t change your title. Try again.'}
        </p>
      </fieldset>

      <ul className="trophies__wall">
        {all.map((p) => (
          <li
            key={p.id}
            className={`trophies__plaque${p.earned ? ' trophies__plaque--earned' : ''}`}
          >
            <span className="trophies__name">{p.name}</span>
            <span className="trophies__text">{p.text}</span>
            {p.earned ? (
              <span className="trophies__done">Earned</span>
            ) : (
              p.target > 1 && (
                <span className="trophies__progress">
                  <progress
                    max={p.target}
                    value={p.progress}
                    aria-label={`${p.name}: ${p.progress} of ${p.target}`}
                  />
                  <span>
                    {p.progress.toLocaleString('en-US')} / {p.target.toLocaleString('en-US')}
                  </span>
                </span>
              )
            )}
            <span className="trophies__reward">
              <span
                className="trophies__gems"
                aria-label={`${p.gems} ${p.gems === 1 ? 'gem' : 'gems'}`}
              >
                <GemIcon />
                {p.gems}
              </span>
              {p.title && <span className="trophies__unlocks">Title: {p.title}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
