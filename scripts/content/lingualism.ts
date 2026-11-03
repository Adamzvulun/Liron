// Turns the Lingualism Palestinian Colloquial Arabic Vocabulary deck into a content pack
// (issue #23 and #44, ADR 0023). The deck is copyrighted: the pack and its audio go only to
// Supabase, behind login (ADR 0011), never into content/ or the site.
import type { ContentPack } from '../../src/core/content/schema.ts';
import { readApkg } from './apkg.ts';

export const LINGUALISM_APKG =
  'sources/arabic/lingualism-palestinian-vocabulary/lingualism-pcav.apkg';
export const SOURCE = 'lingualism-pcav';
const LEVELS = new Set(['A1', 'A2', 'B1', 'B2']);

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Anki fields are HTML: strip tags, decode entities, collapse whitespace (e.g. line breaks). */
export function cleanField(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
        return String.fromCodePoint(code);
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

export interface PrivateBuild {
  pack: ContentPack;
  /** Storage path (inside the private-media bucket) → file bytes. */
  media: Map<string, Buffer>;
}

/** Note fields, in the deck's order: Order, Arabic, Pronunciation, English, Audio, Section. */
export async function buildLingualism(apkgPath = LINGUALISM_APKG): Promise<PrivateBuild> {
  const deck = await readApkg(apkgPath);
  const media = new Map<string, Buffer>();
  const sections = new Map<string, { title: string; items: string[] }>();
  const items = deck.notes.map((note) => {
    const [order = '', arabic = '', pronunciation = '', english = '', audio = '', section = ''] =
      note.fields.map(cleanField);
    const id = `pcav:${order}`;
    const sound = /\[sound:([^\]]+)\]/.exec(audio)?.[1];
    const file = sound ? deck.media.get(sound) : undefined;
    if (!sound || !file) throw new Error(`${id}: audio ${audio || '(none)'} not found in the deck`);
    const path = `${SOURCE}/${sound}`;
    media.set(path, file);
    const [, num = '', title = ''] = /^(\d+)\s+(.*)$/.exec(section) ?? [];
    if (!num) throw new Error(`${id}: unexpected section "${section}"`);
    const s = sections.get(num) ?? { title, items: [] };
    s.items.push(id);
    sections.set(num, s);
    const level = note.tags.find((t) => LEVELS.has(t));
    return {
      id,
      subject: 'arabic',
      type: 'vocab',
      data: { order: Number(order), arabic, pronunciation, english, section: Number(num) },
      media: [{ kind: 'audio' as const, store: 'private' as const, path }],
      tags: [...(level ? [level] : []), `section:${num}`],
    };
  });
  const lessons = [...sections].map(([num, s]) => ({
    id: `pcav-section:${num}`,
    subject: 'arabic',
    title: s.title,
    order: Number(num),
    items: s.items,
    tags: ['lingualism'],
  }));
  return {
    pack: {
      subject: 'arabic',
      source: SOURCE,
      license: 'Copyrighted (Lingualism); bought by Adam for personal use; private',
      items,
      lessons,
    },
    media,
  };
}
