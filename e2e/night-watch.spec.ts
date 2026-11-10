import { expect, type Page, test } from '@playwright/test';
import { signedIn, type SaveSessionArgs } from './fake-supabase.ts';
import { watchWords } from '../src/subjects/morse/words/nightWatch.ts';

// The Night Watch (#179): the Telegraphist's trial. Twenty common words at 20 wpm, no AGN,
// 18 right. With ?run=short it is 3 words, and a fixed Math.random makes them known here.
const KOCH = 'KMURESNAPTLWI.JZ=FOY,VG5/Q92H38B?47C1D60X';
const keyer = {
  unlocked: 41,
  met: [...KOCH],
  trials: [1, 2, 3, 4, 5],
  ranks: ['listener', 'keyer'],
  rankTrials: ['lamp-signal'],
};

const saves = (page: Page) => {
  const sent: SaveSessionArgs[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/rpc/save_session')) sent.push(r.postDataJSON() as SaveSessionArgs);
  });
  return sent;
};

/** Copies each word of the watch: `typed(i)` is what to type for word i. */
async function keepWatch(page: Page, typed: (i: number) => string) {
  for (let i = 0; i < 3; i++) {
    await expect(
      page.getByText(`The Night Watch · Word ${i + 1} of 3 · type what you heard`),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'AGN: hear it again' })).toHaveCount(0);
    for (const c of typed(i)) await page.keyboard.press(c.toLowerCase());
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
  }
}

test.describe('The Night Watch (#179)', () => {
  test('stays shut until every character is learned', async ({ page }) => {
    await signedIn(page, [], [], { unlocked: 20, trials: [1] });
    await page.goto('/signal-tower?open=watch');
    await expect(page.getByRole('heading', { name: 'The Night Watch' })).toBeVisible();
    await expect(page.getByText('Opens once you’ve learned all 41 characters.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keep the watch' })).toHaveCount(0);
  });

  test('the Codebook names the trial; a watch copied right is passed and saved', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
    const words = watchWords(() => 0, 3).map((w) => w.text);
    const sent = saves(page);
    await signedIn(page, [], [], keyer);
    await page.goto('/signal-tower?run=short');
    await page
      .getByRole('button', { name: /Trial · The Night Watch/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Trial · The Night Watch' }).click();
    await page.getByRole('button', { name: 'Keep the watch' }).click();
    await keepWatch(page, (i) => words[i] ?? '');

    await expect(page.getByRole('heading', { name: 'Dawn, and nothing missed' })).toBeVisible();
    await expect(page.getByText('+60 XP')).toBeVisible();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]?.p_events).toEqual([{ kind: 'trial-night-watch', count: 1 }]);
    expect((sent[0]?.p_state as { rankTrials: string[] }).rankTrials).toEqual([
      'lamp-signal',
      'night-watch',
    ]);
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });
  });

  test('a watch with misses fails, and is saved with no trial event', async ({ page }) => {
    test.setTimeout(90_000);
    const sent = saves(page);
    await signedIn(page, [], [], keyer);
    await page.goto('/signal-tower?open=watch&run=short');
    await page.getByRole('button', { name: 'Keep the watch' }).click();
    await keepWatch(page, () => 'Q');
    await expect(page.getByRole('heading', { name: 'The watch needs 18 of 20' })).toBeVisible();
    await expect(page.getByText('+10 XP')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]?.p_events).toEqual([]);
  });
});
