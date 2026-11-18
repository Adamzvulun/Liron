import { useState } from 'react';
import { giftProblem } from './together.ts';
import './together.css';

/** What the Market needs to offer gifts (task 3.5): your friends, and a way to give. */
export interface Giving {
  friends: { id: string; name: string }[];
  /** Gives the ware; resolves null, or what to say instead. */
  give(friend: { id: string; name: string }, item: string): Promise<string | null>;
}

/** "Give to a friend" under one of the Market's wares. */
export function GiftOffer({
  item,
  name,
  price,
  affordable,
  giving,
}: {
  item: string;
  name: string;
  price: number;
  affordable: boolean;
  giving: Giving;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [given, setGiven] = useState<string[]>([]);

  const give = (f: { id: string; name: string }) => {
    setBusy(true);
    setSaid(null);
    giving.give(f, item).then(
      (problem) => {
        setBusy(false);
        if (problem) setSaid(problem);
        else {
          setGiven((g) => [...g, f.id]);
          setSaid(`${name} is on its way to ${f.name}.`);
        }
      },
      // Not meant to happen (give says its problems), but a button must never stay dead.
      (e: unknown) => {
        setBusy(false);
        setSaid(giftProblem(e, f.name));
      },
    );
  };

  return (
    <div className="gift">
      {open ? (
        <div className="gift__friends" role="group" aria-label={`Give ${name} to a friend`}>
          <p className="gift__ask">For {price} gold, to:</p>
          {giving.friends.map((f) => (
            <button
              key={f.id}
              type="button"
              className="gift__friend"
              disabled={busy || given.includes(f.id)}
              onClick={() => give(f)}
            >
              {f.name}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className="gift__open"
          disabled={!affordable}
          onClick={() => setOpen(true)}
        >
          Give to a friend
        </button>
      )}
      <span className="market__said" role="status">
        {said ?? ''}
      </span>
    </div>
  );
}
