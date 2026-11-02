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
  const letters = pack('arabic/letters.json').items.map(
    (i) => i.data as { letter: string; connectsForward: boolean },
  );

  it('has the 28 letters in alphabetical order', () => {
    expect(letters.map((l) => l.letter).join('')).toBe('ابتثجحخدذرزسشصضطظعغفقكلمنهوي');
  });

  it('marks exactly ا د ذ ر ز و as not connecting forward', () => {
    expect(
      letters
        .filter((l) => !l.connectsForward)
        .map((l) => l.letter)
        .join(' '),
    ).toBe('ا د ذ ر ز و');
  });
});
