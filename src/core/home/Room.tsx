// The room you walk in (task 7.5, docs/game/the-home.md §3–4, R1, R2, R4, R5, R10; ADR 0055).
// The room is painted in layers, each one a still picture: the walls and what hangs and lies on
// the floor behind everything, then one layer per row line of the floor pieces, then the light.
// The avatar and its companion are live drawings set between those layers by the row they stand
// on, and they move by `transform` only (ADR 0025). Pieces that do things come in task 7.6.
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { Avatar } from '../avatar/Avatar.tsx';
import type { Look } from '../avatar/looks.ts';
import { AVATAR_BOX, paintCompanion } from '../avatar/paint.ts';
import { pictureUrl } from '../city/picture.ts';
import { useStage } from '../city/useStage.ts';
import {
  blockedCells,
  byTheWindow,
  cellsOf,
  FURNITURE_PIECES,
  isFloor,
  ROOMS,
  slotsOf,
  STARTER_PIECES,
  standCells,
  type Does,
  type Layout,
  type PieceDef,
  type Placed,
  type RoomId,
} from './layout.ts';
import { decorOverlay, homeLayers, type HomeView } from './paintHome.ts';
import type { Seat, Standing } from './live.ts';
import { cellKey, findPath, type Cell } from './path.ts';
import { avatarScale, cellAt, cellFeet, floorPoint, type Pt } from './projection.ts';
import './room.css';

const STAGE = { width: 1920, height: 1080 } as const;
/** About 4 cells a second (§4). */
export const STEP_MS = 250;
const DEFS: ReadonlyMap<string, PieceDef> = new Map(
  [...STARTER_PIECES, ...FURNITURE_PIECES].map((d) => [d.id, d]),
);

/** The whole room in view, letterboxed: the room is a box on the page, not the window. */
const contain = (width: number, height: number) => {
  const scale = Math.min(width / STAGE.width, height / STAGE.height);
  return {
    scale,
    x: (width - STAGE.width * scale) / 2,
    y: (height - STAGE.height * scale) / 2,
  };
};

/** What using a piece does, for the list "In this room" (§5). */
const USES: Record<Does, string> = {
  wardrobe: 'open the wardrobe',
  trophies: 'see your trophies',
  ledger: 'read your ledger',
  fellowship: 'open the Fellowship',
  sit: 'sit down',
  light: 'light or put out',
  look: 'look',
};

/** The same in a friend's room, where only their shelf opens (§8). */
const VISITING: Record<Does, string> = {
  ...USES,
  wardrobe: 'look',
  trophies: 'see their trophies',
  ledger: 'look',
  fellowship: 'leave a note',
};

const STEPS: Record<string, Cell> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

/** Stacking: a layer at row line k is at 2k; someone standing in row r just above line r + 1. */
const standingZ = (row: number) => 2 * (row + 1) + 1;

/** Where a figure stands: its feet on the middle of a cell, scaled by the row (§3). */
function placeAt([c, r]: Cell, nudge = 0) {
  return placeOn(cellFeet(c, r), r, nudge);
}

/** The same, with the feet on any point of the floor, at the size of a row. */
function placeOn([x, y]: Pt, row: number, nudge = 0) {
  const s = avatarScale(row);
  return `translate(${x - AVATAR_BOX.width / 2 + nudge * s}px, ${y - AVATAR_BOX.feetY}px) scale(${s})`;
}

/**
 * Whom you visit (§8): they stand still by the window, in their saved look. When they're home
 * too (§17), `live` is where they are: in this room, they walk there; elsewhere, they're not here.
 */
export interface Host {
  name: string;
  look: Look;
  live?: Standing | null;
}

/** A friend in your room, live (§17). */
export interface Guest extends Standing {
  id: string;
  name: string;
  look: Look;
}

/** Where a friend is drawn: standing on a cell (half a step aside on yours), or sitting. */
const figureAt = (at: Cell, seat: Seat | null, mine: Cell) =>
  seat
    ? { transform: placeOn(seat.point, seat.row), zIndex: standingZ(seat.row) }
    : { transform: placeAt(at, same(at, mine) ? 70 : 0), zIndex: standingZ(at[1]) };

/** The longest walk before a piece opens: farther than this, it opens as you set off (§12). */
const OPEN_AFTER_STEPS = Math.floor(2000 / STEP_MS);

/** A place pressed in the room while decorating: a floor cell, or a slot on the back wall. */
export type Spot = { cell: Cell } | { slot: number };

