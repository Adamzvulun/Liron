import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Look } from '../avatar/looks.ts';
import { useDialogFocus } from '../player/useDialogFocus.ts';
import { PANELS, parseLayout, ROOF_PRICE, STARTER, type Layout, type RoomId } from './layout.ts';
import { coziness, withHeld } from './cozy.ts';
import { Decorate } from './Decorate.tsx';
import { useGathering, type LiveApi } from './live.ts';
import { Room, type Guest } from './Room.tsx';

export type Panel = (typeof PANELS)[number];

const TITLES: Record<Panel, string> = {
  wardrobe: 'Wardrobe',
  trophies: 'Trophies',
  ledger: 'Ledger',
  fellowship: 'Fellowship',
};

const isPanel = (s: string): s is Panel => (PANELS as readonly string[]).includes(s);

/**
 * Your House's room (tasks 7.5 and 7.6): the layout saved with `save_home`, or the starter room
 * for a player who never decorated, or whose saved room this build can't read (R1). The cupboard,
 * the shelf, the desk and the letterbox open their panels over the room (§5); a panel that isn't
 * there (the Fellowship without an account) leaves the piece saying its line. `/house#wardrobe`
 * and the like open the room with that panel open.
 *
 * Above it is the roof (task 8.4, §16): opened once with gems, then reached by the stairs, its
 * own layout to decorate. `/house#roof` opens on the roof.
 */
export function HouseRoom({
  onLoad,
  look,
  panels,
  owned = [],
  onSave,
  onHeld,
  gems = null,
  onOpenRoof,
  live,
  company,
}: {
  /** Reads a room as saved: the house (the starter room if none), or the roof (null if closed). */
  onLoad: (where: RoomId) => Promise<unknown>;
  look: Look;
  panels: Partial<Record<Panel, ReactNode>>;
  /** The item ids the player owns, for the furniture they may place. */
  owned?: readonly string[];
  /** Saves a decorated room (§6); without it there is no Decorate button. */
  onSave?: (layout: Layout, where: RoomId) => Promise<void>;
  /** What the rooms have ever held (task 8.2), for their coziness; without it, none is shown. */
  onHeld?: () => Promise<string[]>;
  /** The player's gems, for the roof's price. */
  gems?: number | null;
  /** Opens the roof for its gems: null, or why not. Without it the roof isn't offered. */
  onOpenRoof?: () => Promise<string | null>;
  /** Friends who come by, seen walking in your rooms (task 9.1, §17). */
  live?: LiveApi;
  /** You and your friends: your id (`me`), and each friend's name and look. */
  company?: () => Promise<{ id: string; name: string; look: Look; me?: boolean }[]>;
}) {
  const [people, setPeople] = useState<{
    me: string;
    friends: { id: string; name: string; look: Look }[];
  } | null>(null);
  useEffect(() => {
    if (!company) return;
    let on = true;
    company().then(
      (all) => {
        const me = all.find((c) => c.me)?.id;
        if (on && me) setPeople({ me, friends: all.filter((c) => !c.me) });
      },
      () => undefined,
    );
    return () => {
      on = false;
    };
  }, [company]);
  const friendIds = useMemo(() => people?.friends.map((f) => f.id) ?? null, [people]);
  const [mates, move] = useGathering(live, people?.me ?? null, friendIds);
  const guests: Guest[] = mates.flatMap((m) => {
    const f = people?.friends.find((p) => p.id === m.id);
    return f ? [{ ...m, name: f.name, look: f.look }] : [];
  });
  const [where, setWhere] = useState<RoomId>('home');
  const [roof, setRoof] = useState<Layout | 'closed' | null>(null);
  const [roofSaid, setRoofSaid] = useState('');
  const [asking, setAsking] = useState(false);
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    let live = true;
    onLoad('roof').then(
      (raw) => {
        if (!live) return;
        const l = raw === null ? null : parseLayout(raw);
        setRoof(l ?? 'closed');
        if (l && window.location.hash === '#roof') setWhere('roof');
      },
      () => live && setRoof('closed'),
    );
    return () => {
      live = false;
    };
  }, [onLoad]);
  const [held, setHeld] = useState<string[] | null>(null);
  const [cozier, setCozier] = useState('');
  useEffect(() => {
    if (!onHeld) return;
    let live = true;
    onHeld().then(
      (h) => live && setHeld(h),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [onHeld]);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [decorating, setDecorating] = useState(false);
  const [open, setOpen] = useState<Panel | null>(() => {
    const hash = window.location.hash.slice(1);
    return isPanel(hash) && panels[hash] ? hash : null;
  });
  // What had focus when a panel opened, given it back when it closes: the panels move focus as
  // they open, so the dialog itself can't tell.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open || !opener.current) return;
    if (opener.current.isConnected) opener.current.focus();
    opener.current = null;
  }, [open]);
  useEffect(() => {
    let live = true;
    onLoad('home').then(
      (raw) => live && setLayout(parseLayout(raw) ?? STARTER),
      () => live && setLayout(STARTER),
    );
    return () => {
      live = false;
    };
  }, [onLoad]);
  const roofOpen = roof !== null && roof !== 'closed';
  // The room shown, and the one below or above it, whose pieces can't stand here too.
  const shown = where === 'roof' && roofOpen ? roof : layout;
  const other = where === 'roof' ? layout : roofOpen ? roof : null;

  const openRoof = async () => {
    if (!onOpenRoof) return;
    setOpening(true);
    const why = await onOpenRoof();
    setOpening(false);
    setAsking(false);
    if (why) {
      setRoofSaid(why);
      return;
    }
    const raw = await onLoad('roof').catch(() => null);
    const l = raw === null ? null : parseLayout(raw);
    if (!l) {
      setRoofSaid('Couldn’t open the roof. Try again in a moment.');
      return;
    }
    setRoof(l);
    setWhere('roof');
    setRoofSaid('The roof is yours. Decorate it with anything you own.');
  };

  const climb = (to: RoomId) => {
    setWhere(to);
    setRoofSaid('');
    setCozier('');
  };

  return (
    <>
      {shown && decorating && onSave ? (
        <Decorate
          key={where}
          layout={shown}
          look={look}
          owned={owned}
          where={where}
          elsewhere={other?.pieces.map((p) => p.id)}
          onSave={(l) => onSave(l, where)}
          onDone={(l) => {
            if (where === 'roof') setRoof(l);
            else setLayout(l);
            setDecorating(false);
            // Saved: the database added what the room now holds, so count it here too.
            if (held) {
              const now = withHeld(held, l);
              if (now.length > held.length) {
                const was = coziness(held.length).tier;
                const is = coziness(now.length).tier;
                setCozier(
                  is.at > was.at
                    ? `Your room is cozier: ${is.name}.`
                    : 'Your room is a little cozier.',
                );
              }
              setHeld(now);
            }
          }}
          onCancel={() => setDecorating(false)}
        />
      ) : shown ? (
        <Room
          key={where}
          layout={shown}
          look={look}
          where={where}
          guests={guests}
          onMove={move}
          onUse={(def) => {
            if (!isPanel(def.does) || !panels[def.does]) return def.line;
            opener.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            setOpen(def.does);
            return undefined;
          }}
        />
      ) : (
        <div className="room room--loading" aria-busy="true" />
      )}
      {shown && onSave && !decorating && (
        <div className="room-cozy">
          <div className="room-cozy__buttons">
            <button type="button" className="decorate__start" onClick={() => setDecorating(true)}>
              Decorate
            </button>
            {where === 'roof' ? (
              <button type="button" className="decorate__start" onClick={() => climb('home')}>
                Down to your room
              </button>
            ) : roofOpen ? (
              <button type="button" className="decorate__start" onClick={() => climb('roof')}>
                Up to the roof
              </button>
            ) : (
              roof === 'closed' &&
              onOpenRoof &&
              !asking && (
                <button type="button" className="decorate__start" onClick={() => setAsking(true)}>
                  The roof…
                </button>
              )
            )}
          </div>
          {asking && (
            <div className="room-cozy__ask" role="group" aria-label="Open the roof">
              <p>
                Stairs lead up to a flat roof over the city, a second room to set out what you own.
                It opens for {ROOF_PRICE} gems, once
                {gems === null ? '' : `; you have ${gems}`}.
              </p>
              <button
                type="button"
                className="decorate__start"
                onClick={() => void openRoof()}
                disabled={opening || (gems !== null && gems < ROOF_PRICE)}
              >
                {opening ? 'Opening…' : `Open the roof for ${ROOF_PRICE} gems`}
              </button>
              <button type="button" className="decorate__start" onClick={() => setAsking(false)}>
                Not now
              </button>
              {gems !== null && gems < ROOF_PRICE && (
                <p className="room-cozy__more">
                  {ROOF_PRICE - gems} more {ROOF_PRICE - gems === 1 ? 'gem' : 'gems'} to go.
                  Achievements and chests give gems.
                </p>
              )}
            </div>
          )}
          {held && <Cozy n={held.length} />}
          <p className="room-cozy__company" role="status">
            {companyLine(guests, where)}
          </p>
          <p className="room-cozy__said" role="status">
            {roofSaid || cozier}
          </p>
        </div>
      )}
      {open && (
        <PanelDialog title={TITLES[open]} onClose={() => setOpen(null)}>
          {panels[open]}
        </PanelDialog>
      )}
    </>
  );
}

