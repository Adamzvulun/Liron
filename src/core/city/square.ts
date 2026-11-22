// The square's painting, made ready for the screen (City.tsx draws it): the scene painted once
// per page, and on a touch screen its parts as pictures. Kept apart from the component so the
// square can be got ready from elsewhere (warmSquare) while the player is away.
import { STAGE } from './layout.ts';
import { paintCity, type Box, type PlaceId, type Segment } from './painter.js';

/** The whole stage. */
export const FULL_STAGE: Box = { x: 0, y: 0, w: STAGE.width, h: STAGE.height };

// The painted scene never changes, so it is painted once per page load.
let painted: ReturnType<typeof paintCity> | undefined;
export function scene() {
  if (!painted) {
    performance.mark('city:paint-start');
    painted = paintCity();
    performance.measure('city:paint', 'city:paint-start');
  }
  return painted;
}

/**
 * The hover glow (#123): the same gold as the old `drop-shadow(0 0 18px …)`, drawn once from a
 * place's silhouette and faded in with opacity, so hovering never re-filters the building.
 */
export const GLOW_FILTER =
  '<filter id="wm-glow" x="-30%" y="-30%" width="160%" height="160%">' +
  '<feGaussianBlur in="SourceAlpha" stdDeviation="9" result="b"></feGaussianBlur>' +
  '<feFlood flood-color="#FFD36B" flood-opacity=".85"></feFlood>' +
  '<feComposite operator="in" in2="b"></feComposite></filter>';

/**
 * A touch screen gets the square as pictures (2026-11-21). Live, the painting is ~100 filtered
 * shapes (blurred shadows, plaster, grain), and Safari keeps a full-size buffer for each at the
 * screen's resolution: on an iPhone that was more memory than it gives a page, and the page
 * crashed and reloaded over and over. An SVG drawn as an image is filtered once into one bitmap.
 * A mouse keeps the live painting, whose pieces move and whose places glow on hover.
 */
export const touchScreen = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches;

const SVG_NS = 'http://www.w3.org/2000/svg';
/** How far a part's picture reaches past its box, in stage pixels. */
const PICTURE_PAD = 40;
const pictures = new Map<string, string>();

/** The square's gradients, filters and patterns by id, read once per page. */
let defsById: { source: string; byId: Map<string, string> } | undefined;
const REFERENCE = /#([\w-]+)/g;

/**
 * Only the definitions `body` uses (and those they use in turn). Every picture is its own
 * document, and the browser reads all it is given each time it draws one: the whole set is
 * 292 definitions, and a building uses a handful.
 */
function defsFor(body: string, defs: string): string {
  if (defsById?.source !== defs) {
    const doc = new DOMParser().parseFromString(
      `<svg xmlns="${SVG_NS}"><defs>${defs}</defs></svg>`,
      'image/svg+xml',
    );
    const byId = new Map<string, string>();
    for (const el of doc.querySelectorAll('defs > [id]')) byId.set(el.id, el.outerHTML);
    defsById = { source: defs, byId };
  }
  const { byId } = defsById;
  const used = new Set<string>();
  const look = (markup: string) => {
    for (const [, id = ''] of markup.matchAll(REFERENCE)) {
      const def = byId.get(id);
      if (def === undefined || used.has(id)) continue;
      used.add(id);
      look(def);
    }
  };
  look(body);
  return [...used].map((id) => byId.get(id)).join('');
}

/**
 * A picture of `segments` over `box`, as an image address made once per page. Sprites are drawn
 * where they stand still; a touch screen keeps the square still anyway.
 */
export function pictureOf(
  key: string,
  segments: readonly Segment[],
  box: Box,
  defs: string,
): string {
  const made = pictures.get(key);
  if (made) return made;
  const { x, y, w, h } = box;
  const body = segments
    .map((s) =>
      typeof s === 'string'
        ? s
        : `<svg x="${s.box.x}" y="${s.box.y}" width="${s.box.w}" height="${s.box.h}" viewBox="${s.box.x} ${s.box.y} ${s.box.w} ${s.box.h}" overflow="visible">${s.svg}</svg>`,
    )
    .join('');
  const xml = `<svg xmlns="${SVG_NS}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"><defs>${defsFor(body, defs)}</defs>${body}</svg>`;
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  pictures.set(key, url);
  return url;
}

/** A part's shapes may reach past its box (the live drawing shows them, an image can't). */
export function padded(box: Box): Box {
  const pad = box.w === STAGE.width ? 0 : PICTURE_PAD;
  return { x: box.x - pad, y: box.y - pad, w: box.w + 2 * pad, h: box.h + 2 * pad };
}

/**
 * Gets the square ready while the player is somewhere else (a hall, Your House), so coming
 * back doesn't wait for it: the scene is painted once per page, and on a touch screen its
 * pictures are made too. A player who opens a hall first, or reloads in one, would otherwise
 * pay for all of it on the way back (2026-11-22: about a third of the return, 4× slowed).
 * The pictures here are the ones the square always shows; a lamp's glow is made when lit.
 */
export function warmSquare() {
  const city = scene();
  if (!touchScreen()) return;
  const defs = city.defs + GLOW_FILTER;
  const parts: [string, readonly Segment[], Box][] = [
    ['back', [...city.layers.sky, ...city.layers.ground, ...city.layers.mid], FULL_STAGE],
    ...city.plots.map((p, i): [string, Segment[], Box] => [`plot-${i}`, p.segments, p.box]),
    ...(Object.keys(city.places) as PlaceId[]).map((id): [string, Segment[], Box] => [
      `place-${id}`,
      city.places[id].segments,
      city.places[id].box,
    ]),
    ['avatar', city.avatar.segments, city.avatar.box],
    ['front', city.layers.front, FULL_STAGE],
  ];
  for (const [name, segments, box] of parts) pictureOf(name, segments, padded(box), defs);
}
