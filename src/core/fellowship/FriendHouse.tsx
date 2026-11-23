import { useEffect, useState, type ReactNode } from 'react';
import type { Look } from '../avatar/looks.ts';
import { PlaceScreen } from '../city/PlaceScreen.tsx';
import { PanelDialog } from '../home/HouseRoom.tsx';
import { parseLayout, STARTER, type Layout } from '../home/layout.ts';
import { Room } from '../home/Room.tsx';
import { Link } from '../Link.tsx';
import { FlameIcon } from '../player/icons.tsx';
import {
  achievementNames,
  rankName,
  type FellowshipSource,
  type FriendCard,
} from './fellowship.ts';
import './fellowship.css';

type Visit = { card: FriendCard; layout: Layout };

/**
 * A friend's house (task 7.9, the-home.md §8; first built in task 3.2, #327): their room as they
 * arranged it, from `home_of`, with them standing by the window in their saved look. You walk in
 * through their door as yourself. You can walk, sit and light their lamps for yourself; their
 * shelf shows their card, and their cupboard, desk and letterbox only say a line. Nothing here
 * changes their room: there is no Decorate, and nothing is sent.
 */
export function FriendHouse({
  id,
  source,
  look,
  backdrop,
}: {
  id: string;
  source: FellowshipSource;
  /** Your own look, to walk in as; the room waits for it. */
  look?: Look;
  /** The house's painted room, behind everything. */
  backdrop?: ReactNode;
}) {
  const [visit, setVisit] = useState<Visit | null | 'loading' | 'failed'>('loading');
  const [shelf, setShelf] = useState(false);
  useEffect(() => {
    let live = true;
    // The route takes an id in any case; the database's ids are lowercase.
    const friend = id.toLowerCase();
    Promise.all([source.cards(), source.home(friend)]).then(
      ([cards, raw]) => {
        if (!live) return;
        const card = cards.find((c) => c.id === friend && !c.me);
        // A friend who never decorated has the starter room (`home_of` gives it too).
        setVisit(card ? { card, layout: parseLayout(raw) ?? STARTER } : null);
      },
      () => live && setVisit('failed'),
    );
    return () => {
      live = false;
    };
  }, [id, source]);

  const card = typeof visit === 'object' && visit ? visit.card : null;
  const title = card ? `${card.name}’s house` : 'A friend’s house';
  return (
    <PlaceScreen place="house" wide title={title}>
      {backdrop}
      <Link className="friend-house__home" href="/house">
        ← Back to your house
      </Link>
      {(visit === 'loading' || (card && !look)) && (
        <p className="place__loading">Knocking at the door…</p>
      )}
      {visit === 'failed' && (
        <p className="friend-house__note" role="status">
          Couldn’t reach this house just now. Try again in a moment.
        </p>
      )}
      {visit === null && (
        <p className="friend-house__note" role="status">
          This door is closed. Only friends in each other’s Fellowship can visit.
        </p>
      )}
      {typeof visit === 'object' && visit && look && (
        <Room
          layout={visit.layout}
          look={look}
          host={{ name: visit.card.name, look: visit.card.look }}
          onUse={(def) => {
            if (def.does !== 'trophies') return def.visit ?? def.line;
            setShelf(true);
            return undefined;
          }}
        />
      )}
      {shelf && card && (
        <PanelDialog title={`${card.name}’s trophies`} onClose={() => setShelf(false)}>
          <Shelf card={card} />
        </PanelDialog>
      )}
    </PlaceScreen>
  );
}

function Shelf({ card }: { card: FriendCard }) {
  const trophies = achievementNames(card.achievements);
  return (
    <div className="friend-house">
      <p className="friend-house__plate">
        <span className="friend-house__name">{card.name}</span>
        <span className="friend-house__line">
          Level {card.level}
          {card.title && <> · {card.title}</>}
        </span>
      </p>
      <section className="friend-house__shelf" aria-label="Trophies">
        <p className="friend-house__line">
          <span className="fellowship__flame">
            <FlameIcon />
          </span>{' '}
          {card.streak === 1 ? '1 day' : `${card.streak} days`} in a row
        </p>
        <h2 className="friend-house__heading">Ranks</h2>
        {card.ranks.length > 0 ? (
          <ul className="fellowship__ranks">
            {card.ranks.map((r) => (
              <li key={r}>{rankName(r)}</li>
            ))}
          </ul>
        ) : (
          <p className="friend-house__note">No rank yet: the road is still ahead.</p>
        )}
        <h2 className="friend-house__heading">Achievements</h2>
        {trophies.length > 0 ? (
          <ul className="friend-house__trophies">
            {trophies.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : (
          <p className="friend-house__note">None on the wall yet.</p>
        )}
      </section>
    </div>
  );
}