/** A panel over the room, its focus kept inside and given back when it closes. */
export function PanelDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const close = useDialogFocus();
  return (
    <div
      className="room-panel"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="room-panel__sheet">
        <button ref={close} type="button" className="room-panel__close" onClick={onClose}>
          ← Back to the room
        </button>
        {children}
      </div>
    </div>
  );
}

/** Who has come by (§17): here, or in your other room. */
function companyLine(guests: readonly Guest[], where: RoomId): string {
  const names = (gs: readonly Guest[]) =>
    gs.length === 1
      ? (gs[0]?.name ?? '')
      : `${gs
          .slice(0, -1)
          .map((g) => g.name)
          .join(', ')} and ${gs.at(-1)?.name ?? ''}`;
  const here = guests.filter((g) => g.room === where);
  const there = guests.filter((g) => g.room !== where);
  const lines: string[] = [];
  if (here.length) lines.push(`${names(here)} ${here.length === 1 ? 'is' : 'are'} here.`);
  if (there.length)
    lines.push(
      `${names(there)} ${there.length === 1 ? 'is' : 'are'} ${where === 'roof' ? 'down in your room' : 'up on your roof'}.`,
    );
  return lines.join(' ');
}

/** The room's coziness (task 8.2): its name, and how far the next one is. */
function Cozy({ n }: { n: number }) {
  const { tier, next } = coziness(n);
  return (
    <p className="room-cozy__line">
      Coziness: <strong>{tier.name}</strong>
      {next
        ? ` · ${next.more} more new ${next.more === 1 ? 'thing' : 'things'} to set out for ${next.tier.name}`
        : ''}
    </p>
  );
}
