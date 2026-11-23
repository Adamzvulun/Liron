// Decorating your room (task 7.7, docs/game/the-home.md §6): the grid over the room, a tray of
// the pieces you own and haven't placed, and one piece held at a time. A piece is picked up by
// a tap (in the room or the tray) and set down by a tap on a cell; dragging works too, and the
// arrows and Enter do the same on a keyboard. Each place is checked with the room's rules as you
// go; Done saves the whole room at once and Cancel leaves it as it was.
import type { Look } from '../avatar/looks.ts';
import { useMemo, useState } from 'react';
import { ALL, clamp, floorAt, ownedPieces, pieceAt, placeFor, wallAt } from './decorate.ts';
import {
  cellsOf,
  checkLayout,
  isFloor,
  ownedStyles,
  PANELS,
  refusalText,
  ROOM,
  STYLES,
  type Layout,
  type PieceDef,
  type Placed,
} from './layout.ts';
import type { Cell } from './path.ts';
import { Room, type Decor } from './Room.tsx';

const the = (def: PieceDef) => `the ${def.name}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** A style's name for its picker: the plain room's own, or the one it is sold under. */
const styleName = (part: 'wallpaper' | 'floor', style: string) =>
  cap(
    STYLES.find((s) => s.part === part && s.style === style)?.name ??
      (part === 'wallpaper' ? 'plain plaster' : 'plain planks'),
  );

const MOVES: Record<string, Cell> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

interface Held {
  def: PieceDef;
  /** Where it would go now; null until it is first moved (a piece just taken from the tray). */
  at: Placed | null;
  /** Where it was picked up from, to go back to on Escape; null from the tray. */
  was: Placed | null;
}

export function Decorate({
  layout,
  look,
  owned,
  onSave,
  onDone,
  onCancel,
}: {
  layout: Layout;
  look: Look;
  /** The item ids the player owns: the furniture among them can be placed. */
  owned: readonly string[];
  onSave: (layout: Layout) => Promise<void>;
  onDone: (layout: Layout) => void;
  onCancel: () => void;
}) {
  const mine = useMemo(() => ownedPieces(owned), [owned]);
  const styles = useMemo(() => ownedStyles(owned), [owned]);
  const [draft, setDraft] = useState(layout);
  const [held, setHeld] = useState<Held | null>(null);
  const [say, setSay] = useState('');
  const [focus, setFocus] = useState(0);
  const [saving, setSaving] = useState(false);
  // A press that picked a piece up: let go where it was, it stays held; dragged, it is set down.
  const [grab, setGrab] = useState<Placed | null>(null);

  const with_ = (at: Placed) => ({ ...draft, pieces: [...draft.pieces, at] });
  const refusal = (at: Placed) => checkLayout(with_(at), mine, ROOM, styles);
  const tray = [...mine.values()].filter(
    (d) => d.id !== held?.def.id && !draft.pieces.some((p) => p.id === d.id),
  );

  const pickUp = (p: Placed) => {
    const def = ALL.get(p.id);
    if (!def) return;
    setDraft((l) => ({ ...l, pieces: l.pieces.filter((q) => q.id !== p.id) }));
    setHeld({ def, at: p, was: p });
    setSay(`Holding ${the(def)}. Tap where it goes, or use the arrow keys and Enter.`);
  };

  const fromTray = (def: PieceDef) => {
    if (held) putBack();
    setHeld({ def, at: null, was: null });
    setFocus((n) => n + 1);
    setSay(`Holding ${the(def)}. Tap where it goes, or use the arrow keys and Enter.`);
  };

  /** Sets the held piece down where it would go; says why not when it can't. */
  const setDown = (at: Placed | null = held?.at ?? null) => {
    if (!held) return;
    if (!at) {
      setSay(`Move ${the(held.def)} first: tap a cell, or use the arrow keys.`);
      return;
    }
    const no = refusal(at);
    if (no) {
      setHeld({ ...held, at });
      setSay(refusalText(no, ALL));
      return;
    }
    setDraft(with_(at));
    setHeld(null);
    setSay(`Set down ${the(held.def)}.`);
  };

  /** The held piece goes back where it was picked up, or to the tray. */
  const putBack = () => {
    if (!held) return;
    if (held.was) setDraft((l) => ({ ...l, pieces: [...l.pieces, held.was as Placed] }));
    setHeld(null);
    setSay(held.was ? `Put ${the(held.def)} back.` : `${cap(the(held.def))} is back in the tray.`);
  };

  const store = () => {
    if (!held) return;
    setHeld(null);
    setSay(`Stored ${the(held.def)} in the tray.`);
  };

  const onPress: Decor['onPress'] = (spot, phase) => {
    if (!held) {
      if (phase !== 'down') return;
      const p = pieceAt(draft, spot);
      if (p) {
        pickUp(p);
        setGrab(p);
      }
      return;
    }
    const at = placeFor(held.def, spot);
    if (phase !== 'up') {
      if (at) setHeld({ ...held, at });
      return;
    }
    // Let go where it was just picked up: still held, for a tap on where it goes.
    if (grab && at && JSON.stringify(at) === JSON.stringify(grab)) {
      setGrab(null);
      return;
    }
    setGrab(null);
    if (at) setDown(at);
  };

  const onKey: Decor['onKey'] = (key) => {
    if (!held) return false;
    if (key === 'Escape') {
      putBack();
      return true;
    }
    if (key === 'Enter' || key === ' ') {
      setDown();
      return true;
    }
    const d = MOVES[key];
    if (!d) return false;
    const def = held.def;
    const now = held.at;
    let next: Placed | null;
    if (def.place === 'wall') {
      const slot = now && !isFloor(now) ? now.slot + d[0] : ROOM.slots[0]?.slot;
      next = slot === undefined ? null : wallAt(def, slot);
    } else if (now && isFloor(now)) {
      const [w, dd] = def.size;
      const x = clamp(now.at[0] + d[0], 0, ROOM.cols - w);
      const y = clamp(now.at[1] + d[1], 0, ROOM.rows - dd);
      next = { ...now, at: [x, y], facing: x + w / 2 <= ROOM.cols / 2 ? 'right' : 'left' };
    } else {
      next = floorAt(def, [Math.floor(ROOM.cols / 2), Math.floor(ROOM.rows / 2)]);
    }
    if (next) setHeld({ ...held, at: next });
    return true;
  };

  const marks: Decor['marks'] =
    held?.at && isFloor(held.at)
      ? [
          {
            cells: cellsOf(held.at, held.def).map(([x, y]): [number, number] => [x, y]),
            tone: refusal(held.at) ? 'no' : 'ok',
          },
        ]
      : [];

  // What the held piece would stand on, drawn in the room as it is now, so you see it.
  const shown = held?.at ? with_(held.at) : draft;

  const done = async () => {
    let room = draft;
    if (held?.was) room = { ...draft, pieces: [...draft.pieces, held.was] };
    const no = checkLayout(room, mine, ROOM, styles);
    if (no) {
      setSay(refusalText(no, ALL));
      return;
    }
    setSaving(true);
    try {
      await onSave(room);
      onDone(room);
    } catch {
      setSaving(false);
      setSay('Couldn’t save your room. Try again in a moment.');
    }
  };

  const panel = held && (PANELS as readonly string[]).includes(held.def.does);

  return (
    <>
      <Room layout={shown} look={look} decor={{ marks, onPress, onKey, holding: !!held, focus }} />
      <section className="decorate" aria-label="Decorate">
        <p className="decorate__say" role="status">
          {say}
        </p>
        <div className="decorate__actions">
          {held && !panel && (
            <button type="button" className="decorate__button" onClick={store}>
              Store {the(held.def)}
            </button>
          )}
          {held && (
            <button type="button" className="decorate__button" onClick={putBack}>
              Put it back
            </button>
          )}
          <button
            type="button"
            className="decorate__button decorate__button--main"
            onClick={() => void done()}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Done'}
          </button>
          <button type="button" className="decorate__button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
        {(styles.wallpapers.length > 1 || styles.floors.length > 1) && (
          <div className="decorate__styles">
            {(['wallpaper', 'floor'] as const).map((part) => {
              const list = part === 'wallpaper' ? styles.wallpapers : styles.floors;
              if (list.length < 2) return null;
              return (
                <label key={part} className="decorate__style">
                  {part === 'wallpaper' ? 'Wallpaper' : 'Floor'}
                  <select
                    value={draft[part]}
                    onChange={(e) => {
                      setDraft((l) => ({ ...l, [part]: e.target.value }));
                      setSay('');
                    }}
                  >
                    {list.map((style) => (
                      <option key={style} value={style}>
                        {styleName(part, style)}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        )}
        <h2 className="decorate__title">In the tray</h2>
        {tray.length === 0 ? (
          <p className="decorate__empty">Everything you own is in the room.</p>
        ) : (
          <ul className="decorate__tray">
            {tray.map((d) => (
              <li key={d.id}>
                <button type="button" className="decorate__piece" onClick={() => fromTray(d)}>
                  Pick up {the(d)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
