import { expect, test, type Page } from '@playwright/test';
import { lettersOf } from '../src/subjects/arabic/letters.ts';
import { inHebrewVowelled } from '../src/subjects/arabic/marks.ts';
import { lessonWord, listenForAudio, played, signedIn, type SubjectCall } from './fake-supabase.ts';

// Review item 7: earlier flows clicked the first choice and accepted any outcome. These answer
// on purpose, right or wrong, so the 90%-twice-on-different-days gate is checked end to end.

// Everyday words made of lesson 1's letters (ا ب ت ن ي), shaped like the deck's rows.
const WORDS = [
  lessonWord(1, 'بيت', 'house'),
  lessonWord(2, 'تين', 'figs'),
  lessonWord(3, 'أنا', 'I'),
  lessonWord(4, 'بنت', 'girl'),
  lessonWord(5, 'نبي', 'prophet'),
  lessonWord(6, 'يابا', 'dad'),
  lessonWord(7, 'بنّ', 'coffee beans'),
  lessonWord(8, 'تبن', 'hay'),
  lessonWord(9, 'باب', 'door'),
  lessonWord(10, 'بابا', 'pope'),
  lessonWord(11, 'تيت', 'aunt'),
  lessonWord(12, 'نت', 'internet'),
];
const byPath = new Map(
  WORDS.map((w) => [(w.media[0] as { path: string }).path, (w.data as { arabic: string }).arabic]),
);

/** Lesson 1 with every card met, so the scribe's table opens on "Practise". */
const MET = [
  'letter:alef',
  'letter:beh',
  'letter:teh',
  'letter:noon',
  'letter:yeh',
  'mark:fatha',
  'mark:kasra',
  'mark:damma',
];
const START = { lesson: 1, streak: 0, met: MET, done: false, sessions: 1 };

const nfc = (s: string) => s.normalize('NFC');

/** Waits for recording number `n` (from 0) to play and returns its path. */
async function nthPlayed(page: Page, n: number): Promise<string> {
  await expect.poll(async () => (await played(page)).length).toBeGreaterThan(n);
  return (await played(page))[n] ?? '';
}

/**
 * The right choice for the question on screen: from the word heard, or the word shown. Every
 * question plays its word once (a Listen question as it opens, a Read one once answered), so
 * recording `n` belongs to question `n`.
 */
async function rightChoice(page: Page, n: number): Promise<string> {
  const kicker = (await page.locator('.arabic__question .lesson__kicker').textContent()) ?? '';
  if (kicker.startsWith('Listen')) {
    const path = await nthPlayed(page, n);
    const word = byPath.get(path);
    if (!word) throw new Error(`played ${path}, not a test word`);
    return lettersOf(word)?.[0]?.letter ?? '';
  }
  // Lesson 1 reads in Hebrew with its marks: the answer spells the shown word.
  const shown = (await page.locator('.arabic__word').textContent()) ?? '';
  return nfc(inHebrewVowelled(shown) ?? '');
}

/** Plays one practice session, answering every question right or every one wrong. */
async function session(page: Page, right: boolean) {
  const first = (await played(page)).length;
  await page.getByRole('button', { name: 'Practise', exact: true }).click();
  for (let i = 0; i < 30; i++) {
    if (await page.getByText('Session done').isVisible()) return;
    await expect(page.locator('.arabic__question')).toBeVisible();
    const want = await rightChoice(page, first + i);
    const buttons = page.getByRole('group', { name: 'Choices' }).getByRole('button');
    const labels = (await buttons.allTextContents()).map(nfc);
    const index = right ? labels.indexOf(want) : labels.findIndex((l) => l !== want);
    expect(index, `"${want}" among ${labels.join(', ')}`).toBeGreaterThanOrEqual(0);
    await buttons.nth(index).click();
    await expect(page.getByText(right ? 'Right!' : 'Not quite.')).toBeVisible();
    await nthPlayed(page, first + i);
    await page.getByRole('button', { name: 'Next' }).click();
  }
  throw new Error('the session never ended');
}