/** The room while decorating (§6): it draws the grid and the marks, and hands over the input. */
export interface Decor {
  marks: NonNullable<HomeView['marks']>;
  /** A press, where it moves while held down, and where it is let go. */
  onPress: (at: Spot, phase: 'down' | 'move' | 'up') => void;
  /** A key pressed in the room; true when it was used. */
  onKey: (key: string) => boolean;
  /** Something is held: the room stops panning under a finger, so it can be dragged. */
  holding: boolean;
  /** Changes when the room should take the keyboard focus (a piece taken from the tray). */
  focus: number;
}

export function Room({
  layout,
  look,
  onUse,
  decor,
  host,
  guests = [],
  onMove,
  where = 'home',
}: {
  layout: Layout;
  look: Look;
  /** Which room this is: the house, or the roof (task 8.4, §16). */
  where?: RoomId;
  decor?: Decor;
  /** A friend's room (§8): they stand by the window, and the room is called theirs. */
  host?: Host;
  /** Friends in your room, live (§17): drawn where they are; walking through them is fine. */
  guests?: readonly Guest[];
  /** Hears where you are, whenever it changes, for the friends in the house (§17). */
  onMove?: (spot: Standing) => void;
  /**
   * Uses a piece (§5) once you are by it: opens its panel, or gives a line to say. Without it,
   * pieces only say their line.
   */
  onUse?: (def: PieceDef) => string | undefined;
}) {
  const layers = useMemo(() => {
    const id = JSON.stringify(layout);
    const { back, bands, light, glow } = homeLayers(layout, DEFS, where);
    return {
      back: pictureUrl(`home:back:${where}:${id}`, STAGE, () => back),
      bands: bands.map((b) => ({
        row: b.row,
        url: pictureUrl(`home:band:${b.row}:${id}`, STAGE, () => b.svg),
      })),
      light: pictureUrl(`home:light:${where}`, STAGE, () => light),
      glow: glow ? pictureUrl('home:glow', STAGE, () => glow) : null,
    };
  }, [layout, where]);
  // The room's grid, door and slots: the same in both rooms today, but read from the one shown.
  const ROOM = ROOMS[where];
  const blocked = useMemo(() => blockedCells(layout, DEFS), [layout]);
  const free = useMemo(
    () => (x: number, y: number) =>
      x >= 0 && y >= 0 && x < ROOM.cols && y < ROOM.rows && !blocked.has(cellKey([x, y])),
    [blocked, ROOM],
  );
  // A host who is home too walks where they like, and stands in nobody's way (§17).
  const hostLive = host?.live ?? null;
  const hostStill = useMemo(
    () => (host && host.live === undefined ? byTheWindow(free) : null),
    [host, free],
  );
  const hostAt: Cell | null = hostLive && hostLive.room === where ? hostLive.at : hostStill;
  const hostSeat = hostLive && hostLive.room === where ? hostLive.seat : null;
  const open = useMemo(
    () => (x: number, y: number) => free(x, y) && !(hostStill && same(hostStill, [x, y])),
    [free, hostStill],
  );

  const [ref, view] = useStage(cellFeet(...ROOM.door)[0], contain);
  const stage = useRef<HTMLDivElement>(null);
  // Where the avatar is (or is stepping to), and the cell it came from, where the companion is.
  const [at, setAt] = useState<Cell>(ROOM.door);
  const [from, setFrom] = useState<Cell>(ROOM.door);
  const [walking, setWalking] = useState(false);
  const [say, setSay] = useState('');
  const [lit, setLit] = useState(true);
  const [seated, setSeated] = useState<Seat | null>(null);
  const route = useRef<Cell[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hush = useRef<ReturnType<typeof setTimeout>>(undefined);
  const here = useRef<Cell>(ROOM.door);
  // The way you last stepped, so Enter uses what you face (§4).
  const facing = useRef<Cell>([0, -1]);
  // A piece to use when the walk ends.
  const pending = useRef<{ p: Placed; def: PieceDef } | null>(null);
  // The way to face once a walk to a piece ends.
  const faceEnd = useRef<Cell | null>(null);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(hush.current);
    },
    [],
  );

  const tell = (line: string) => {
    setSay(line);
    clearTimeout(hush.current);
    hush.current = setTimeout(() => setSay(''), 2500);
  };

  const act = ({ p, def }: { p: Placed; def: PieceDef }) => {
    pending.current = null;
    // A seat: sit on its front edge, in front of it (§5). Any step stands you up.
    if (def.does === 'sit' && isFloor(p)) {
      const [w, d] = def.size;
      const row = p.at[1] + d - 1;
      setSeated({ point: floorPoint(p.at[0] + w / 2, p.at[1] + d - 0.3), row });
      return;
    }
    // A lantern turns its glow on and off, for you only (§5).
    if (def.does === 'light') {
      setLit((on) => !on);
      return;
    }
    const line = onUse ? onUse(def) : def.line;
    if (line) tell(line);
  };

  const step = () => {
    const next = route.current.shift();
    if (!next) {
      setWalking(false);
      if (faceEnd.current) facing.current = faceEnd.current;
      faceEnd.current = null;
      if (pending.current) act(pending.current);
      return;
    }
    facing.current = [next[0] - here.current[0], next[1] - here.current[1]];
    setFrom(here.current);
    here.current = next;
    setAt(next);
    timer.current = setTimeout(step, STEP_MS);
  };

  /** Walks the path to `to`; false when there is none. */
  const walk = (to: Cell): boolean => {
    const path = findPath(open, here.current, to);
    if (!path) return false;
    setSeated(null);
    clearTimeout(timer.current);
    const last = path.at(-1);
    const before = path.at(-2) ?? here.current;
    if (last) facing.current = [last[0] - before[0], last[1] - before[1]];
    if (path.length === 0) return true;
    if (reducedMotion()) {
      setFrom(path.length > 1 ? (path[path.length - 2] as Cell) : here.current);
      here.current = to;
      setAt(to);
      setWalking(false);
      return true;
    }
    route.current = path;
    setWalking(true);
    step();
    return true;
  };

  /**
   * Walks to the nearest cell from which a piece can be used, and uses it there, or as the walk
   * starts when it is a long one.
   */
  const walkToPiece = (id: string): boolean => {
    const p = layout.pieces.find((q) => q.id === id);
    const def = p && DEFS.get(p.id);
    if (!p || !def) return false;
    const best = standCells(p, def, ROOM, blocked)
      .map((c) => ({ c, path: findPath(open, here.current, c) }))
      .filter((o) => o.path)
      .sort((a, b) => (a.path?.length ?? 0) - (b.path?.length ?? 0))[0];
    if (!best?.path) return false;
    const far = best.path.length > OPEN_AFTER_STEPS;
    pending.current = far ? null : { p, def };
    if (!walk(best.c)) return false;
    // Already there, there at once (reduced motion), or too far to wait for.
    if (far || best.path.length === 0 || reducedMotion()) act({ p, def });
    // Face the piece: its cell, or the wall above.
    const cells = isFloor(p) ? cellsOf(p, def) : [];
    const toward = cells.find((c) => Math.abs(c[0] - best.c[0]) + Math.abs(c[1] - best.c[1]) === 1);
    facing.current = toward ? [toward[0] - best.c[0], toward[1] - best.c[1]] : [0, -1];
    faceEnd.current = facing.current;
    return true;
  };

  /** The piece you face, or failing that one you stand by, to use with Enter (§4). */
  const faced = (): string | null => {
    const [x, y] = here.current;
    const [dx, dy] = facing.current;
    const ahead = blocked.get(cellKey([x + dx, y + dy]));
    if (ahead) return ahead;
    const by = layout.pieces.filter((p) => {
      const def = DEFS.get(p.id);
      return (
        def && def.place !== 'rug' && standCells(p, def, ROOM, blocked).some((c) => same(c, [x, y]))
      );
    });
    const hanging = by.find((p) => !isFloor(p));
    return (dy < 0 && hanging ? hanging.id : by[0]?.id) ?? null;
  };

  /** The wall slot at a stage point, if any. */
  const slotAt = (x: number, y: number): number | null => {
    if (y < 250 || y > 600) return null;
    return ROOM.slots.find((s) => Math.abs(s.x - x) < 56)?.slot ?? null;
  };

  /** What hangs on the wall at a stage point, if anything. */
  const hangingAt = (x: number, y: number): string | null => {
    const slot = slotAt(x, y);
    if (slot === null) return null;
    for (const p of layout.pieces) {
      const def = DEFS.get(p.id);
      if (!def || isFloor(p)) continue;
      if ((slotsOf(p, def, ROOM) ?? []).some((s) => s.slot === slot)) return p.id;
    }
    return null;
  };

  /** A point of the page on the stage. */
  const onStage = (e: { clientX: number; clientY: number }): [number, number] | null => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return null;
    return [(e.clientX - box.left) / view.scale, (e.clientY - box.top) / view.scale];
  };

  /** The floor cell or wall slot under a pointer, for Decorate. */
  const spotAt = (e: PointerEvent<HTMLDivElement>): Spot | null => {
    const pt = onStage(e);
    if (!pt) return null;
    const cell = cellAt(...pt);
    if (cell) return { cell };
    const slot = slotAt(...pt);
    return slot === null ? null : { slot };
  };
  const pressed = useRef(false);
  const press = (phase: 'down' | 'move' | 'up', e: PointerEvent<HTMLDivElement>) => {
    if (!decor) return;
    if (phase === 'down') {
      pressed.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } else if (!pressed.current) return;
    if (phase === 'up') pressed.current = false;
    const spot = spotAt(e);
    if (spot) decor.onPress(spot, phase);
  };

  const tap = (e: MouseEvent<HTMLDivElement>) => {
    if (decor) return;
    const pt = onStage(e);
    if (!pt) return;
    const [x, y] = pt;
    const cell = cellAt(x, y);
    if (host && cell && hostAt && same(cell, hostAt)) {
      tell(hostLive ? `${host.name} waves.` : `${host.name} is glad you came by.`);
      return;
    }
    const guest = cell && guests.find((g) => g.room === where && same(g.at, cell));
    if (guest) {
      tell(`${guest.name} waves.`);
      return;
    }
    const piece = cell ? blocked.get(cellKey(cell)) : hangingAt(x, y);
    if (!piece) {
      pending.current = null;
      faceEnd.current = null;
    }
    const went = piece ? walkToPiece(piece) : cell ? walk(cell) : true;
    if (!went) tell('Can’t get there.');
  };

  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (decor) {
      if (e.target === e.currentTarget && decor.onKey(e.key)) e.preventDefault();
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
      e.preventDefault();
      const id = !walking && faced();
      if (id) walkToPiece(id);
      return;
    }
    const d = STEPS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!d) return;
    e.preventDefault();
    const to: Cell = [here.current[0] + d[0], here.current[1] + d[1]];
    // A press toward a piece turns you to face it, for Enter.
    if (!walking) facing.current = d;
    if (!open(...to)) return;
    // Mid-step, the press is the next step, so a quick player loses no key presses.
    pending.current = null;
    faceEnd.current = null;
    setSeated(null);
    if (walking) route.current = [to];
    else walk(to);
  };

  // On a phone the room pans: keep the avatar in the middle of the view (§4).
  useEffect(() => {
    const el = ref.current;
    if (!el || !view.pan) return;
    const left = cellFeet(...at)[0] * view.scale - el.clientWidth / 2;
    el.scrollTo?.({ left, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [at, view.pan, view.scale, ref]);

  // Where you are, for the friends in the house (§17).
  useEffect(() => {
    if (!decor) onMove?.({ room: where, at, seat: seated });
  }, [onMove, where, at, seated, decor]);

  // A piece set down where you stood (Decorate) sends you back to the door.
  useEffect(() => {
    if (open(...here.current)) return;
    clearTimeout(timer.current);
    route.current = [];
    here.current = ROOM.door;
    setAt(ROOM.door);
    setFrom(ROOM.door);
    setWalking(false);
    setSeated(null);
  }, [open, ROOM]);

  // Decorate hands the keyboard to the room when a piece is taken from the tray.
  const focusAsked = decor?.focus ?? 0;
  useEffect(() => {
    if (focusAsked) ref.current?.focus();
  }, [focusAsked, ref]);

  const marks = decor?.marks;
  const overlay = useMemo(() => (marks ? decorOverlay(marks) : ''), [marks]);

  const companion = useMemo(() => paintCompanion(look, 'home-pet'), [look]);
  const zRow = walking ? Math.max(at[1], from[1]) : at[1];
  // The companion sits at your feet when you stand still where it is, and trails a cell behind.
  const petCell = from;
  const petNudge = same(petCell, at) ? 60 : 0;
  const moving = !reducedMotion();

  const place = where === 'roof' ? 'roof' : 'room';
  const things = layout.pieces.flatMap((p) => {
    const def = DEFS.get(p.id);
    return def && def.does !== 'look' ? [{ id: p.id, def }] : [];
  });

  return (
    <>
      <div
        ref={ref}
        className={`room${view.pan ? ' room--pan' : ''}${decor ? ' room--decor' : ''}`}
        role="group"
        aria-label={
          host
            ? `${host.name}’s ${place}. Tap the floor, or use the arrow keys, to walk.`
            : decor
              ? `Your ${place}, decorating. Tap a piece, then a cell. The arrow keys move a held piece, and Enter sets it down.`
              : `Your ${place}. Tap the floor, or use the arrow keys, to walk.`
        }
        tabIndex={0}
        onKeyDown={key}
      >
        <div
          ref={stage}
          className="room__stage"
          data-walking={walking || undefined}
          data-at={cellKey(at)}
          data-seated={seated ? 'true' : undefined}
          data-host={hostAt ? `${hostLive ? 'live' : 'still'}:${cellKey(hostAt)}` : undefined}
          data-guests={
            guests
              .filter((g) => g.room === where)
              .map((g) => `${g.name}:${cellKey(g.at)}`)
              .join(' ') || undefined
          }
          onClick={tap}
          onPointerDown={(e) => press('down', e)}
          onPointerMove={(e) => press('move', e)}
          onPointerUp={(e) => press('up', e)}
          onPointerCancel={() => {
            pressed.current = false;
          }}
          data-holding={decor?.holding || undefined}
          style={{
            width: STAGE.width,
            height: STAGE.height,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        >
          <img className="room__layer" src={layers.back} alt="" draggable={false} />
          {layers.bands.map((b) => (
            <img
              key={b.row}
              className="room__layer"
              src={b.url}
              alt=""
              draggable={false}
              style={{ zIndex: 2 * b.row }}
            />
          ))}
          {!decor && companion && (
            <svg
              className={`room__figure room__pet${moving ? ' room__figure--moving' : ''}`}
              aria-hidden="true"
              width={AVATAR_BOX.width}
              height={AVATAR_BOX.height + 10}
              viewBox={`0 0 ${AVATAR_BOX.width} ${AVATAR_BOX.height + 10}`}
              overflow="visible"
              style={{ transform: placeAt(petCell, petNudge), zIndex: standingZ(petCell[1]) }}
              dangerouslySetInnerHTML={{ __html: companion }}
            />
          )}
          {host && hostAt && (
            <Avatar
              look={host.look}
              pet={false}
              className={`room__figure room__host${hostLive && moving ? ' room__figure--moving' : ''}`}
              width={AVATAR_BOX.width}
              height={AVATAR_BOX.height + 10}
              sit={!!hostSeat}
              style={figureAt(hostAt, hostSeat, seated ? [-1, -1] : at)}
            />
          )}
          {!decor &&
            guests
              .filter((g) => g.room === where)
              .map((g) => (
                <Avatar
                  key={g.id}
                  look={g.look}
                  pet={false}
                  className={`room__figure room__guest${moving ? ' room__figure--moving' : ''}`}
                  width={AVATAR_BOX.width}
                  height={AVATAR_BOX.height + 10}
                  sit={!!g.seat}
                  style={figureAt(g.at, g.seat, seated ? [-1, -1] : at)}
                />
              ))}
          {!decor && (
            <Avatar
              look={look}
              pet={false}
              className={`room__figure room__avatar${moving ? ' room__figure--moving' : ''}`}
              width={AVATAR_BOX.width}
              height={AVATAR_BOX.height + 10}
              sit={!!seated}
              style={
                seated
                  ? { transform: placeOn(seated.point, seated.row), zIndex: standingZ(seated.row) }
                  : { transform: placeAt(at), zIndex: standingZ(zRow) }
              }
            />
          )}
          {layers.glow && (
            <img
              className="room__layer room__light"
              src={layers.glow}
              alt=""
              draggable={false}
              data-glow={lit ? 'on' : 'off'}
              style={{ opacity: lit ? 1 : 0 }}
            />
          )}
          <img className="room__layer room__light" src={layers.light} alt="" draggable={false} />
          {decor && (
            <svg
              className="room__layer room__grid"
              aria-hidden="true"
              viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
              dangerouslySetInnerHTML={{ __html: overlay }}
            />
          )}
        </div>
        <p className="room__say" role="status">
          {say}
        </p>
      </div>
      {!decor && things.length > 0 && (
        <nav className="room__list" aria-label="In this room">
          <h2 className="room__list-title">In this room</h2>
          <ul>
            {things.map(({ id, def }) => (
              <li key={id}>
                <button
                  type="button"
                  className="room__thing"
                  onClick={() => {
                    if (!walkToPiece(id)) tell('Can’t get there.');
                  }}
                >
                  {def.name.charAt(0).toUpperCase() + def.name.slice(1)}:{' '}
                  {host ? VISITING[def.does] : USES[def.does]}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
