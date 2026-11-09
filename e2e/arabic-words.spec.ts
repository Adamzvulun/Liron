import { expect, test } from '@playwright/test';
import { deckWord, signedIn, type SubjectCall } from './fake-supabase.ts';
import pack from '../content/arabic/core-words.json' with { type: 'json' };

// The innkeeper's table (#160): the word path's first chapter, with deck-like rows under the
// ids of content/arabic/core-words.json (everyday words, not the deck's own).
const FIRST = (pack.items[0]?.data.words ?? []).slice(0, 8);
const ARABIC = ['نعم', 'لا', 'شكرا', 'عفوا', 'آسف', 'مرحبا', 'صباح', 'أهلا'];
const WORDS = FIRST.map((w, i) => ({
  ...deckWord(i + 1, ARABIC[i] ?? 'كلمة', w.gloss),
  item_id: w.deck,
}));
// A sentence for the first grammar card (content/arabic/grammar.json), also not the deck's own.
const READY = { ...deckWord(9, 'أنا جاهز!', 'I’m ready!'), item_id: 'pcav:4703' };
const ROWS = [...WORDS, READY];
const GUEST = { lesson: 8, done: true, guest: true };

test.describe('Arabic word lessons (#160)', () => {
  test('are locked until the Painted Sign is passed', async ({ page }) => {
    await signedIn(page, [], [], { lesson: 3 }, WORDS);
    await page.goto('/caravanserai');
    await expect(
      page.getByText('Words · pass the Painted Sign').filter({ visible: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /The innkeeper’s table/ }).filter({ visible: true }),
    ).toHaveCount(0);
  });

  test('meet new words, practice them, and the session is saved', async ({ page }) => {
    const calls: SubjectCall[] = [];
    await signedIn(page, [], calls, GUEST, ROWS);
    await page.goto('/caravanserai');
    await page
      .getByRole('button', { name: /The innkeeper’s table/ })
      .filter({ visible: true })
      .click();
    await expect(page.getByRole('heading', { name: 'Hello, me and you' })).toBeVisible();
    await page.goto('/caravanserai?open=words&run=short');
    await page.getByRole('button', { name: 'Start a session' }).click();

    // The chapter's grammar card comes first (#162), with its deck sentence.
    await expect(page.getByRole('heading', { name: 'No word for “is”' })).toBeVisible();
    await expect(page.getByText('I’m ready!')).toBeVisible();
    await page.getByRole('button', { name: 'Got it' }).click();

    // Meet: the chapter's first 3 words, in teaching order, with our glosses.
    await expect(page.getByText('New word · 1 of 3')).toBeVisible();
    await expect(page.getByText(FIRST[0]?.gloss ?? '', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next word' }).click();
    await page.getByRole('button', { name: 'Next word' }).click();
    await page.getByRole('button', { name: 'Practice' }).click();

    // Practice: one question a word, answered with the first choice.
    for (let i = 0; i < 3; i++) {
      await expect(
        page.getByText(new RegExp(`^(Listen|Read|Recall) · ${i + 1} of 3$`)),
      ).toBeVisible();
      await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(page.getByText('The innkeeper’s table · done')).toBeVisible();

    await expect.poll(() => calls.some((c) => c.rpc === 'save_subject_state')).toBe(true);
    const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
      p_state: { words: { met: string[]; sessions: number; cards: string[] } };
    };
    expect(saved.p_state.words.cards).toEqual(['grammar:no-is']);
    expect(saved.p_state.words.met.sort()).toEqual(
      FIRST.slice(0, 3)
        .map((w) => w.deck)
        .sort(),
    );
    expect(saved.p_state.words.sessions).toBe(1);
    const reviewed = calls
      .filter((c) => c.rpc === 'record_review')
      .map((c) => (c.args as { p_item: string }).p_item);
    expect(reviewed.sort()).toEqual(
      FIRST.slice(0, 3)
        .map((w) => `word:${w.deck}`)
        .sort(),
    );
  });

  test('keep the grammar cards you have read in a book', async ({ page }) => {
    const state = { ...GUEST, words: { chapter: 1, cards: ['grammar:no-is'] } };
    await signedIn(page, [], [], state, ROWS);
    await page.goto('/caravanserai?open=words');
    await page.getByRole('button', { name: 'Grammar book · 1' }).click();
    await page.getByRole('button', { name: /No word for “is”/ }).click();
    await expect(page.getByText('I’m ready!')).toBeVisible();
    await page.getByRole('button', { name: 'Back to the book' }).click();
    await page.getByRole('button', { name: 'Back to the table' }).click();
    // Read already: a session goes straight to the new words.
    await page.getByRole('button', { name: 'Start a session' }).click();
    await expect(page.getByText(/^New word · 1 of/)).toBeVisible();
  });
});
