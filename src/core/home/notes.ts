import home from '../../../content/core/home.json' with { type: 'json' };

/**
 * The notes a visiting friend can leave at your letterbox (task 8.1, #469; the-home.md §13): a
 * fixed set, never free text (ADR 0043). Some are our own Arabic sentences and some are Morse
 * sign-offs, so a note is a little practice too. The database keeps the same ids
 * (`home_note_ids()`, supabase/tests/notes.test.ts).
 */
export interface Note {
  id: string;
  kind: 'arabic' | 'morse' | 'plain';
  /** The Arabic sentence or the Morse letters; none for a plain note. */
  text?: string;
  /** The Arabic in Latin letters. */
  latin?: string;
  english: string;
  /** Where the words come from: an own sentence or a Morse abbreviation. */
  from?: string;
}

export const NOTES: Note[] = home.items
  .filter((i) => i.type === 'home-note')
  .map((i) => ({ id: i.id.replace(/^note:/, ''), ...(i.data as Omit<Note, 'id'>) }));

const BY_ID = new Map(NOTES.map((n) => [n.id, n]));
export const noteById = (id: string) => BY_ID.get(id);

/** A note as one line of plain text, for a feed slip or a screen reader. */
export function noteLine(n: Note): string {
  if (n.kind === 'plain') return n.english;
  return `${n.text} (${n.english})`;
}
