import { expect, test } from '@playwright/test';
import { deckWord, signedIn, type SubjectCall } from './fake-supabase.ts';
import pack from '../content/arabic/core-words.json' with { type: 'json' };

// Shadowing at the echo well (#194), with Chromium's fake microphone (a beep) allowed without a
// prompt. Made-up deck-like rows under the ids of the first chapter's words and their sentences
// (content/arabic/core-words.json), not the deck's own.
test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
});

const FIRST = (pack.items[0]?.data.words ?? []).filter((w) => w.sentence).slice(0, 2);
const SENTENCES = ['أيوه أنا جاهز', 'لا مش هلأ والله'];
const ROWS = FIRST.flatMap((w, i) => [
  { ...deckWord(i + 1, 'كلمة', w.gloss), item_id: w.deck },
  {
    ...deckWord(i + 11, SENTENCES[i] ?? 'جملة قصيرة هون', `sentence ${i + 1}`),
    item_id: w.sentence ?? '',
  },
]);

test('shadow two sentences, listen back, judge them, and the round is saved', async ({ page }) => {
  const calls: SubjectCall[] = [];
  await signedIn(page, [], calls, { lesson: 2 }, ROWS);
  const uploads: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && /understood/.test(r.url())) uploads.push(r.url());
  });
  await page.goto('/caravanserai?open=echo');
  await page.getByRole('button', { name: 'Shadow sentences' }).click();

  for (let i = 0; i < 2; i++) {
    await expect(page.getByText(`Shadowing · ${i + 1} of 2`)).toBeVisible();
    await expect(page.getByText(`sentence ${i + 1}`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '● Shadow at 75%' }).click();
    const judge = page.getByRole('group', { name: 'How did it go?' });
    await expect(judge).toBeVisible();
    // The take is kept in the tab: hear it, the speaker, and both together.
    const back = page.getByRole('group', { name: 'Listen back' });
    await expect(back.getByRole('button', { name: '▶ Together' })).toBeVisible();
    await back.getByRole('button', { name: '▶ Together' }).click();
    // The next take is at full speed.
    await expect(page.getByRole('button', { name: '● Shadow at full speed' })).toBeVisible();
    await judge.getByRole('button', { name: i === 0 ? 'In step' : 'Lost' }).click();
  }
  await expect(page.getByText('Shadowing · done')).toBeVisible();
  await expect(page.getByText('+6 XP')).toBeVisible();

  await expect.poll(() => calls.some((c) => c.rpc === 'save_subject_state')).toBe(true);
  const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
    p_state: { echo: { shadowed: number } };
  };
  expect(saved.p_state.echo.shadowed).toBe(2);
  const reviews = calls
    .filter((c) => c.rpc === 'record_review')
    .map((c) => (c.args as { p_item: string }).p_item);
  expect(reviews.sort()).toEqual(FIRST.map((w) => `shadow:${w.sentence}`).sort());
  // Nothing was uploaded: the recordings never left the tab.
  expect(uploads).toEqual([]);
});
