import { useEffect, useState, type ReactNode } from 'react';
import { Avatar } from '../avatar/Avatar.tsx';
import { PlaceScreen } from '../city/PlaceScreen.tsx';
import { Link } from '../Link.tsx';
import { FlameIcon } from '../player/icons.tsx';
import {
  achievementNames,
  rankName,
  type FellowshipSource,
  type FriendCard,
} from './fellowship.ts';
import './fellowship.css';

/**
 * A friend's house (task 3.2, #327; fellowship-build.md §5): painted from their card alone, so
 * it can show nothing the card doesn't carry. Read-only: no wardrobe, no buttons of theirs.
 */
export function FriendHouse({
  id,
  source,
  backdrop,
}: {
  id: string;
  source: FellowshipSource;
  /** The house's painted room, behind everything. */
  backdrop?: ReactNode;
}) {
  const [card, setCard] = useState<FriendCard | null | 'loading' | 'failed'>('loading');
  useEffect(() => {
    let live = true;
    source.cards().then(
      // The route takes an id in any case; the database's ids are lowercase.
      (cards) => live && setCard(cards.find((c) => c.id === id.toLowerCase() && !c.me) ?? null),
      () => live && setCard('failed'),
    );
    return () => {
      live = false;
    };
  }, [id, source]);

  const title = typeof card === 'object' && card ? `${card.name}’s house` : 'A friend’s house';
  return (
    <PlaceScreen place="house" wide title={title}>
      {backdrop}
      <Link className="friend-house__home" href="/house">
        ← Back to your house
      </Link>
      {card === 'loading' && <p className="place__loading">Knocking at the door…</p>}
      {card === 'failed' && (
        <p className="friend-house__note" role="status">
          Couldn’t reach this house just now. Try again in a moment.
        </p>
      )}
      {card === null && (
        <p className="friend-house__note" role="status">
          This door is closed. Only friends in each other’s Fellowship can visit.
        </p>
      )}
      {typeof card === 'object' && card && <Room card={card} />}
    </PlaceScreen>
  );
}

function Room({ card }: { card: FriendCard }) {
  const trophies = achievementNames(card.achievements);
  return (
    <div className="friend-house">
      <figure className="friend-house__figure">
        <Avatar look={card.look} className="friend-house__avatar" width={220} height={242} />
        <figcaption className="friend-house__plate">
          <span className="friend-house__name">{card.name}</span>
          <span className="friend-house__line">
            Level {card.level}
            {card.title && <> · {card.title}</>}
          </span>
        </figcaption>
      </figure>
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
