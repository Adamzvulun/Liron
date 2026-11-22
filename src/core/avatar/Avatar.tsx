import { useId, useMemo, type CSSProperties } from 'react';
import type { Look } from './looks.ts';
import { AVATAR_BOX, paintAvatar } from './paint.ts';

/** Full figure, or head and shoulders for the HUD portrait. */
const VIEWS = {
  full: `0 0 ${AVATAR_BOX.width} ${AVATAR_BOX.height + 10}`,
  portrait: '30 26 140 140',
} as const;

/**
 * The player's paper-doll avatar (#28), painted from their look. The same drawing serves the
 * city, the HUD portrait and Your House; only the size and the view change.
 */
export function Avatar({
  look,
  view = 'full',
  shadow = view === 'full',
  className,
  width,
  height,
  style,
  pole = false,
  pet = true,
  sit = false,
}: {
  look: Look;
  view?: keyof typeof VIEWS;
  shadow?: boolean;
  className?: string;
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  /** Nour's staff and lantern (paint.ts); only the guide carries it. */
  pole?: boolean;
  /** The companion at the avatar's feet; the home draws it on its own (task 7.5). */
  pet?: boolean;
  /** Sitting down (the home, task 7.6). */
  sit?: boolean;
}) {
  const idPrefix = useId();
  // The markup comes from our own painter and validated look values, never from free text.
  const svg = useMemo(
    () => paintAvatar(look, { idPrefix, shadow, pole, pet, sit }),
    [look, idPrefix, shadow, pole, pet, sit],
  );
  return (
    <svg
      className={className}
      aria-hidden="true"
      width={width}
      height={height}
      style={style}
      viewBox={VIEWS[view]}
      overflow={view === 'full' ? 'visible' : 'hidden'}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
