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
