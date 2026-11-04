import { expect, test } from '@playwright/test';
import { deckWord, signedIn, type SubjectCall } from './fake-supabase.ts';

// Everyday words made of lesson 1's letters (ا ب ت ن ي), shaped like the deck's rows.
const WORDS = [
  deckWord(1, 'بيت', 'house'),
  deckWord(2, 'تين', 'figs'),
  deckWord(3, 'أنا', 'I'),
  deckWord(4, 'بنت', 'girl'),
  deckWord(5, 'نبي', 'prophet'),
  deckWord(6, 'يابا', 'dad'),
  deckWord(7, 'بنّ', 'coffee beans'),
  deckWord(8, 'تبن', 'hay'),
  deckWord(9, 'باب', 'door'),
  deckWord(10, 'بابا', 'pope'),
  deckWord(11, 'تيت', 'aunt'),
  deckWord(12, 'نت', 'internet'),
];

test.describe('Arabic script lessons (#38–#41)', () => {
  test('meet the first letters, practise, and the session is saved', async ({ page }) => {
    const calls: SubjectCall[] = [];
    await signedIn(page, [], calls, null, WORDS);
    await page.goto('/caravanserai');
    await page.getByRole('button', { name: /The scribe’s table/ }).click();

    // Meet: each of lesson 1's five letters, with its Hebrew bridge and four shapes.
    await expect(page.getByText('Meet a letter · 1 of 5')).toBeVisible();
    await expect(page.getByText('Like א', { exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Its shapes' }).getByRole('listitem')).toHaveCount(
      4,
    );
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next letter' }).click();
    await expect(page.getByText('Like י', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Start practice' }).click();

    // Practice: answer every question (the first choice), then see the result.
    await expect(page.getByText(/^Listen · 1 of /)).toBeVisible();
    for (let i = 0; i < 30; i++) {
      if (await page.getByText('Session done').isVisible()) break;
      await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(page.getByText('Session done')).toBeVisible();
    await expect(page.getByText(/^\d+%$/)).toBeVisible();

    // Saved: the lesson's letters met, reviews for letters, ratings for listen and read.
    await expect.poll(() => calls.some((c) => c.rpc === 'record_progress')).toBe(true);
    const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
      p_state: { met: string[]; sessions: number };
    };
    expect(saved.p_state.met).toHaveLength(5);
    expect(saved.p_state.sessions).toBe(1);
    const reviewed = calls.filter((c) => c.rpc === 'record_review');
    expect(reviewed.length).toBeGreaterThan(0);
    const skills = new Set(
      calls
        .filter((c) => c.rpc === 'record_result')
        .map((c) => (c.args as { p_skill: string }).p_skill),
    );
    expect([...skills].sort()).toEqual(['listen', 'read']);
  });

  test('says so when the deck isn’t loaded', async ({ page }) => {
    await signedIn(page, [], [], null, []);
    await page.goto('/caravanserai?open=lesson');
    await expect(
      page.getByText('The deck’s words haven’t been loaded into Waymark yet.'),
    ).toBeVisible();
  });
});
