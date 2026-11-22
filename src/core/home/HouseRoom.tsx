import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Look } from '../avatar/looks.ts';
import { useDialogFocus } from '../player/useDialogFocus.ts';
import { PANELS, parseLayout, STARTER, type Layout } from './layout.ts';
import { Decorate } from './Decorate.tsx';
import { Room } from './Room.tsx';

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
 */
export function HouseRoom({
  onLoad,
  look,
  panels,
  owned = [],
  onSave,
}: {
  onLoad: () => Promise<unknown>;
  look: Look;
  panels: Partial<Record<Panel, ReactNode>>;
  /** The item ids the player owns, for the furniture they may place. */
  owned?: readonly string[];
  /** Saves a decorated room (§6); without it there is no Decorate button. */
  onSave?: (layout: Layout) => Promise<void>;
}) {
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
    onLoad().then(
      (raw) => live && setLayout(parseLayout(raw) ?? STARTER),
      () => live && setLayout(STARTER),
    );
    return () => {
      live = false;
    };
  }, [onLoad]);
  return (
    <>
      {layout && decorating && onSave ? (
        <Decorate
          layout={layout}
          look={look}
          owned={owned}
          onSave={onSave}
          onDone={(l) => {
            setLayout(l);
            setDecorating(false);
          }}
          onCancel={() => setDecorating(false)}
        />
      ) : layout ? (
        <Room
          layout={layout}
          look={look}
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
      {layout && onSave && !decorating && (
        <button type="button" className="decorate__start" onClick={() => setDecorating(true)}>
          Decorate
        </button>
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
