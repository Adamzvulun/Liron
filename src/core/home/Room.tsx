// The room you walk in (task 7.5, docs/game/the-home.md §3–4, R1, R2, R4, R5, R10; ADR 0055).
// The room is painted in layers, each one a still picture: the walls and what hangs and lies on
// the floor behind everything, then one layer per row line of the floor pieces, then the light.
// The avatar and its companion are live drawings set between those layers by the row they stand
// on, and they move by `transform` only (ADR 0025). Pieces that do things come in task 7.6.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Avatar } from '../avatar/Avatar.tsx';
import type { Look } from '../avatar/looks.ts';
import { AVATAR_BOX, paintCompanion } from '../avatar/paint.ts';
import { pictureUrl } from '../city/picture.ts';
import { useStage } from '../city/useStage.ts';
import {
  blockedCells,
  FURNITURE_PIECES,
  isFloor,
  ROOM,
  slotsOf,
  STARTER_PIECES,
  standCells,
  type Layout,
  type PieceDef,
} from './layout.ts';
import { homeLayers } from './paintHome.ts';
import { cellKey, findPath, type Cell } from './path.ts';
import { avatarScale, cellAt, cellFeet } from './projection.ts';
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
  const [x, y] = cellFeet(c, r);
  const s = avatarScale(r);
  return `translate(${x - AVATAR_BOX.width / 2 + nudge * s}px, ${y - AVATAR_BOX.feetY}px) scale(${s})`;
}

export function Room({ layout, look }: { layout: Layout; look: Look }) {
  const layers = useMemo(() => {
    const id = JSON.stringify(layout);
    const { back, bands, light } = homeLayers(layout, DEFS);
    return {
      back: pictureUrl(`home:back:${id}`, STAGE, () => back),
      bands: bands.map((b) => ({
        row: b.row,
        url: pictureUrl(`home:band:${b.row}:${id}`, STAGE, () => b.svg),
      })),
      light: pictureUrl('home:light', STAGE, () => light),
    };
  }, [layout]);
  const blocked = useMemo(() => blockedCells(layout, DEFS), [layout]);
  const open = useMemo(
    () => (x: number, y: number) =>
      x >= 0 && y >= 0 && x < ROOM.cols && y < ROOM.rows && !blocked.has(cellKey([x, y])),
    [blocked],
  );

  const [ref, view] = useStage(cellFeet(...ROOM.door)[0], contain);
  const stage = useRef<HTMLDivElement>(null);
  // Where the avatar is (or is stepping to), and the cell it came from, where the companion is.
  const [at, setAt] = useState<Cell>(ROOM.door);
  const [from, setFrom] = useState<Cell>(ROOM.door);
  const [walking, setWalking] = useState(false);
  const [say, setSay] = useState('');
  const route = useRef<Cell[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hush = useRef<ReturnType<typeof setTimeout>>(undefined);
  const here = useRef<Cell>(ROOM.door);
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

  const step = () => {
    const next = route.current.shift();
    if (!next) {
      setWalking(false);
      return;
    }
    setFrom(here.current);
    here.current = next;
    setAt(next);
    timer.current = setTimeout(step, STEP_MS);
  };

  /** Walks the path to `to`; false when there is none. */
  const walk = (to: Cell): boolean => {
    const path = findPath(open, here.current, to);
    if (!path) return false;
    clearTimeout(timer.current);
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

  /** Walks to the nearest cell from which a piece can be used. */
  const walkToPiece = (id: string): boolean => {
    const p = layout.pieces.find((q) => q.id === id);
    const def = p && DEFS.get(p.id);
    if (!p || !def) return false;
    const best = standCells(p, def, ROOM, blocked)
      .map((c) => ({ c, path: findPath(open, here.current, c) }))
      .filter((o) => o.path)
      .sort((a, b) => (a.path?.length ?? 0) - (b.path?.length ?? 0))[0];
    return !!best && walk(best.c);
  };

  /** What hangs on the wall at a stage point, if anything. */
  const hangingAt = (x: number, y: number): string | null => {
    if (y < 250 || y > 600) return null;
    for (const p of layout.pieces) {
      const def = DEFS.get(p.id);
      if (!def || isFloor(p)) continue;
      if ((slotsOf(p, def, ROOM) ?? []).some((s) => Math.abs(s.x - x) < 56)) return p.id;
    }
    return null;
  };

  const tap = (e: MouseEvent<HTMLDivElement>) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    const x = (e.clientX - box.left) / view.scale;
    const y = (e.clientY - box.top) / view.scale;
    const cell = cellAt(x, y);
    const piece = cell ? blocked.get(cellKey(cell)) : hangingAt(x, y);
    const went = piece ? walkToPiece(piece) : cell ? walk(cell) : true;
    if (!went) tell('Can’t get there.');
  };

  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const d = STEPS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!d) return;
    e.preventDefault();
    const to: Cell = [here.current[0] + d[0], here.current[1] + d[1]];
    if (!open(...to)) return;
    // Mid-step, the press is the next step, so a quick player loses no key presses.
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

  const companion = useMemo(() => paintCompanion(look, 'home-pet'), [look]);
  const zRow = walking ? Math.max(at[1], from[1]) : at[1];
  // The companion sits at your feet when you stand still where it is, and trails a cell behind.
  const petCell = from;
  const petNudge = same(petCell, at) ? 60 : 0;
  const moving = !reducedMotion();

  return (
    <div
      ref={ref}
      className={`room${view.pan ? ' room--pan' : ''}`}
      role="group"
      aria-label="Your room. Tap the floor, or use the arrow keys, to walk."
      tabIndex={0}
      onKeyDown={key}
    >
      <div
        ref={stage}
        className="room__stage"
        data-walking={walking || undefined}
        data-at={cellKey(at)}
        onClick={tap}
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
        {companion && (
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
        <Avatar
          look={look}
          pet={false}
          className={`room__figure room__avatar${moving ? ' room__figure--moving' : ''}`}
          width={AVATAR_BOX.width}
          height={AVATAR_BOX.height + 10}
          style={{ transform: placeAt(at), zIndex: standingZ(zRow) }}
        />
        <img className="room__layer room__light" src={layers.light} alt="" draggable={false} />
      </div>
      <p className="room__say" role="status">
        {say}
      </p>
    </div>
  );
}
