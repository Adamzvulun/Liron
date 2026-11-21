import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Avatar } from '../avatar/Avatar.tsx';
import { AVATAR_BOX } from '../avatar/paint.ts';
import { DEFAULT_LOOK, type Look } from '../avatar/looks.ts';
import { Link } from '../Link.tsx';
import { navigate } from '../router.ts';
import { visitPath } from '../fellowship/fellowship.ts';
import type { SubjectInfo } from '../subject.ts';
import {
  ARENA_SIGN,
  AVATAR_SPOT,
  FRIEND_SCALE,
  FRIEND_SPOTS,
  stepToward,
  WALK_MS,
  PLACE_LABELS,
  PLACE_PATHS,
  PLAQUES,
  residentsOf,
  STAGE,
} from './layout.ts';
import { useStage } from './useStage.ts';
import {
  paintCity,
  type Box,
  type PaintedPart,
  type PlaceId,
  type Segment,
  type Sprite,
} from './painter.js';
import './city.css';

/** Short names for the phone's dock, where space is tight. */
const DOCK_LABELS: Partial<Record<PlaceId, string>> = { board: 'Quests', house: 'House' };

// "Caravanserai" may break after "Caravan" on a narrow phone, as "Signal Tower" breaks at its
// space. The link keeps its whole name for screen readers (Chrome reads the break as a gap).
const DOCK_BREAKS: Partial<Record<PlaceId, ReactNode>> = {
  caravanserai: (
    <>
      Caravan
      <wbr />
      serai
    </>
  ),
};

// The painted scene never changes, so it is painted once per page load.
let painted: ReturnType<typeof paintCity> | undefined;
function scene() {
  if (!painted) {
    performance.mark('city:paint-start');
    painted = paintCity();
    performance.measure('city:paint', 'city:paint-start');
  }
  return painted;
}

/** Where the view starts when it pans on a phone: the compass in the middle of the square. */
const START_X = 1010;

/**
 * The hover glow (#123): the same gold as the old `drop-shadow(0 0 18px …)`, drawn once from a
 * place's silhouette and faded in with opacity, so hovering never re-filters the building.
 */
