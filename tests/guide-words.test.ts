import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { GuideChapter } from '../src/core/subject.ts';
import { fill } from '../src/core/guide/numbers.ts';
import { GUIDEBOOK, INTRODUCTIONS, PLACE_CARDS, WELCOME } from '../src/core/guide/words.ts';

// Every word the guide says, on one page for Adam to read in one go (#413). The page is made
// from the content, numbers filled in; this test fails when the two drift apart. To remake it:
// GUIDE_WORDS=write npx vitest run tests/guide-words.test.ts
// Each guild that writes a Guidebook chapter, in the order the city lists them.
const SUBJECTS = new URL('../src/subjects/', import.meta.url);
const GUILDS = ['morse', 'arabic'].filter((id) => existsSync(new URL(`${id}/guide.ts`, SUBJECTS)));
const PAGE = new URL('../docs/game/guide-words.md', import.meta.url);

async function page(): Promise<string> {
  const out: string[] = [
    '# Every word the guide says',
    '',
    'Made from `content/` by `tests/guide-words.test.ts`; edit the content, not this page. Numbers are filled in from the code. For Adam to read in one go (#413).',
    '',
    '## The welcome (§3.2)',
    '',
    ...WELCOME.lines.map((l, n) => `${n + 1}. ${l.text}`),
    '',
    `Buttons: ${WELCOME.next} · ${WELCOME.done} · ${WELCOME.skip}`,
    '',
    '## Introductions, one at a time (§3.3)',
    '',
    ...Object.entries(INTRODUCTIONS.lines).map(([id, text]) => `- **${id}:** ${text}`),
    '',
    `Button: ${INTRODUCTIONS.done}`,
    '',
    '## First-visit cards: places (§3.4)',
    '',
    ...Object.values(PLACE_CARDS).map((c) => `- **${c.title}:** ${c.text}`),
  ];
  const guilds = await Promise.all(
    GUILDS.map(async (id) => {
      const mod = (await import(`../src/subjects/${id}/guide.ts`)) as { chapter(): GuideChapter };
      return mod.chapter();
    }),
  );
  for (const g of guilds) {
    out.push('', `## First-visit cards and Guidebook chapter: ${g.title}`, '', g.text, '');
    for (const st of g.stations) out.push(`- **${st.title}:** ${st.text}`);
  }
  out.push('', `## The ${GUIDEBOOK.title} (§3.5)`, '');
  out.push(`Buttons: ${GUIDEBOOK.tour} · ${GUIDEBOOK.go}`);
  for (const c of GUIDEBOOK.chapters) out.push('', `### ${c.title}`, '', fill(c.text));
  return `${out.join('\n')}\n`;
}

describe('the guide’s words page (#413)', () => {
  it('has every guild that writes a chapter', () => {
    const all = readdirSync(SUBJECTS).filter((id) =>
      existsSync(new URL(`${id}/guide.ts`, SUBJECTS)),
    );
    expect([...GUILDS].sort()).toEqual(all.sort());
  });

  it('is up to date with the content', async () => {
    const made = await page();
    if (process.env.GUIDE_WORDS === 'write') writeFileSync(PAGE, made);
    expect(readFileSync(PAGE, 'utf8')).toBe(made);
  });

  it('speaks of the world, not the software', async () => {
    expect(await page()).not.toMatch(/\b(unlock\w*|features?|tap here|click here)\b/i);
  });
});
