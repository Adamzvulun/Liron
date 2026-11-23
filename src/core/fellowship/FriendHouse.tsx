import { useEffect, useState, type ReactNode } from 'react';
import type { Look } from '../avatar/looks.ts';
import { PlaceScreen } from '../city/PlaceScreen.tsx';
import { coziness } from '../home/cozy.ts';
import { PanelDialog } from '../home/HouseRoom.tsx';
import { parseLayout, STARTER, type Layout, type RoomId } from '../home/layout.ts';
import { useGathering, type LiveApi } from '../home/live.ts';
import { Room } from '../home/Room.tsx';
import { Link } from '../Link.tsx';
import { LeaveNote } from './Notes.tsx';
import { FlameIcon } from '../player/icons.tsx';
import {
  achievementNames,
  rankName,
  type FellowshipSource,
  type FriendCard,
} from './fellowship.ts';
import './fellowship.css';

type Visit = { card: FriendCard; layout: Layout; roof: Layout | null };

/**
 * A friend's house (task 7.9, the-home.md §8; first built in task 3.2, #327): their room as they
 * arranged it, from `home_of`, with them standing by the window in their saved look. You walk in
 * through their door as yourself. You can walk, sit and light their lamps for yourself; their
 * shelf shows their card, their letterbox takes a note from the set (task 8.1), and their cupboard
 * and desk only say a line. If they opened their roof, the stairs go up to it (task 8.4). Nothing
 * here changes their rooms: there is no Decorate.
 */
export function FriendHouse({
  id,
  source,
  look,
  backdrop,
  live,
}: {
  id: string;
  source: FellowshipSource;
  /** Seeing each other walk, when they're home too (task 9.1, §17). */
  live?: LiveApi;
  /** Your own look, to walk in as; the room waits for it. */
  look?: Look;
  /** The house's painted room, behind everything. */
  backdrop?: ReactNode;
}) {
  const [visit, setVisit] = useState<Visit | null | 'loading' | 'failed'>('loading');
  const [panel, setPanel] = useState<'shelf' | 'letterbox' | null>(null);
  const [where, setWhere] = useState<RoomId>('home');
  useEffect(() => {
    let live = true;
    // The route takes an id in any case; the database's ids are lowercase.
    const friend = id.toLowerCase();
    Promise.all([
      source.cards(),
      source.home(friend),
      // Their roof, if they opened one (task 8.4); a roof that won't load just isn't shown.
      source.home(friend, 'roof').catch(() => null),
    ]).then(
      ([cards, raw, roof]) => {
        if (!live) return;
        const card = cards.find((c) => c.id === friend && !c.me);
        // A friend who never decorated has the starter room (`home_of` gives it too).
        setVisit(
          card
            ? {
                card,
                layout: parseLayout(raw) ?? STARTER,
                roof: roof === null ? null : parseLayout(roof),
              }
            : null,
        );
      },
      () => live && setVisit('failed'),
    );
    return () => {
      live = false;
    };
  }, [id, source]);

  const card = typeof visit === 'object' && visit ? visit.card : null;
  const friend = card?.id ?? null;
  const [mates, move] = useGathering(live, friend, friend ? [friend] : null);
  const host = mates.find((m) => m.id === friend);
  const elsewhere = host && host.room !== where;
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
          key={where}
          where={where}
          layout={where === 'roof' && visit.roof ? visit.roof : visit.layout}
          look={look}
          host={{ name: visit.card.name, look: visit.card.look, live: host }}
          onMove={move}
          onUse={(def) => {
            // The shelf shows their card; the letterbox takes a note (task 8.1).
            if (def.does === 'trophies') setPanel('shelf');
            else if (def.does === 'fellowship') setPanel('letterbox');
            else return def.visit ?? def.line;
            return undefined;
          }}
        />
      )}
      {typeof visit === 'object' && visit?.roof && look && (
        <button
          type="button"
          className="decorate__start"
          onClick={() => setWhere(where === 'roof' ? 'home' : 'roof')}
        >
          {where === 'roof' ? 'Down to their room' : 'Up to their roof'}
        </button>
      )}
      {card && look && (
        <p className="friend-house__company" role="status">
          {host
            ? elsewhere
              ? host.room === 'roof'
                ? `${card.name} is home, up on the roof.`
                : `${card.name} is home, down in their room.`
              : `${card.name} is home.`
            : ''}
        </p>
      )}
      {panel === 'shelf' && card && (
        <PanelDialog title={`${card.name}’s trophies`} onClose={() => setPanel(null)}>
          <Shelf card={card} />
        </PanelDialog>
      )}
      {panel === 'letterbox' && card && (
        <PanelDialog title={`${card.name}’s letterbox`} onClose={() => setPanel(null)}>
          <LeaveNote friend={card.id} name={card.name} source={source} />
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
        <span className="friend-house__line">Their room: {coziness(card.cozy).tier.name}</span>
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
