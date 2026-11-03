import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

test.describe('Instant Recognition in the Signal Tower (#32 concept)', () => {
  test('a short round: letters play, answers score, the result lists the letters', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await signedIn(page, []);
    // run=short: a 10-second round instead of 60.
    await page.goto('/signal-tower?run=short');
    await page.getByRole('tab', { name: 'Instant Recognition' }).click();
    await expect(page.getByText('Your letters: K M')).toBeVisible();
    await page.getByRole('button', { name: 'Start round' }).click();

    const keys = page
      .getByRole('group', { name: 'Letter keys' })
      .or(page.getByLabel('Letter keys'));
    for (let i = 0; i < 4; i++) {
      await expect(page.getByText('Which letter?')).toBeVisible({ timeout: 8000 });
      await keys.getByRole('button', { name: 'K', exact: true }).click();
    }

    await expect(page.getByText('points', { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/\d+ of \d+ right/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Slowest letters first' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();
  });
});
