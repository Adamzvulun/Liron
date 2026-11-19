// Uploads copyrighted content to Supabase (issue #23, ADR 0023): text into content_items and
// content_lessons, audio into the private-media bucket. Run by the "DB migrate" workflow after
// migrations, with the project's secret key; never in the browser.
//
//   node scripts/content/upload-private.ts --dry-run       # build and check only
//   SUPABASE_URL=… SUPABASE_SECRET_KEY=… node scripts/content/upload-private.ts
import { createClient } from '@supabase/supabase-js';
import { checkPack } from '../../src/core/content/schema.ts';
import { buildLingualism, type PrivateBuild } from './lingualism.ts';

/** Supabase's free plan has 1 GB of storage per project; keep well under it. */
export const STORAGE_BUDGET_BYTES = 500 * 1024 * 1024;
/** Audio uploads in flight at once. */
const UPLOAD_CONCURRENCY = 8;
const BUCKET = 'private-media';
const BATCH = 500;
/** Lesson ids as our packs make them, e.g. `pcav-section:3`: nothing a PostgREST filter would parse. */
const SAFE_LESSON_ID = /^[a-z0-9][a-z0-9:._-]*$/i;

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Builds every private pack and checks it. Throws with a readable reason if anything's wrong. */
export async function buildAll(): Promise<PrivateBuild[]> {
  const builds = [await buildLingualism()];
  let bytes = 0;
  for (const { pack, media } of builds) {
    const problems = checkPack(pack, { public: false });
    if (problems.length) throw new Error(`${pack.source}:\n  ${problems.join('\n  ')}`);
    for (const file of media.values()) bytes += file.length;
  }
  if (bytes > STORAGE_BUDGET_BYTES) {
    throw new Error(`Private media is ${mb(bytes)}, over the ${mb(STORAGE_BUDGET_BYTES)} budget.`);
  }
  console.log(`Built ${builds.length} pack(s); audio ${mb(bytes)} of ${mb(STORAGE_BUDGET_BYTES)}.`);
  return builds;
}

async function upload(builds: PrivateBuild[], url: string, key: string) {
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`${what}: ${error.message}`);
  };
  for (const { pack, media } of builds) {
    const items = pack.items.map((i) => ({
      subject_id: i.subject,
      item_id: i.id,
      source: pack.source,
      type: i.type,
      data: i.data,
      media: i.media,
      tags: i.tags,
    }));
    for (let i = 0; i < items.length; i += BATCH) {
      const { error } = await db.from('content_items').upsert(items.slice(i, i + BATCH));
      fail('Saving items', error);
    }
    const lessons = pack.lessons.map((l) => ({
      subject_id: l.subject,
      lesson_id: l.id,
      source: pack.source,
      title: l.title,
      position: l.order,
      items: l.items,
      tags: l.tags,
    }));
    fail('Saving lessons', (await db.from('content_lessons').upsert(lessons)).error);

    // Remove what the source no longer has.
    const keep = new Set(items.map((i) => i.item_id));
    const stale: string[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db
        .from('content_items')
        .select('item_id')
        .eq('subject_id', pack.subject)
        .eq('source', pack.source)
        // A fixed order, so the pages neither overlap nor skip a row.
        .order('item_id')
        .range(from, from + 999);
      fail('Listing items', error);
      for (const r of data ?? []) if (!keep.has(r.item_id as string)) stale.push(r.item_id);
      if (!data || data.length < 1000) break;
    }
    for (let i = 0; i < stale.length; i += BATCH) {
      const { error } = await db
        .from('content_items')
        .delete()
        .eq('subject_id', pack.subject)
        .in('item_id', stale.slice(i, i + BATCH));
      fail('Removing old items', error);
    }
    // Lesson ids go into a PostgREST filter, so only plain ids pass (security review L6). With no
    // lessons kept, `not in ()` would be malformed: remove the source's lessons outright instead.
    const keepLessons = lessons.map((l) => l.lesson_id);
    const odd = keepLessons.find((l) => !SAFE_LESSON_ID.test(l));
    if (odd !== undefined) throw new Error(`Lesson id "${odd}" has characters a filter can't hold`);
    const oldLessons = db
      .from('content_lessons')
      .delete()
      .eq('subject_id', pack.subject)
      .eq('source', pack.source);
    const { error: lessonError } = await (keepLessons.length
      ? oldLessons.not('lesson_id', 'in', `(${keepLessons.map((l) => `"${l}"`).join(',')})`)
      : oldLessons);
    fail('Removing old lessons', lessonError);

    // Upload only audio the bucket doesn't have yet (files never change once published).
    const folder = pack.source;
    const existing = new Set<string>();
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.storage.from(BUCKET).list(folder, { limit: 1000, offset });
      fail('Listing audio', error);
      for (const f of data ?? []) existing.add(`${folder}/${f.name}`);
      if (!data || data.length < 1000) break;
    }
    // A few uploads at a time: one by one, the first upload of the deck took about 26 minutes.
    const queue = [...media].filter(([path]) => !existing.has(path));
    let uploaded = 0;
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const [path, file] = next;
        const { error } = await db.storage
          .from(BUCKET)
          .upload(path, file, { contentType: 'audio/mpeg', upsert: false });
        fail(`Uploading ${path}`, error);
        if (++uploaded % 500 === 0) console.log(`  ${uploaded} audio files uploaded…`);
      }
    };
    await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker));
    console.log(
      `${pack.source}: ${items.length} items, ${lessons.length} lessons, ${stale.length} removed, ` +
        `${uploaded} new audio files (${existing.size} already there).`,
    );
  }
}

if (import.meta.main) {
  const builds = await buildAll();
  if (process.argv.includes('--dry-run')) process.exit(0);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY.');
  await upload(builds, url, key);
}
