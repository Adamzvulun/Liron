import type { SupabaseClient } from '@supabase/supabase-js';
import { Item, Lesson } from './schema.ts';

const PAGE = 1000; // PostgREST's default page size on Supabase

/**
 * Reads copyrighted content (ADR 0023) for a signed-in user: the items and lessons from one
 * source. Row-level security returns nothing to logged-out visitors.
 */
export async function loadPrivatePack(
  client: SupabaseClient,
  subject: string,
  source: string,
): Promise<{ items: Item[]; lessons: Lesson[] }> {
  const items: Item[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from('content_items')
      .select('item_id, type, data, media, tags')
      .eq('subject_id', subject)
      .eq('source', source)
      .order('item_id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Couldn't load ${source}: ${error.message}`);
    for (const r of data ?? []) {
      items.push(
        Item.parse({
          id: r.item_id,
          subject,
          type: r.type,
          data: r.data,
          media: r.media,
          tags: r.tags,
        }),
      );
    }
    if (!data || data.length < PAGE) break;
  }
  const { data, error } = await client
    .from('content_lessons')
    .select('lesson_id, title, position, items, tags')
    .eq('subject_id', subject)
    .eq('source', source)
    .order('position');
  if (error) throw new Error(`Couldn't load ${source} lessons: ${error.message}`);
  const lessons = (data ?? []).map((r) =>
    Lesson.parse({
      id: r.lesson_id,
      subject,
      title: r.title,
      order: r.position,
      items: r.items,
      tags: r.tags,
    }),
  );
  return { items, lessons };
}

/** How long a signed media link lives (security review L1: short, since a link is a bearer pass). */
export const MEDIA_LINK_SECONDS = 600;

/** A short-lived link to a private audio file, for an <audio> element. */
export async function privateMediaUrl(client: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await client.storage
    .from('private-media')
    .createSignedUrl(path, MEDIA_LINK_SECONDS);
  if (error || !data) throw new Error(`Couldn't open ${path}: ${error?.message ?? 'no link'}`);
  return data.signedUrl;
}

/** Where a subject's private content comes from: Supabase in the app, a fake in tests. */
export interface ContentSource {
  pack(subject: string, source: string): Promise<{ items: Item[]; lessons: Lesson[] }>;
  mediaUrl(path: string): Promise<string>;
}

/** Private content from Supabase, for the signed-in user (ADR 0011, ADR 0023). */
export function supabaseContent(client: SupabaseClient): ContentSource {
  return {
    pack: (subject, source) => loadPrivatePack(client, subject, source),
    mediaUrl: (path) => privateMediaUrl(client, path),
  };
}
