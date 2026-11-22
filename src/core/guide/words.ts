import { z } from 'zod';
import pack from '../../../content/core/guide.json' with { type: 'json' };

/** What a line of the welcome points at while it shows (the-guide.md §3.2). */
export const POINTS = ['compass', 'top-bar', 'places'] as const;
export type Point = (typeof POINTS)[number];

const Welcome = z.object({
  lines: z.array(z.object({ point: z.enum(POINTS), text: z.string().min(1) })).min(1),
  next: z.string().min(1),
  done: z.string().min(1),
  skip: z.string().min(1),
});

/** The guide's words (content/core/guide.json): content, not code. */
export const WELCOME = Welcome.parse(pack.items.find((i) => i.id === 'guide-welcome')?.data);

const Introductions = z.object({
  /** One line per introduction, by its id in `guide_seen` (seen.ts). */
  lines: z.record(z.string().regex(/^intro:[a-z-]+$/), z.string().min(1)),
  done: z.string().min(1),
});

/** Nour's line for each introduction (the-guide.md §3.3). */
export const INTRODUCTIONS = Introductions.parse(
  pack.items.find((i) => i.id === 'guide-introductions')?.data,
);

const Card = z.object({ title: z.string().min(1), text: z.string().min(1) });

/** The platform's places' first-visit cards (the-guide.md §3.4), by place. */
export const PLACE_CARDS = z
  .object({ board: Card, market: Card, house: Card, arena: Card })
  .parse(pack.items.find((i) => i.id === 'guide-cards')?.data);

const Chapter = z.object({
  id: z.string().regex(/^[a-z-]+$/),
  title: z.string().min(1),
  text: z.string().min(1),
  /** A place to go: Take me there. */
  place: z.enum(['board', 'market', 'house', 'arena']).optional(),
});

/** The Guidebook's own pages (the-guide.md §3.5); each guild adds its own. */
export const GUIDEBOOK = z
  .object({
    title: z.string().min(1),
    tour: z.string().min(1),
    go: z.string().min(1),
    chapters: z.array(Chapter).min(1),
  })
  .parse(pack.items.find((i) => i.id === 'guidebook')?.data);
