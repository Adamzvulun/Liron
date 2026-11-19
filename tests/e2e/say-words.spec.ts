import { expect, test } from '@playwright/test';
import { deckWord, signedIn } from './fake-supabase.ts';
import pack from '../../content/arabic/core-words.json' with { type: 'json' };

// Say it yourself on the word path (#195), with Chromium's fake microphone (a beep) allowed
// without a prompt. Deck-like rows under the first chapter's ids, not the deck's own.
test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
});

const FIRST = (pack.items[0]?.data.words ?? []).slice(0, 4);
const ARABIC = ['نعم', 'لا', 'شكرا', 'عفوا'];
const ROWS = FIRST.map((w, i) => ({
  ...deckWord(i + 1, ARABIC[i] ?? 'كلمة', w.gloss),
  item_id: w.deck,
}));
const GUEST = {
  lesson: 8,
  done: true,
  guest: true,
  ranks: ['guest'],
  words: { chapter: 1, cards: ['grammar:no-is'], met: FIRST.map((w) => w.deck) },
};

test('after answering, you can say the word and hear yourself next to the speaker', async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && /understood/.test(r.url())) uploads.push(r.url());
  });
  await signedIn(page, [], [], GUEST, ROWS);
  await page.goto('/caravanserai?open=words&run=short');
  await page.getByRole('button', { name: 'Start a session' }).click();
  await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
  await page.getByRole('button', { name: 'Say it yourself' }).click();
  await page.getByRole('button', { name: '● Record yourself' }).click();
  await page.getByRole('button', { name: '■ Stop' }).click();
  await expect(page.getByRole('button', { name: '▶ You' })).toBeVisible();
  await expect(page.getByRole('button', { name: '▶ Speaker' })).toBeVisible();
  // The word path has no Groq check, and nothing is uploaded.
  await expect(page.getByRole('button', { name: 'Would they understand me?' })).toHaveCount(0);
  expect(uploads).toEqual([]);
  // Saying it is optional: the session goes on.
  await page.getByRole('button', { name: 'Next' }).click();
});
