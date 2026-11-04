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
    await expect(page.getByText('Meet a letter · 1 of 8')).toBeVisible();
    await expect(page.getByText('Like א', { exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Its shapes' }).getByRole('listitem')).toHaveCount(
      4,
    );
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Like י', { exact: true })).toBeVisible();
    // Then lesson 1's vowel marks (#40): fatha, kasra, damma, each with its niqqud twin.
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Meet a vowel mark · 6 of 8')).toBeVisible();
    await expect(page.getByText(/fatḥa/)).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
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
    expect(saved.p_state.met).toHaveLength(8);
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

test.describe('the Caravanserai courtyard (#42, #43)', () => {
  test('the road’s milestones show your lessons, and the Painted Sign makes you a guest', async ({
    page,
  }) => {
    const calls: SubjectCall[] = [];
    const done = { lesson: 8, streak: 0, met: [], done: true, sessions: 20 };
    await signedIn(page, [], calls, done, WORDS);
    await page.goto('/caravanserai');
    await expect(page.getByRole('img', { name: '8 of 8 milestones lit' })).toBeAttached();
    await expect(page.getByLabel('Your standing in the house')).toContainText('Stranger');

    await page.getByRole('button', { name: /Read The Painted Sign/ }).click();
    await page.getByRole('button', { name: 'Read the sign' }).click();
    await expect(page.getByText(/^Read · 1 of /)).toBeVisible();
    for (let i = 0; i < 40; i++) {
      if (await page.getByText(/^\d+%$/).isVisible()) break;
      await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(page.getByText(/^\d+%$/)).toBeVisible();
    await expect.poll(() => calls.some((c) => c.rpc === 'save_subject_state')).toBe(true);
    const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
      p_state: { guest: boolean; sessions: number };
    };
    expect(saved.p_state.sessions).toBe(21);
    expect(typeof saved.p_state.guest).toBe('boolean');
  });

  test('the fountain is listening practice that doesn’t pass a lesson', async ({ page }) => {
    const calls: SubjectCall[] = [];
    const met = ['letter:alef', 'letter:beh', 'letter:teh', 'letter:noon', 'letter:yeh'];
    await signedIn(page, [], calls, { lesson: 1, streak: 1, met, done: false, sessions: 1 }, WORDS);
    await page.goto('/caravanserai');
    await page.getByRole('button', { name: /The fountain/ }).click();
    await page.getByRole('button', { name: 'Begin' }).click();
    for (let i = 0; i < 20; i++) {
      if (await page.getByText('Session done').isVisible()) break;
      await expect(page.getByText(/^Listen · \d+ of /)).toBeVisible();
      await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(page.getByText('Session done')).toBeVisible();
    await expect.poll(() => calls.some((c) => c.rpc === 'save_subject_state')).toBe(true);
    const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
      p_state: { lesson: number; streak: number };
    };
    expect(saved.p_state).toMatchObject({ lesson: 1, streak: 1 });
  });
});
