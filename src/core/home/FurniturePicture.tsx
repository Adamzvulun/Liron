// A piece of furniture in a small picture of the room (task 7.8, the-home.md §7): the Market's
// stall shows furniture this way, not on the traveler. A still picture, made once a page load.
import { pictureUrl } from '../city/picture.ts';
import home from '../../../content/core/home.json' with { type: 'json' };
import { room, type RoomStyle } from '../city/paintHouse.ts';
import { FURNITURE } from './paintFurniture.ts';

const STAGE = { width: 1920, height: 1080 } as const;
/** Wall pieces are painted on the window; the picture hangs them on the wall left of it. */
const WALL_SHIFT = -300;

/** The room's styles to buy (`home-style` in home.json): each paints its part of the room. */
const STYLES = new Map(
  home.items
    .filter((i) => i.type === 'home-style')
    .map((i) => {
      const { part, style } = i.data as { part: 'wallpaper' | 'floor'; style: string };
      return [i.id, { [part]: style } as Partial<RoomStyle>];
    }),
);
const PLAIN: RoomStyle = { wallpaper: 'plaster', floor: 'planks' };

/** A wallpaper or floor: the empty room in that style, where the back wall meets the floor. */
function StylePicture({
  id,
  style,
  className,
}: {
  id: string;
  style: Partial<RoomStyle>;
  className?: string;
}) {
  const url = pictureUrl(`style:${id}`, STAGE, () => room({ ...PLAIN, ...style }));
  return (
    <svg className={className} viewBox="660 470 600 450" aria-hidden="true">
      <image href={url} width={STAGE.width} height={STAGE.height} />
    </svg>
  );
}

export function FurniturePicture({ id, className }: { id: string; className?: string }) {
  const style = STYLES.get(id);
  if (style) return <StylePicture id={id} style={style} className={className} />;
  const piece = FURNITURE[id as keyof typeof FURNITURE];
  if (!piece) return null;
  const art = piece.paint();
  const wall = 'wallX' in piece;
  const shift = wall ? WALL_SHIFT : 0;
  const url = pictureUrl(`furniture:${id}`, STAGE, () =>
    wall ? room() + `<g transform="translate(${WALL_SHIFT} 0)">${art}</g>` : room() + art,
  );
  // Around what is painted: the corners of its paths and the reach of its circles, with room
  // around it, 4 by 3.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const m of art.matchAll(/[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)) {
    xs.push(Number(m[1]) + shift);
    ys.push(Number(m[2]));
  }
  for (const m of art.matchAll(
    /cx="(-?\d+(?:\.\d+)?)" cy="(-?\d+(?:\.\d+)?)" r[x]?="(\d+(?:\.\d+)?)"(?: ry="(\d+(?:\.\d+)?)")?/g,
  )) {
    const [cx, cy, rx] = [Number(m[1]) + shift, Number(m[2]), Number(m[3])];
    const ry = m[4] ? Number(m[4]) : rx;
    xs.push(cx - rx, cx + rx);
    ys.push(cy - ry, cy + ry);
  }
  const [x0, x1, y0, y1] = xs.length
    ? [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    : [910 + shift, 1010 + shift, 310, 410];
  const width = Math.max(300, (x1 - x0) * 1.7, ((y1 - y0) * 1.5 * 4) / 3);
  const height = (width * 3) / 4;
  const x = Math.max(0, Math.min(STAGE.width - width, (x0 + x1) / 2 - width / 2));
  const y = Math.max(0, Math.min(STAGE.height - height, (y0 + y1) / 2 - height / 2));
  return (
    <svg className={className} viewBox={`${x} ${y} ${width} ${height}`} aria-hidden="true">
      <image href={url} width={STAGE.width} height={STAGE.height} />
    </svg>
  );
}
