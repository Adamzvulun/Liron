import { expect, test } from './fixtures.ts';
import { lessonWord, signedIn, type SaveSessionArgs } from './fake-supabase.ts';
import { SLATE_IDS } from '../../src/subjects/arabic/ranks.ts';
import { REVIEWS } from '../../src/subjects/arabic/words.ts';

// Spell it at the slate (#519): words of lesson 1's letters, shaped like the deck's rows.
const WORDS = [
  ['بيت', 'house'],
  ['تين', 'figs'],
  ['أنا', 'I'],
  ['بنت', 'girl'],
  ['نبي', 'prophet'],
  ['يابا', 'dad'],
  ['تبن', 'hay'],
  ['باب', 'door'],
  ['بابا', 'pope'],
] as const;
const ROWS = WORDS.map(([arabic, english], i) => lessonWord(i + 1, arabic, english));
const ALL_MET = { lesson: 8, done: true, met: SLATE_IDS, sessions: 9 };
// A reviewed lesson shows our own gloss, not the row's English.
const GLOSSES = REVIEWS.find((r) => r.lesson === 1)?.words ?? [];
const arabicOf = (meaning: string) => {
  const i = GLOSSES.findIndex((w) => w.gloss === meaning);
  return WORDS[i]?.[0] ?? '';
};

test.describe('Spell it (#519)', () => {
  test('is offered only once every letter is met', async ({ page }) => {
    await signedIn(page, [], [], { lesson: 1, met: SLATE_IDS.slice(0, 5), sessions: 1 }, ROWS);
    await page.goto('/caravanserai?open=write');
    await expect(page.getByRole('heading', { name: 'Trace the letter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Spell it' })).toHaveCount(0);
  });

  test('a round: marks dropped, a wrong try shows the letters, a second the whole word', async ({
    page,
  }, testInfo) => {
    const sent: SaveSessionArgs[] = [];
    page.on('request', (r) => {
      if (r.url().endsWith('/rpc/save_session')) sent.push(r.postDataJSON() as SaveSessionArgs);
    });
    await signedIn(page, [], [], ALL_MET, ROWS);
    await page.goto('/caravanserai?open=write');
    await page.getByRole('button', { name: 'Spell it' }).click();
    const box = page.getByRole('textbox', { name: 'Your spelling, in Arabic' });
    const meaning = async () =>
      ((await page.getByRole('heading', { level: 2 }).textContent()) ?? '').replace(
        /^Spell “|”$/g,
        '',
      );

    // Word 1: a wrong letter, on the on-screen keyboard; the right spelling appears, marked.
    const first = arabicOf(await meaning());
    const wrong = first.replace(/^./, first.startsWith('ب') ? 'ت' : 'ب');
    const keys = page.getByRole('group', { name: 'Arabic keyboard' });
    for (const c of wrong) await keys.getByRole('button', { name: c, exact: true }).click();
    await expect(box).toHaveValue(wrong);
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(
      page.getByText('Not quite. Here is the spelling, letter by letter.'),
    ).toBeVisible();
    await expect(page.getByLabel('The right spelling')).toBeVisible();
    await expect(page.locator('.arabic__spell-wrong')).not.toHaveCount(0);
    await page.screenshot({
      fullPage: true,
      path: process.env.SPELL_SHOTS
        ? `${process.env.SPELL_SHOTS}/wrong.png`
        : testInfo.outputPath('wrong.png'),
    });
    // The page fits the phone.
    const width = page.viewportSize()?.width ?? 0;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    // Second try, right: Hard.
    await box.fill(first);
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText('Right this time.')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();

    // Word 2: wrong twice shows it in full.
    const second = arabicOf(await meaning());
    await box.fill('ككك');
    await page.getByRole('button', { name: 'Check' }).click();
    await box.fill('ككك');
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText('Not this time. Here it is.')).toBeVisible();
    await expect(page.locator('.arabic__spell-full')).toHaveText(second);
    await page.screenshot({
      fullPage: true,
      path: process.env.SPELL_SHOTS
        ? `${process.env.SPELL_SHOTS}/full.png`
        : testInfo.outputPath('full.png'),
    });
    await page.getByRole('button', { name: 'Next' }).click();

    // The other six, right first time, on a keyboard of their own: a vowel mark doesn't matter.
    for (let i = 0; i < 6; i++) {
      await expect(page.getByText(`Spell it · word ${i + 3} of 8`)).toBeVisible();
      await box.fill(`${arabicOf(await meaning())}ٌ`);
      await page.getByRole('button', { name: 'Check' }).click();
      await expect(page.getByText('Right!')).toBeVisible();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(page.getByText('Spell it · done')).toBeVisible();
    await expect(page.getByText('7 / 8')).toBeVisible();

    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]?.p_events).toEqual([{ kind: 'spell-round', count: 1 }]);
    const reviews = sent[0]?.p_reviews ?? [];
    expect(reviews.map((r) => r.rating).sort()).toEqual([1, 2, 3, 3, 3, 3, 3, 3]);
    expect(reviews.every((r) => /^spell:pcav:/.test(String(r.item)))).toBe(true);
    const results = sent[0]?.p_results ?? [];
    expect(results.every((r) => r.skill === 'write')).toBe(true);
    expect(results.map((r) => r.score).sort()).toEqual([0, 0.5, 1, 1, 1, 1, 1, 1]);
  });
});
