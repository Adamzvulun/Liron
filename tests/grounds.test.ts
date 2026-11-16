import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No blue backgrounds (#313, docs/design/grounds.md). The browser test samples the screens; this
// one reads the style sheets, so a blue ground can't come back in a screen the browser test
// doesn't visit. A background color is blue-led when blue beats red and green by more than 8.

/** Accents that are meant to be blue or teal: a guild's tint, a swatch, the shield's note. */
const ACCENTS = [
  'src/subjects/morse/send/send.css: rgba(46, 143, 163, 0.12)',
  'src/subjects/morse/send/send.css: rgba(46, 143, 163, 0.45)',
  'src/core/avatar/wardrobe.css: #5fc0d2',
  'src/core/avatar/wardrobe.css: #174e5a',
  'src/core/player/player.css: rgba(91, 143, 199, 0.18)',
];

function sheets(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sheets(join(dir, e.name))
      : e.name.endsWith('.css')
        ? [join(dir, e.name)]
        : [],
  );
}

function blueLed(line: string): string[] {
  const found: string[] = [];
  const check = (r: number, g: number, b: number, text: string) => {
    if (b > r + 8 && b > g + 8) found.push(text);
  };
  for (const m of line.matchAll(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})\b/gi)) {
    check(parseInt(m[1] ?? '', 16), parseInt(m[2] ?? '', 16), parseInt(m[3] ?? '', 16), m[0]);
  }
  for (const m of line.matchAll(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)[^)]*\)/g)) {
    check(Number(m[1]), Number(m[2]), Number(m[3]), m[0]);
  }
  return found;
}

describe('grounds', () => {
  it('no style sheet paints a background blue', () => {
    const blue: string[] = [];
    for (const file of sheets('src')) {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (!/background|gradient/.test(line)) continue;
        for (const color of blueLed(line)) blue.push(`${file}: ${color}`);
      }
    }
    expect(blue.filter((b) => !ACCENTS.includes(b))).toEqual([]);
  });

  it('the old night-blue page colors are gone', () => {
    const theme = readFileSync('src/core/theme.css', 'utf8');
    expect(theme).not.toMatch(/--night|--dusk/);
    for (const file of sheets('src')) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/var\(--(night|dusk)\)/);
    }
  });
});