const GLOW_FILTER =
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
const touchScreen = () =>
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
function pictureOf(key: string, segments: readonly Segment[], box: Box, defs: string): string {
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

/** Markup without its filters, for shapes that are only there to be tapped. */
const unfiltered = (svg: string) => svg.replace(/ filter="url\(#[^)]*\)"/g, '');

function Picture({
  name,
  segments,
  box,
  defs,
  className = 'city__part',
}: {
  name: string;
  segments: readonly Segment[];
  box: Box;
  defs: string;
  className?: string;
}) {
  // A part's shapes may reach past its box (the live drawing shows them, an image can't).
  const pad = box.w === STAGE.width ? 0 : PICTURE_PAD;
  const drawn = { x: box.x - pad, y: box.y - pad, w: box.w + 2 * pad, h: box.h + 2 * pad };
  const { x, y, w, h } = drawn;
  return (
    <img
      className={`${className} city__picture`}
      src={pictureOf(name, segments, drawn, defs)}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={w}
      height={h}
      style={x || y ? { left: x, top: y } : undefined}
    />
  );
}

/** Static SVG markup over `box`. The markup is generated by our own painter, never from user input. */
function Still({
  svg,
  box,
  className = 'city__part',
  placed = true,
}: {
  svg: string;
  box: Box;
  className?: string;
  /** Position it on the stage at its box (false inside a sprite, which is placed already). */
  placed?: boolean;
}) {
  const { x, y, w, h } = box;
  return (
    <svg
      className={className}
      aria-hidden="true"
      width={w}
      height={h}
      viewBox={`${x} ${y} ${w} ${h}`}
      style={placed && (x || y) ? { left: x, top: y } : undefined}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/**
 * One animated piece as its own small layer (#123). Only the wrapper's transform and opacity
 * animate, so the browser moves a ready-drawn picture instead of repainting the scene.
 */
function SpriteLayer({ sprite }: { sprite: Sprite }) {
  const { x, y, w, h } = sprite.box;
  const { origin } = sprite;
  return (
    <div
      className={`city__sprite ${sprite.motion}`}
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        transformOrigin: origin ? `${origin.x - x}px ${origin.y - y}px` : undefined,
      }}
    >
      <Still svg={sprite.svg} box={sprite.box} placed={false} />
    </div>
  );
}

/** Static runs and sprites in paint order, over `box`. */
function Segments({
  segments,
  box,
  className,
}: {
  segments: Segment[];
  box: Box;
  className?: string;
}) {
  return segments.map((segment, i) =>
    typeof segment === 'string' ? (
      <Still key={i} svg={segment} box={box} className={className} />
    ) : (
      <SpriteLayer key={i} sprite={segment} />
    ),
  );
}

const FULL_STAGE: Box = { x: 0, y: 0, w: STAGE.width, h: STAGE.height };

function Part({ part }: { part: PaintedPart }) {
  return <Segments segments={part.segments} box={part.box} />;
}

/** A place's silhouette in gold, shown on hover. */
function Glow({ part }: { part: PaintedPart }) {
  const svg = part.segments.map((s) => (typeof s === 'string' ? s : s.svg)).join('');
  return (
    <Still svg={`<g filter="url(#wm-glow)">${svg}</g>`} box={part.box} className="city__glow" />
  );
}

/** The strings of bunting, in stage pixels: from, to, and how far each sags in the middle. */
const STRINGS = [
  // Your House's gable to the tower, the tower to the Caravanserai, and on to the market.
  { from: [400, 440], to: [640, 480], sag: 36 },
  { from: [770, 470], to: [1010, 420], sag: 44 },
  { from: [1360, 420], to: [1640, 690], sag: 30 },
] as const;

/** One string: the curve, and a pennant every 44 pixels along it, in turn of the colors. */
function bunting(s: (typeof STRINGS)[number], colors: readonly string[]) {
  const [x0, y0] = s.from;
  const [x1, y1] = s.to;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2 + s.sag * 2;
  const at = (t: number): [number, number] => [
    (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1,
    (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1,
  ];
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 44));
  let flags = '';
  for (let i = 1; i < n; i += 1) {
    const [x, y] = at(i / n);
    flags += `<path d="M${x - 15} ${y} L${x + 15} ${y} L${x} ${y + 36} Z" fill="${colors[i % colors.length]}" stroke="#2A170C" stroke-width="3" stroke-linejoin="round"/>`;
  }
  return `<path d="M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}" fill="none" stroke="#2A170C" stroke-width="4"/>${flags}`;
}

/** The square dressed for a world event (task 4.4): bunting strung across it. */
function Bunting({ name, colors }: { name: string; colors: readonly string[] }) {
  const svg = STRINGS.map((s) => bunting(s, colors)).join('');
  return (
    <svg
      className="city__bunting"
      viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
      width={STAGE.width}
      height={STAGE.height}
      role="img"
      aria-label={`The square is dressed for ${name}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/**
 * The city square (issue #24): the approved concept v3, painted in the browser and scaled to
 * fit the window. Each place is a link to its screen (#25). `children` (the HUD) sit on top,
 * outside the scaled stage.
 */
export function City({
  subjects,
  look = DEFAULT_LOOK,
  children,
  lit = [],
  event = null,
  friends = [],
}: {
  subjects: readonly SubjectInfo[];
  /** The player's avatar; the default traveller until the profile loads. */
  look?: Look;
  children?: ReactNode;
  /** Buildings whose lamps light up now: a step on their road was just done (task 4.6). */
  lit?: readonly PlaceId[];
  /** The world event on today, which dresses the square (task 4.4). */
  event?: { name: string; colors: readonly string[] } | null;
  /** Friends standing in the square (task 3.3); each is a way to their house. */
  friends?: readonly { id: string; name: string; look: Look }[];
}) {
  const city = scene();
  // The avatar walks a few steps toward the door before the place opens (task 4.6).
  const [walk, setWalk] = useState<{ dx: number; dy: number } | null>(null);
  const walkTo = (id: PlaceId, href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || walk) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    setWalk(stepToward(city.places[id].box));
    // Only if the player is still in the square: Back or another link during the walk wins
    // (review, 2026-11-19).
    // The path only: sign-in tidying the hash or query isn't leaving. A walk that doesn't
    // arrive ends, so the avatar stands back in place and the next click walks again.
    const from = window.location.pathname;
    walking.current = setTimeout(() => {
      if (window.location.pathname === from) navigate(href);
      else setWalk(null);
    }, WALK_MS);
  };
  const walking = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(walking.current), []);
  const [flat] = useState(touchScreen);
  const defs = city.defs + GLOW_FILTER;
  const [ref, { scale, x, y, pan }] = useStage(START_X);
  const residents = residentsOf(subjects);
  return (
    <main className={`city${pan ? ' city--pan' : ''}`}>
      <h1 className="visually-hidden">Waymark</h1>
      <div className="city__view" ref={ref}>
        {pan && (
          <div
            className="city__sizer"
            style={{ width: STAGE.width * scale, height: STAGE.height * scale }}
          />
        )}
        <div
          className="city__stage"
          style={{
            width: STAGE.width,
            height: STAGE.height,
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
          }}
        >
          <svg className="city__defs" aria-hidden="true" width="0" height="0">
            <defs dangerouslySetInnerHTML={{ __html: city.defs + GLOW_FILTER }} />
          </svg>
          {flat ? (
            <Picture
              name="back"
              segments={[...city.layers.sky, ...city.layers.ground, ...city.layers.mid]}
              box={FULL_STAGE}
              defs={defs}
              className="city__layer"
            />
          ) : (
            <>
              <Segments segments={city.layers.sky} box={FULL_STAGE} className="city__layer" />
              <Segments segments={city.layers.ground} box={FULL_STAGE} className="city__layer" />
              <Segments segments={city.layers.mid} box={FULL_STAGE} className="city__layer" />
            </>
          )}
          <Link
            href="/arena"
            className="city__sign city__sign--arena"
            style={{ left: ARENA_SIGN.x, top: ARENA_SIGN.y }}
          >
            {ARENA_SIGN.text}
          </Link>
          {city.plots.map((plot, i) => (
            <div
              key={i}
              className="city__plot"
              role="img"
              aria-label="An empty plot, where a new guild can build"
              title="An empty plot: a new guild can build here"
            >
              {flat ? (
                <Picture name={`plot-${i}`} segments={plot.segments} box={plot.box} defs={defs} />
              ) : (
                <Part part={plot} />
              )}
            </div>
          ))}
          {(Object.keys(city.places) as PlaceId[]).map((id) => {
            const plaque = PLAQUES[id];
            const resident = residents.get(id);
            return (
              <Link
                key={id}
                href={PLACE_PATHS[id]}
                onClick={walkTo(id, PLACE_PATHS[id])}
                className={`city__place city__place--${id}${lit.includes(id) ? ' city__place--lit' : ''}`}
                aria-label={`${resident?.place ?? plaque.title}: ${resident?.tagline ?? PLACE_LABELS[id]}`}
              >
                {flat ? (
                  <>
                    {/* The glow only shows when a road step lights the lamp; a touch can't hover. */}
                    {lit.includes(id) && (
                      <Picture
                        name={`glow-${id}`}
                        segments={[
                          `<g filter="url(#wm-glow)">${city.places[id].segments
                            .map((s) => (typeof s === 'string' ? s : s.svg))
                            .join('')}</g>`,
                        ]}
                        box={city.places[id].box}
                        defs={defs}
                        className="city__glow"
                      />
                    )}
                    <Picture
                      name={`place-${id}`}
                      segments={city.places[id].segments}
                      box={city.places[id].box}
                      defs={defs}
                    />
                    {/* The same shapes, unseen and unfiltered, so a tap lands on the building
                        itself and never on the empty corner of its picture. */}
                    <Still
                      svg={unfiltered(
                        city.places[id].segments
                          .map((s) => (typeof s === 'string' ? s : s.svg))
                          .join(''),
                      )}
                      box={city.places[id].box}
                      className="city__part city__hit"
                    />
                  </>
                ) : (
                  <>
                    <Glow part={city.places[id]} />
                    <Part part={city.places[id]} />
                  </>
                )}
                <h2
                  className={`city__plaque${plaque.small ? ' city__plaque--small' : ''}`}
                  style={{ left: plaque.x, top: plaque.y, width: plaque.width }}
                >
                  {resident?.place ?? plaque.title}
                  {id === 'caravanserai' && (
                    <span className="city__plaque-sub" lang="ar" dir="rtl">
                      الخان
                    </span>
                  )}
                </h2>
              </Link>
            );
          })}
          {event && <Bunting name={event.name} colors={event.colors} />}
          {friends.slice(0, FRIEND_SPOTS.length).map((f, i) => {
            const spot = FRIEND_SPOTS[i] as (typeof FRIEND_SPOTS)[number];
            return (
              <Link
                key={f.id}
                href={visitPath(f.id)}
                className="city__friend"
                aria-label={`${f.name}, a friend: visit their house`}
                style={{
                  left: spot.x - (AVATAR_BOX.width / 2) * FRIEND_SCALE,
                  top: spot.feetY - AVATAR_BOX.feetY * FRIEND_SCALE,
                }}
              >
                <Avatar
                  look={f.look}
                  shadow
                  width={AVATAR_BOX.width * FRIEND_SCALE}
                  height={(AVATAR_BOX.height + 10) * FRIEND_SCALE}
                />
                <span className="city__friend-name">{f.name}</span>
              </Link>
            );
          })}
          <div className="city__avatar" role="img" aria-label="Your character">
            {flat ? (
              <Picture
                name="avatar"
                segments={city.avatar.segments}
                box={city.avatar.box}
                defs={defs}
              />
            ) : (
              <Part part={city.avatar} />
            )}
            <Avatar
              look={look}
              shadow={false}
              className={`city__figure${walk ? ' city__figure--walking' : ''}`}
              width={AVATAR_BOX.width * AVATAR_SPOT.scale}
              height={(AVATAR_BOX.height + 10) * AVATAR_SPOT.scale}
              style={{
                left: AVATAR_SPOT.x - (AVATAR_BOX.width / 2) * AVATAR_SPOT.scale,
                top: AVATAR_SPOT.feetY - AVATAR_BOX.feetY * AVATAR_SPOT.scale,
                ...(walk && { transform: `translate(${walk.dx}px, ${walk.dy}px)` }),
              }}
            />
          </div>
          <div className="city__front">
            {flat ? (
              <Picture
                name="front"
                segments={city.layers.front}
                box={FULL_STAGE}
                defs={defs}
                className="city__layer"
              />
            ) : (
              <Segments segments={city.layers.front} box={FULL_STAGE} className="city__layer" />
            )}
          </div>
        </div>
      </div>
      {pan && (
        <nav className="city__dock" aria-label="Places">
          {(Object.keys(city.places) as PlaceId[]).map((id) => (
            <Link
              key={id}
              href={PLACE_PATHS[id]}
              className="city__dockitem"
              style={{ borderTopColor: residents.get(id)?.guildColor }}
              aria-label={DOCK_BREAKS[id] ? PLAQUES[id].title : undefined}
            >
              {DOCK_BREAKS[id] ?? DOCK_LABELS[id] ?? residents.get(id)?.place ?? PLAQUES[id].title}
            </Link>
          ))}
        </nav>
      )}
      <div className="city__overlay">{children}</div>
    </main>
  );
}
