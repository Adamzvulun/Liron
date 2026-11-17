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

/**
 * A pack's version, in two small requests (#124): how many items and lessons it has, and when
 * each last changed. Any upload that adds, removes or changes a row changes it.
 */
export async function privatePackVersion(
  client: SupabaseClient,
  subject: string,
  source: string,
): Promise<string> {
  const latest = async (table: 'content_items' | 'content_lessons'): Promise<string> => {
    const { data, count, error } = await client
      .from(table)
      .select('updated_at', { count: 'exact' })
      .eq('subject_id', subject)
      .eq('source', source)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw new Error(`Couldn't check ${source}: ${error.message}`);
    const at = (data?.[0] as { updated_at?: string } | undefined)?.updated_at;
    if (count === null || !at) throw new Error(`No version for ${source}`);
    return `${count}@${at}`;
  };
  const [items, lessons] = await Promise.all([
    latest('content_items'),
    latest('content_lessons').catch(() => '0'),
  ]);
  return `${items};${lessons}`;
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

/** Short-lived links to several private audio files in one request (#124). */
export async function privateMediaUrls(
  client: SupabaseClient,
  paths: readonly string[],
): Promise<Map<string, string>> {
  const { data, error } = await client.storage
    .from('private-media')
    .createSignedUrls([...paths], MEDIA_LINK_SECONDS);
  if (error || !data) throw new Error(`Couldn't open recordings: ${error?.message ?? 'no links'}`);
  return new Map(
    data.flatMap((d) => (d.path && d.signedUrl && !d.error ? [[d.path, d.signedUrl]] : [])),
  );
}

/** Where a subject's private content comes from: Supabase in the app, a fake in tests. */
export interface ContentSource {
  pack(subject: string, source: string): Promise<{ items: Item[]; lessons: Lesson[] }>;
  mediaUrl(path: string): Promise<string>;
  /** Several links in one request; a source without it is asked one path at a time. */
  mediaUrls?(paths: readonly string[]): Promise<Map<string, string>>;
}

/** Private content from Supabase, for the signed-in user (ADR 0011, ADR 0023). */
export function supabaseContent(client: SupabaseClient): ContentSource {
  return {
    pack: (subject, source) => loadPrivatePack(client, subject, source),
    mediaUrl: (path) => privateMediaUrl(client, path),
    mediaUrls: (paths) => privateMediaUrls(client, paths),
  };
}
