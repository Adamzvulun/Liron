// The content format (issue #23, ADR 0023): one schema for items, lessons and media, used by
// every subject. Content is data (CLAUDE.md). Each subject owns the shape of its items' `data`.
import { z } from 'zod';
import { SUBJECT_ID } from '../subject.ts';

/** Ids are stable forever: progress and reviews point at them. Example: `char:K`, `pcav:0003`. */
export const ContentId = z
  .string()
  .regex(/^[a-z0-9][a-z0-9:._-]{0,127}$/i, 'letters, digits and : . _ - only, up to 128');

export const SubjectId = z.string().regex(SUBJECT_ID);

/**
 * Where a media file lives:
 * - `public`: a file we may publish, under `public/` and served with the site;
 * - `private`: copyrighted, in Supabase Storage, readable only after login (ADR 0011).
 */
export const Media = z.object({
  kind: z.enum(['audio', 'image']),
  store: z.enum(['public', 'private']),
  path: z
    .string()
    .regex(/^[a-z0-9][a-z0-9/._-]*$/i)
    .max(256),
});

export const Item = z.object({
  id: ContentId,
  subject: SubjectId,
  /** The subject's own item type, e.g. `morse-char`, `arabic-letter`, `phrase`. */
  type: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/),
  /** The subject's own fields. The subject validates them further. */
  data: z.record(z.string(), z.unknown()),
  media: z.array(Media).default([]),
  tags: z.array(z.string().min(1).max(40)).default([]),
});

export const Lesson = z.object({
  id: ContentId,
  subject: SubjectId,
  title: z.string().min(1).max(120),
  /** Position in the subject's path; lessons run in this order. */
  order: z.number().int().nonnegative(),
  items: z.array(ContentId).min(1),
  tags: z.array(z.string().min(1).max(40)).default([]),
});

/** One file of content: everything from one source for one subject. */
export const ContentPack = z.object({
  subject: SubjectId,
  /** Where it came from, e.g. `waymark` (our own) or `lingualism-pcav`. */
  source: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/),
  /** Licence or terms, in a few words. */
  license: z.string().min(1).max(200),
  items: z.array(Item),
  lessons: z.array(Lesson).default([]),
});

export type Media = z.infer<typeof Media>;
export type Item = z.infer<typeof Item>;
export type Lesson = z.infer<typeof Lesson>;
export type ContentPack = z.infer<typeof ContentPack>;

/**
 * Validates a pack: the schema, plus rules across records. Every item and lesson belongs to the
 * pack's subject, ids are unique, lessons point at items that exist, and a pack meant for the
 * public site has no private media. Returns readable problems (empty when valid).
 */
export function checkPack(input: unknown, { public: isPublic }: { public: boolean }): string[] {
  const parsed = ContentPack.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join('.') || '(pack)'}: ${i.message}`);
  }
  const pack = parsed.data;
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const item of pack.items) {
    if (item.subject !== pack.subject)
      problems.push(`item ${item.id}: subject is not ${pack.subject}`);
    if (ids.has(item.id)) problems.push(`item ${item.id}: id used twice`);
    ids.add(item.id);
    if (isPublic && item.media.some((m) => m.store === 'private')) {
      problems.push(`item ${item.id}: private media can't be in public content`);
    }
  }
  const lessonIds = new Set<string>();
  for (const lesson of pack.lessons) {
    if (lesson.subject !== pack.subject)
      problems.push(`lesson ${lesson.id}: subject is not ${pack.subject}`);
    if (lessonIds.has(lesson.id)) problems.push(`lesson ${lesson.id}: id used twice`);
    lessonIds.add(lesson.id);
    for (const ref of lesson.items) {
      if (!ids.has(ref)) problems.push(`lesson ${lesson.id}: no item ${ref}`);
    }
  }
  return problems;
}
