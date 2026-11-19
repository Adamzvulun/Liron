import { useMemo } from 'react';
import { pictureUrl } from './picture.ts';

/**
 * The hall's own painting behind a station's screen (roadmap A1): blurred and darkened, with the
 * station's cards on top. The painting is turned into one still image, so the browser draws it
 * once instead of laying out thousands of shapes on every screen. `paint` gives the room's SVG
 * markup, from our own painter (never from user input).
 */
export function HallBackdrop({
  id,
  width,
  height,
  paint,
}: {
  /** One per hall, e.g. `tower`. */
  id: string;
  width: number;
  height: number;
  paint: () => string;
}) {
  // Made once per page load, by the same maker as the finales' pictures (`hall:` keeps the two
  // sets of ids apart).
  const url = useMemo(
    () => pictureUrl(`hall:${id}`, { width, height }, paint),
    [id, width, height, paint],
  );
  return (
    <div className="hall-backdrop" aria-hidden="true" data-hall={id}>
      <img src={url} alt="" />
    </div>
  );
}
