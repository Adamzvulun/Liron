import { useMemo } from 'react';

/** Each hall's painting as an image URL, made once per page load. */
const urls = new Map<string, string>();

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
  const url = useMemo(() => {
    let made = urls.get(id);
    if (!made) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paint()}</svg>`;
      made =
        typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
          : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      urls.set(id, made);
    }
    return made;
  }, [id, width, height, paint]);
  return (
    <div className="hall-backdrop" aria-hidden="true" data-hall={id}>
      <img src={url} alt="" />
    </div>
  );
}
