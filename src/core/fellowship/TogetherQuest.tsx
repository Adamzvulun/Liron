import { useEffect, useState } from 'react';
import { CoinIcon } from '../player/icons.tsx';
import {
  questLine,
  questUnit,
  TogetherError,
  type FellowshipQuest,
  type TogetherSource,
} from './together.ts';
import './together.css';

/**
 * "Together this week" on the Notice Board (task 3.5, #330): one quest for you and your friends,
 * counted by the database from what each of you really did. Everyone who helped collects the
 * gold once. Shown only to a player with a friend.
 */
export function TogetherQuest({
  source,
  onPurse,
}: {
  source: TogetherSource;
  /** Takes a ticket for the purse; the returned function shows the gold after collecting. */
  onPurse: () => (gold: number) => void;
}) {
  const [quest, setQuest] = useState<FellowshipQuest | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    source.quest().then(
      (q) => live && setQuest(q),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [source]);

  if (!quest) return null;
  const done = quest.total >= quest.target;
  const shown = Math.min(quest.total, quest.target);

  const collect = () => {
    setCollecting(true);
    setProblem(null);
    const show = onPurse();
    source.collect().then(
      (gold) => {
        show(gold);
        setCollecting(false);
        setQuest({ ...quest, collected: true });
      },
      (e: unknown) => {
        setCollecting(false);
        if (e instanceof TogetherError && e.problem === 'collected') {
          setQuest({ ...quest, collected: true });
        } else {
          setProblem('The gold couldn’t be collected. Try again in a moment.');
        }
      },
    );
  };

  return (
    <section className="together" aria-labelledby="together-title">
      <h2 id="together-title" className="together__title">
        Together this week
      </h2>
      <div className="together__slip">
        <p className="together__line">{questLine(quest)}</p>
        <div
          className="together__rope"
          role="progressbar"
          aria-label="Your Fellowship’s progress"
          aria-valuemin={0}
          aria-valuemax={quest.target}
          aria-valuenow={shown}
        >
          <span style={{ width: `${(100 * shown) / quest.target}%` }} />
        </div>
        <p className="together__count">
          {shown} of {quest.target} {questUnit(quest)} · your part: {quest.mine}
        </p>
        {quest.collected ? (
          <p className="together__note">Collected. A new quest is posted on Monday.</p>
        ) : done && quest.mine > 0 ? (
          <button
            type="button"
            className="together__collect"
            disabled={collecting}
            onClick={collect}
          >
            <CoinIcon /> {collecting ? 'Collecting…' : `Collect ${quest.gold} gold`}
          </button>
        ) : done ? (
          <p className="together__note">
            Your friends finished it. Lend a hand to share the {quest.gold} gold.
          </p>
        ) : (
          <p className="together__note">
            Everyone who helps gets {quest.gold} gold when it’s done.
          </p>
        )}
        {problem && (
          <p className="together__note" role="alert">
            {problem}
          </p>
        )}
      </div>
    </section>
  );
}
