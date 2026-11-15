import { useEffect, useRef, useState } from 'react';
import type { ChestContents } from '../progress/store.ts';
import { chestName, lootOf, type Loot, type ShelfChest } from './chests.ts';
import { CoinIcon, GearIcon, GemIcon, ShieldIcon } from './icons.tsx';
import './chests.css';

/**
 * A chest, drawn: wooden, brass or jeweled by class (ADR 0033). The lid is its own group so it
 * can swing open. Locked, it shows a seal per contract, lit as each is done.
 */
export function ChestArt({
  kind,
  open = false,
  seals,
}: {
  kind: string;
  open?: boolean;
  seals?: { done: number; of: number };
}) {
  return (
    <svg
      className={`chest chest--${kind}${open ? ' is-open' : ''}`}
      aria-hidden="true"
      viewBox="0 0 72 64"
      width="72"
      height="64"
    >
      <g className="chest__glow">
        <ellipse cx="36" cy="30" rx="24" ry="10" />
      </g>
      <rect className="chest__body" x="8" y="30" width="56" height="28" rx="3" />
      <path className="chest__band" d="M8 40 H64 M20 30 V58 M52 30 V58" />
      <g className="chest__lid">
        <path className="chest__body" d="M8 30 V22 C8 10 64 10 64 22 V30 Z" />
        <path className="chest__band" d="M20 30 V15 M52 30 V15" />
        {kind === 'jeweled' && <path className="chest__jewel" d="M36 12 L40 17 L36 22 L32 17 Z" />}
      </g>
      <rect className="chest__lock" x="31" y="27" width="10" height="11" rx="2" />
      {seals &&
        Array.from({ length: seals.of }, (_, i) => (
          <circle
            key={i}
            className={`chest__seal${i < seals.done ? ' is-lit' : ''}`}
            cx={36 + (i - (seals.of - 1) / 2) * 12}
            cy="49"
            r="4"
          />
        ))}
    </svg>
  );
}

/** The Notice Board's chest shelf: what's waiting to be opened, and today's still locked. */
export function ChestShelf({
  shelf,
  onOpen,
}: {
  shelf: readonly ShelfChest[];
  onOpen: (id: string) => Promise<ChestContents | null>;
}) {
  const [opening, setOpening] = useState<string | null>(null);
  const [opened, setOpened] = useState<ChestContents | null>(null);
  const [stuck, setStuck] = useState(false);
  const open = async (id: string) => {
    setOpening(id);
    setStuck(false);
    const contents = await onOpen(id);
    setOpening(null);
    if (contents) setOpened(contents);
    else setStuck(true);
  };
  // Opening your last chest empties the shelf, but its opening scene still has to show.
  const scene = opened && <ChestOpening contents={opened} onDone={() => setOpened(null)} />;
  if (!shelf.length) return scene || null;
  return (
    <section className="chests" aria-labelledby="chests-title">
      <h2 id="chests-title" className="hud__queststitle">
        Chests
      </h2>
      <ul className="chests__shelf">
        {shelf.map(({ id, ...c }) => (
          <li key={id ?? 'today'} className={`chests__item${id ? '' : ' is-locked'}`}>
            <ChestArt kind={c.kind} seals={c.seals} />
            <div className="chests__text">
              <span className="chests__name">{c.name}</span>
              <span className="chests__reason">{c.reason}</span>
              {c.seals && (
                <span className="chests__seals">
                  {c.seals.done} of {c.seals.of} done
                </span>
              )}
            </div>
            {id && (
              <button
                type="button"
                className="chests__open"
                disabled={opening !== null}
                onClick={() => void open(id)}
              >
                {opening === id ? 'Opening…' : 'Open'}
              </button>
            )}
          </li>
        ))}
      </ul>
      {stuck && (
        <p className="chests__stuck" role="alert">
          That chest wouldn’t open. Try again in a moment.
        </p>
      )}
      {scene}
    </section>
  );
}

const ICONS: Record<Loot['icon'], () => React.JSX.Element> = {
  coin: CoinIcon,
  gem: GemIcon,
  gear: GearIcon,
  shield: ShieldIcon,
};

/** The chest opens and what it held rises out, one by one (about 2 seconds, or at once). */
export function ChestOpening({
  contents,
  onDone,
}: {
  contents: ChestContents;
  onDone: () => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  return (
    <div className="levelup" role="presentation" onKeyDown={(e) => e.key === 'Escape' && onDone()}>
      <div className="levelup__rays" aria-hidden="true" />
      <div
        className="levelup__card chestopen"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chest-title"
      >
        <p className="levelup__kicker">Chest opened</p>
        <h2 id="chest-title" className="chestopen__title">
          {chestName(contents.kind)}
        </h2>
        <ChestArt kind={contents.kind} open />
        <ul className="levelup__rewards chestopen__loot" aria-label="Inside">
          {lootOf(contents).map((l, i) => {
            const Icon = ICONS[l.icon];
            return (
              <li key={l.key} className={`hud__chip chestopen__item chestopen__item--${i + 1}`}>
                <Icon />
                {l.text}
              </li>
            );
          })}
        </ul>
        <button ref={button} type="button" className="levelup__go" onClick={onDone}>
          Collect
        </button>
      </div>
    </div>
  );
}
