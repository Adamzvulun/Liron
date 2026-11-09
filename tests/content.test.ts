import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkPack, ContentPack } from '../src/core/content/schema.ts';

// Every file in content/ is validated on every test run (issue #23, ADR 0023).
const ROOT = join(import.meta.dirname, '..');
const CONTENT = join(ROOT, 'content');

function jsonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? jsonFiles(join(dir, e.name))
      : e.name.endsWith('.json')
        ? [join(dir, e.name)]
        : [],
  );
}
const load = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as unknown;
const pack = (path: string) => ContentPack.parse(load(join(CONTENT, path)));

describe('content/', () => {
  const files = jsonFiles(CONTENT);

  it('has content to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${relative(ROOT, file)} is a valid public pack in the right folder`, () => {
      const data = load(file);
      expect(checkPack(data, { public: true })).toEqual([]);
      expect(relative(CONTENT, file).split(/[\\/]/)[0]).toBe((data as { subject: string }).subject);
    });
  }
});

describe('checkPack', () => {
  const item = (id: string, extra: object = {}) => ({
    id,
    subject: 'morse',
    type: 'morse-char',
    data: {},
    ...extra,
  });
  const base = { subject: 'morse', source: 'waymark', license: 'Our own' };

  it('reports schema problems with their place', () => {
    expect(checkPack({ ...base, items: [item('bad id!')] }, { public: true })).toEqual([
      expect.stringMatching(/^items\.0\.id: /),
    ]);
  });

  it('catches repeated ids, foreign subjects and lessons pointing nowhere', () => {
    const problems = checkPack(
      {
        ...base,
        items: [item('a'), item('a'), item('b', { subject: 'arabic' })],
        lessons: [{ id: 'l1', subject: 'morse', title: 'One', order: 1, items: ['a', 'zzz'] }],
      },
      { public: true },
    );
    expect(problems).toEqual([
      'item a: id used twice',
      'item b: subject is not morse',
      'lesson l1: no item zzz',
    ]);
  });

  it('keeps private media out of public content, and allows it in private packs', () => {
    const p = {
      ...base,
      items: [item('a', { media: [{ kind: 'audio', store: 'private', path: 'x/a.mp3' }] })],
    };
    expect(checkPack(p, { public: true })).toEqual([
      "item a: private media can't be in public content",
    ]);
    expect(checkPack(p, { public: false })).toEqual([]);
  });
});

describe('Morse characters', () => {
  const morse = pack('morse/characters.json');
  const chars = morse.items.map((i) => i.data as { char: string; code: string });

  it('follows the LCWO Koch order: 41 characters (26 letters, 10 digits, 5 signs) from K M', () => {
    expect(chars.map((c) => c.char).join(' ')).toBe(
      'K M U R E S N A P T L W I . J Z = F O Y , V G 5 / Q 9 2 H 3 8 B ? 4 7 C 1 D 6 0 X',
    );
  });

  it('has a distinct dot-dash code for every character', () => {
    for (const c of chars) expect(c.code).toMatch(/^[.-]{1,6}$/);
    expect(new Set(chars.map((c) => c.code)).size).toBe(chars.length);
  });

  it('has one lesson per added character, each a superset of the last', () => {
    expect(morse.lessons).toHaveLength(40);
    expect(morse.lessons[0]?.items).toEqual(['char:K', 'char:M']);
    morse.lessons.forEach((l, i) => expect(l.items).toHaveLength(i + 2));
  });
});

describe('Arabic letters', () => {
  interface Letter {
    letter: string;
    connectsForward: boolean;
    alphabetPosition?: number;
    hebrew: string;
    sound: string;
    family: string;
    lesson: number;
  }
  const arabic = pack('arabic/letters.json');
  const all = arabic.items.map((i) => i.data as unknown as Letter);
  // The 28 letters of the alphabet; the extras (ة ء ى لا) have no alphabet position.
  const letters = all.filter((l) => l.alphabetPosition !== undefined);

  it('has the 28 letters in alphabetical order, then the 4 extras', () => {
    expect(letters.map((l) => l.letter).join('')).toBe('ابتثجحخدذرزسشصضطظعغفقكلمنهوي');
    expect(all.filter((l) => l.alphabetPosition === undefined).map((l) => l.letter)).toEqual([
      'ة',
      'ء',
      'ى',
      'لا',
    ]);
  });

  it('marks exactly ا د ذ ر ز و as not connecting forward', () => {
    expect(
      letters
        .filter((l) => !l.connectsForward)
        .map((l) => l.letter)
        .join(' '),
    ).toBe('ا د ذ ر ز و');
  });

  it('gives every letter a Hebrew bridge, a sound, a family and a lesson', () => {
    for (const l of all) {
      expect(l.hebrew).toMatch(/^[\u05D0-\u05EA׳ /]+$/);
      expect(l.sound.length).toBeGreaterThan(0);
      expect(l.family.length).toBeGreaterThan(0);
      expect(l.lesson).toBeGreaterThanOrEqual(1);
    }
  });

  it('teaches every letter in exactly one of the 8 script lessons, in order', () => {
    expect(arabic.lessons.map((l) => l.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const taught = arabic.lessons.flatMap((l) => l.items);
    expect(new Set(taught).size).toBe(taught.length);
    expect(taught.sort()).toEqual(arabic.items.map((i) => i.id).sort());
    for (const lesson of arabic.lessons) {
      for (const id of lesson.items) {
        const item = arabic.items.find((i) => i.id === id);
        expect((item?.data as unknown as Letter).lesson).toBe(lesson.order);
      }
    }
  });
});

describe('arabic/core-words.json (#159)', () => {
  const raw = readFileSync(join(CONTENT, 'arabic', 'core-words.json'), 'utf8');
  const chapters = pack('arabic/core-words.json').items.map(
    (i) =>
      i.data as { chapter: number; words: { deck: string; gloss: string; sentence?: string }[] },
  );

  it('is 10 chapters of 30 words, each deck word once', () => {
    expect(chapters.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(chapters.every((c) => c.words.length === 30)).toBe(true);
    const ids = chapters.flatMap((c) => c.words.map((w) => w.deck));
    expect(new Set(ids).size).toBe(300);
    expect(ids.every((id) => /^pcav:\d{4}$/.test(id))).toBe(true);
  });

  it('holds only ids and our glosses: no Arabic from the private deck (ADR 0011)', () => {
    expect(raw).not.toMatch(/[؀-ۿ]/);
    const words = chapters.flatMap((c) => c.words);
    expect(
      words.every((w) => w.gloss.length > 0 && /^pcav:\d{4}$/.test(w.sentence ?? 'pcav:0000')),
    ).toBe(true);
  });
});

describe('arabic/grammar.json (#162)', () => {
  const cards = pack('arabic/grammar.json').items.map(
    (i) => i.data as { chapter: number; examples: string[]; letters?: string; points: string[] },
  );

  it('points only at deck ids, and its text has no deck Arabic (ADR 0011)', () => {
    expect(cards.every((c) => c.examples.every((id) => /^pcav:\d{4}$/.test(id)))).toBe(true);
    // Only the sun letters' list is in Arabic: letters, not deck text.
    const text = JSON.stringify(cards.map((c) => ({ ...c, letters: undefined })));
    expect(text).not.toMatch(/[\u0600-\u06ff]/);
    expect(cards.every((c) => c.chapter >= 1 && c.chapter <= 10 && c.points.length > 0)).toBe(true);
  });
});
