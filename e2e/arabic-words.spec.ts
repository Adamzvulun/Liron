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
const GUEST = { lesson: 8, done: true, guest: true, ranks: ['guest'] };

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
    // Asked for by address, the shut table says so on a parchment card, not bare on the wall.
    await page.goto('/caravanserai?open=words');
    const shut = page.getByText(/opens once you’re a guest of the house/);
    await expect(shut).toBeVisible();
    await expect(shut).toHaveCSS('border-top-style', 'solid');
    await expect(shut).not.toHaveCSS('background-image', 'none');
    // Centered like every other card, not against the back button's edge.
    const card = await shut.boundingBox();
    const width = page.viewportSize()?.width ?? 0;
    expect(Math.abs((card?.x ?? 0) * 2 + (card?.width ?? 0) - width)).toBeLessThan(4);
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
    // The word lessons sit at the innkeeper's table, painted up close (roadmap A6).
    await expect(page.locator('.hall-backdrop[data-hall="inn"] img')).toHaveJSProperty(
      'complete',
      true,
    );
    await page.getByRole('button', { name: 'Grammar book · 1' }).click();
    await page.getByRole('button', { name: /No word for “is”/ }).click();
    await expect(page.getByText('I’m ready!')).toBeVisible();
    await page.getByRole('button', { name: 'Back to the book' }).click();
    await page.getByRole('button', { name: 'Back to the table' }).click();
    // Read already: a session goes straight to the new words.
    await page.getByRole('button', { name: 'Start a session' }).click();
    await expect(page.getByText(/^New word · 1 of/)).toBeVisible();
  });

  test('a word with no deck sentence shows our own, text only (#164)', async ({ page }) => {
    const state = { ...GUEST, words: { chapter: 1, cards: ['grammar:no-is'] } };
    await signedIn(page, [], [], state, ROWS);
    await page.goto('/caravanserai?open=words');
    await page.getByRole('button', { name: 'Start a session' }).click();
    // The first three words have deck sentences; the fourth (“you’re welcome”) doesn’t.
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next word' }).click();
    await expect(page.getByText(/^New word · 4 of/)).toBeVisible();
    await expect(page.getByText('Our own sentence · no recording')).toBeVisible();
    await expect(page.getByText('Thank you! — You’re welcome.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play the sentence' })).toHaveCount(0);
  });

  test('a passed chapter opens its regular’s trial, and the attempt is saved (#161)', async ({
    page,
  }) => {
    const calls: SubjectCall[] = [];
    // Chapter 1 passed: Salim the carter's trial is ready. The fake deck has 8 of its words.
    const state = { ...GUEST, words: { chapter: 2, cards: ['grammar:no-is'] } };
    await signedIn(page, [], calls, state, ROWS);
    await page.goto('/caravanserai');
    await expect(
      page.getByRole('heading', { name: 'Chapter 2: The Carter’s Greeting' }).first(),
    ).toBeVisible();
    await page
      .getByRole('button', { name: /The Carter’s Roll Call/ })
      .filter({ visible: true })
      .click();
    await page.getByRole('button', { name: 'Begin the trial' }).click();

    // The trial asks one question a chapter word (8 in the fake deck), answered with the first
    // choice: the pass itself is covered by regulars.test.ts, this checks the screens and the save.
    for (let i = 0; i < FIRST.length; i++) {
      await expect(
        page.getByText(new RegExp(`^(Listen|Read|Recall) · ${i + 1} of ${FIRST.length}$`)),
      ).toBeVisible();
      await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(page.getByText(/The Carter’s Roll Call/).first()).toBeVisible();
    await expect.poll(() => calls.some((c) => c.rpc === 'save_subject_state')).toBe(true);
    const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
      p_state: { words: { chapter: number; trials?: number[] } };
    };
    // A trial never moves the word chapter; a pass adds road 2 to the trials.
    expect(saved.p_state.words.chapter).toBe(2);
    expect([[], [2]]).toContainEqual(saved.p_state.words.trials ?? []);
  });

  test('sentence-long choices stack on a phone, and a miss quotes the sentence (review, 2026-11-15)', async ({
    page,
  }) => {
    // Chapter 111 teaches whole sentences ("I’m going to the dentist’s for a check-up…").
    const ch = pack.items.find((c) => c.data.chapter === 111)?.data;
    const rows = (ch?.words ?? []).map((w, i) => ({
      ...deckWord(i + 1, `ما بسمع شو بحكوا، ممكن تعلّي الصوت شوي ${i + 1}`, w.gloss),
      item_id: w.deck,
    }));
    const state = { ...GUEST, words: { chapter: 111, cards: [] } };
    await signedIn(page, [], [], state, rows);
    await page.goto('/caravanserai?open=words&run=short');
    await page.getByRole('button', { name: 'Start a session' }).click();
    // Chapter 111's grammar card comes first, then the meet card sets a sentence-long word
    // smaller.
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(page.locator('.arabic__phrase-ar.is-long').first()).toHaveCSS('font-size', '26px');
    for (const name of ['Next word', 'Next word', 'Practice']) {
      await page.getByRole('button', { name, exact: true }).click();
    }
    for (let i = 0; i < 3; i++) {
      const choices = page.getByRole('group', { name: 'Choices' });
      await expect(choices).toBeVisible();
      await expect(choices).toHaveClass(/is-long/);
      {
        const columns = await choices.evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
        );
        expect(columns).toBe(test.info().project.name === 'phone' ? 1 : 2);
      }
      await choices.getByRole('button').first().click();
      // A sentence is quoted whole, with no second period after its own.
      await expect(page.locator('.arabic__feedback--word > p').first()).toHaveText(
        /^(Right!|Not quite: it was (“.+[.?!؟]”|[^“].*[^.?!]\.))$/,
      );
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
  });
});
