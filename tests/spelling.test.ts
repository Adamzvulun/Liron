// American spelling in everything a player sees (#126, CLAUDE.md): the app's text and content.
// Comments are skipped, and so are stored ids and keys (`hairColour`, the `grey` hair id),
// which players never see and saved profiles still use.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const BRITISH =
  /\b(practis(e|es|ed|ing)|travell(er|ers|ing|ed)|colour(s|ed|ful|ing)?|grey|centre[sd]?|favourite|honour|behaviour|armour|neighbour|flavour|jewellery|catalogue|theatre|metres?|realis(e|ed|ing)|organis(e|ed|ing)|recognis(e|ed|ing)|apologis(e|ed)|customis(e|ed|ing)|romanis(e|ed|ation)|cancell(ed|ing)|labell(ed|ing)|signall(er|ers|ing|ed)|towards|whilst|learnt|spelt|draughty?)\b/i;

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return files(p, ext);
    return ext.test(e.name) && !/\.test\.|\.d\.ts$/.test(e.name) ? [p] : [];
  });
}

/** The text a player could see: code without its comments, ids or keys. */
function visible(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ''))
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    .replace(/\b(id|hairColour): '[^']*'/g, '')
    .replace(/\baria-labelledby\b/g, '')
    .replace(/\b[a-z]+[A-Z]\w*|\b[A-Z][A-Z_]{2,}\b/g, ''); // camelCase and CONSTANT names
}

describe('American spelling (#126)', () => {
  it('is used in the app and its content', () => {
    const found: string[] = [];
    for (const f of [...files('src', /\.(tsx?|jsx?|css)$/), ...files('content', /\.json$/)]) {
      const text = f.endsWith('.json') ? readFileSync(f, 'utf8') : visible(readFileSync(f, 'utf8'));
      text.split('\n').forEach((line, i) => {
        const m = BRITISH.exec(line);
        if (m && !/"license"/.test(line)) found.push(`${f}:${i + 1} ${m[0]}`);
      });
    }
    expect(found).toEqual([]);
  });
});

describe('Typographic apostrophes (2026-11-15)', () => {
  it("are curly in what the app says: don’t, not don't", () => {
    const found: string[] = [];
    for (const f of files('src', /\.(tsx?|jsx?)$/)) {
      visible(readFileSync(f, 'utf8'))
        .split('\n')
        .forEach((line, i) => {
          // Thrown errors are for us, not the player.
          if (/\bnew \w*Error\(/.test(line)) return;
          const m = /[A-Za-z]'(s|t|re|ve|ll|d|m)\b/.exec(line);
          if (m) found.push(`${f}:${i + 1} ${line.trim()}`);
        });
    }
    for (const f of files('content', /\.json$/)) {
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          // The license notes and the deck's own Latin spelling are left as they are.
          if (/"(license|latin)":/.test(line)) return;
          const m = /[A-Za-z]'(s|t|re|ve|ll|d|m)\b/.exec(line);
          if (m) found.push(`${f}:${i + 1} ${line.trim()}`);
        });
    }
    expect(found).toEqual([]);
  });

  it('are curly around a quoted word in what a player reads: “no”, not "no", and … is one character', () => {
    const found: string[] = [];
    for (const f of files('content', /\.json$/)) {
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (
            /^\s*"(english|note|gloss|tip|meaning|title|text|intro|outro)": ".*(\\"|\.\.\.)/.test(
              line,
            )
          )
            found.push(`${f}:${i + 1} ${line.trim()}`);
        });
    }
    expect(found).toEqual([]);
  });
});
