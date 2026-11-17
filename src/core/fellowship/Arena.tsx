import { useCallback, useEffect, useState } from 'react';
import { Link } from '../Link.tsx';
import { navigate } from '../router.ts';
import { dayLabel } from './fellowship.ts';
import {
  bestLine,
  ROUND_NAMES,
  ROUND_PATHS,
  takenOn,
  takeOn,
  type Challenge,
  type ChallengeSource,
} from './challenges.ts';
import './arena.css';

/** A round's short name, for a line that already says "a". */
const SHORT: Record<Challenge['kind'], string> = { rush: 'rush', words: 'Codebook round' };

/**
 * The Arena (task 3.4, docs/game/challenges.md §4): challenges for you, the ones you sent, and
 * the finished ones, each as two scores beside their owners' bests. Nobody wins or loses here.
 */
export function Arena({ source, today }: { source: ChallengeSource; today: string }) {
  const [data, setData] = useState<{ challenges: Challenge[]; friends: number } | 'failed' | null>(
    null,
  );
  const [taken, setTaken] = useState(takenOn);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState(false);

  const load = useCallback(
    () =>
      Promise.all([source.list(), source.friends()]).then(
        ([challenges, friends]) => setData({ challenges, friends: friends.length }),
        () => setData('failed'),
      ),
    [source],
  );
  useEffect(() => {
    let live = true;
    Promise.all([source.list(), source.friends()]).then(
      ([challenges, friends]) => live && setData({ challenges, friends: friends.length }),
      () => live && setData('failed'),
    );
    return () => {
      live = false;
    };
  }, [source]);

  if (data === null) return <p className="arena__note">Opening the gates…</p>;
  if (data === 'failed') {
    return (
      <p className="arena__note" role="alert">
        The Arena’s records couldn’t be read. Check your connection and reload the page.
      </p>
    );
  }

  const forYou = data.challenges.filter((c) => !c.mine && c.state === 'open');
  const yours = data.challenges.filter((c) => c.mine && c.state === 'open');
  const done = data.challenges.filter((c) => c.state !== 'open');

  if (data.friends === 0 && data.challenges.length === 0) {
    return (
      <div className="arena">
        <p className="arena__plaque">
          The Arena is for friends. Add one with your friend code in{' '}
          <Link href="/house">Your House</Link>, then challenge them from the result of a callsign
          rush or a Codebook round.
        </p>
      </div>
    );
  }

  const takeItOn = (c: Challenge) => {
    takeOn({ id: c.id, kind: c.kind, name: c.from.name, theirs: c.from.score ?? 0 });
    navigate(ROUND_PATHS[c.kind]);
  };
  const letGo = (c: Challenge) => {
    setBusy(c.id);
    setProblem(false);
    source.decline(c.id).then(
      () => {
        if (taken?.id === c.id) {
          takeOn(null);
          setTaken(null);
        }
        return load().then(() => setBusy(null));
      },
      () => {
        setBusy(null);
        setProblem(true);
      },
    );
  };

  return (
    <div className="arena">
      {problem && (
        <p className="arena__note" role="alert">
          That couldn’t be done. Try again in a moment.
        </p>
      )}
      {data.challenges.length === 0 && (
        <p className="arena__plaque">
          No challenges yet. Finish a callsign rush or a Codebook round in the{' '}
          <Link href="/signal-tower">Signal Tower</Link>, and challenge a friend from its result.
        </p>
      )}
      {forYou.length > 0 && (
        <section className="arena__section" aria-labelledby="arena-for-you">
          <h2 id="arena-for-you" className="arena__heading">
            For you
          </h2>
          <ul className="arena__list">
            {forYou.map((c) => (
              <li key={c.id} className="arena__bout arena__bout--call">
                <p className="arena__line">
                  {c.from.name} challenges you to {ROUND_NAMES[c.kind]}:{' '}
                  <strong className="arena__number">{c.from.score}</strong>
                </p>
                <p className="arena__meta">
                  {dayLabel(c.sent, today)}
                  {taken?.id === c.id && ` · taken on: your next ${SHORT[c.kind]} answers it`}
                </p>
                <div className="arena__actions">
                  <button
                    type="button"
                    className="arena__button"
                    disabled={busy !== null}
                    onClick={() => takeItOn(c)}
                  >
                    Take it on
                  </button>
                  <button
                    type="button"
                    className="arena__button arena__button--quiet"
                    disabled={busy !== null}
                    onClick={() => letGo(c)}
                  >
                    {busy === c.id ? 'Letting go…' : 'Let it go'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {yours.length > 0 && (
        <section className="arena__section" aria-labelledby="arena-yours">
          <h2 id="arena-yours" className="arena__heading">
            Yours
          </h2>
          <ul className="arena__list">
            {yours.map((c) => (
              <li key={c.id} className="arena__bout">
                <p className="arena__line">
                  You challenged {c.to.name} to {ROUND_NAMES[c.kind]}:{' '}
                  <strong className="arena__number">{c.from.score}</strong>
                </p>
                <p className="arena__meta">{dayLabel(c.sent, today)} · waiting for an answer</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {done.length > 0 && (
        <section className="arena__section" aria-labelledby="arena-done">
          <h2 id="arena-done" className="arena__heading">
            Done
          </h2>
          <ul className="arena__list">
            {done.map((c) => (
              <Done key={c.id} c={c} today={today} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Done({ c, today }: { c: Challenge; today: string }) {
  const sender = c.mine ? 'You' : c.from.name;
  const other = c.mine ? c.to.name : 'you';
  if (c.state !== 'answered') {
    return (
      <li className="arena__bout arena__bout--closed">
        <p className="arena__line">
          {sender === 'You' ? 'Your' : `${sender}’s`} {SHORT[c.kind]} challenge to {other}:{' '}
          {c.state === 'declined'
            ? c.mine
              ? `${c.to.name} let it go.`
              : 'you let it go.'
            : 'no answer in time.'}
        </p>
        <p className="arena__meta">{dayLabel(c.sent, today)}</p>
      </li>
    );
  }
  const best = bestLine(c);
  // Two scores side by side, the sender's first, each over its owner's best: no crown.
  const sides = [
    { who: c.mine ? 'You' : c.from.name, ...c.from },
    { who: c.mine ? c.to.name : 'You', ...c.to },
  ];
  return (
    <li className="arena__bout arena__bout--done">
      <p className="arena__meta">
        {ROUND_NAMES[c.kind].replace(/^a /, '').replace(/^./, (l) => l.toUpperCase())} ·{' '}
        {dayLabel(c.sent, today)}
      </p>
      <div className="arena__slate">
        {sides.map((s) => (
          <div key={s.id} className="arena__side">
            <span className="arena__who">{s.who}</span>
            <span className="arena__score">{s.score}</span>
            {s.best !== null && <span className="arena__best">best {s.best}</span>}
          </div>
        ))}
      </div>
      {best && <p className="arena__meta arena__meta--warm">{best}</p>}
    </li>
  );
}
