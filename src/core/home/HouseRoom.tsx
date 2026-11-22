import { useEffect, useState } from 'react';
import type { Look } from '../avatar/looks.ts';
import { parseLayout, STARTER, type Layout } from './layout.ts';
import { Room } from './Room.tsx';

/**
 * Your House's room (task 7.5): the layout saved with `save_home`, or the starter room for a
 * player who never decorated, or whose saved room this build can't read (R1).
 */
export function HouseRoom({ onLoad, look }: { onLoad: () => Promise<unknown>; look: Look }) {
  const [layout, setLayout] = useState<Layout | null>(null);
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
  if (!layout) return <div className="room room--loading" aria-busy="true" />;
  return <Room layout={layout} look={look} />;
}