/** The last saved state, or undefined until the first save arrives (polls wait for it). */
function lastState(calls: SubjectCall[]) {
  const saves = calls.filter((c) => c.rpc === 'save_subject_state');
  return (saves.at(-1)?.args as { p_state: Record<string, unknown> } | undefined)?.p_state;
}

test.describe('the scribe’s table: passing and failing (review item 7)', () => {
  test('90% twice on different days passes the lesson; twice on one day doesn’t', async ({
    page,
  }) => {
    const calls: SubjectCall[] = [];
    await listenForAudio(page);
    await page.clock.setFixedTime(new Date('2026-11-02T10:00:00'));
    await signedIn(page, [], calls, START, WORDS);
    await page.goto('/caravanserai');
    await page.getByRole('button', { name: /The scribe’s table/ }).click();

    // Day 1: all right. One pass counted, not yet the lesson.
    await session(page, true);
    await expect(page.locator('.arabic__pct')).toHaveText('100%');
    await expect(page.getByText(/one more like this on another day/)).toBeVisible();
    await expect.poll(() => lastState(calls)?.streak).toBe(1);

    // Same day again: still one, and it says to come back tomorrow.
    await page.reload();
    await page.getByRole('button', { name: /The scribe’s table/ }).click();
    await expect(page.getByText('(you have 1 of 2)')).toBeVisible();
    await session(page, true);
    await expect(page.getByText(/Come back tomorrow/)).toBeVisible();
    await expect.poll(() => lastState(calls)?.sessions).toBe(3);
    expect(lastState(calls)).toMatchObject({ lesson: 1, streak: 1 });

    // The next day: the lesson is passed and lesson 2 is next.
    await page.clock.setFixedTime(new Date('2026-11-03T10:00:00'));
    await page.reload();
    await page.getByRole('button', { name: /The scribe’s table/ }).click();
    await session(page, true);
    await expect(page.getByText(/^Lesson passed! Next: lesson 2/)).toBeVisible();
    await expect.poll(() => lastState(calls)?.lesson).toBe(2);
    expect(lastState(calls)).toMatchObject({ streak: 0, passDay: null });

    // Reloaded, the table opens on lesson 2's first new letter.
    await page.reload();
    await page.getByRole('button', { name: /The scribe’s table/ }).click();
    await expect(page.getByText(/^Meet a letter · 1 of /)).toBeVisible();
  });

  test('a failed session resets the count and doesn’t pass the lesson', async ({ page }) => {
    const calls: SubjectCall[] = [];
    await listenForAudio(page);
    await page.clock.setFixedTime(new Date('2026-11-03T10:00:00'));
    // One good session yesterday: a second one today would pass.
    await signedIn(page, [], calls, { ...START, streak: 1, passDay: '2026-11-02' }, WORDS);
    await page.goto('/caravanserai');
    await page.getByRole('button', { name: /The scribe’s table/ }).click();
    await expect(page.getByText('(you have 1 of 2)')).toBeVisible();

    await session(page, false);
    await expect(page.locator('.arabic__pct')).toHaveText('0%');
    await expect(
      page.getByText('Under 90% this time. Another session will sharpen it.'),
    ).toBeVisible();
    await expect(page.getByText('Listen again for:')).toBeVisible();
    await expect.poll(() => lastState(calls)?.sessions).toBe(2);
    expect(lastState(calls)).toMatchObject({ lesson: 1, streak: 0, passDay: null });

    // Reloaded, the count is back to zero.
    await page.reload();
    await page.getByRole('button', { name: /The scribe’s table/ }).click();
    await expect(page.getByRole('button', { name: 'Practise', exact: true })).toBeVisible();
    await expect(page.getByText(/you have \d of 2/)).toHaveCount(0);
  });
});
