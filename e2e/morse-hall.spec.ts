import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

test.describe('the Signal Tower hall (#33, #34)', () => {
  test('a new player sees chapter I, two lit lamps and the first lesson', async ({ page }) => {
    await signedIn(page, []);
    await page.goto('/signal-tower');
    await expect(page.getByRole('heading', { name: 'Chapter 1: Embers' })).toBeVisible();
    await expect(page.getByRole('img', { name: /2 of 8 lamps lit/ })).toBeVisible();
    await expect(page.getByText('Initiate', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Hear K and M/ }).click();
    await expect(page.getByRole('heading', { name: 'Hear K and M' })).toBeVisible();
    await page.getByRole('button', { name: '← Tower hall' }).click();
    await expect(page.getByRole('heading', { name: 'Chapter 1: Embers' })).toBeVisible();
  });

  test('with every lamp lit, the Gatekeeper holds the gate', async ({ page }) => {
    await signedIn(page, [], [], { unlocked: 8, met: [...'KMURESNA'] });
    await page.goto('/signal-tower');
    await expect(page.getByRole('img', { name: /8 of 8 lamps lit/ })).toBeVisible();
    await page.getByRole('button', { name: /Face The Gatekeeper/ }).click();
    await expect(page.getByRole('heading', { name: 'The Gatekeeper' })).toBeVisible();
    await expect(page.getByText('50 characters · 90% to pass · +50 XP')).toBeVisible();
    await page.getByRole('button', { name: 'Face the trial' }).click();
    await expect(page.getByText(/Listening/)).toBeVisible();
  });

  test('while the Gatekeeper holds the gate, the lesson says runs are practice (review, 2026-11-15)', async ({
    page,
  }) => {
    await signedIn(page, [], [], { unlocked: 8, met: [...'KMURESNA'], recent: [0.95] });
    await page.goto('/signal-tower?open=koch');
    await expect(page.getByRole('heading', { name: 'Practice your letters' })).toBeVisible();
    await expect(page.getByText('The Gatekeeper')).toBeVisible();
    await expect(page.getByText('1 of 2 runs done')).toHaveCount(0);
  });

  test('the last chapter has nine lamps, and its trial relights the beacon', async ({ page }) => {
    const koch = 'KMURESNAPTLWI.JZ=FOY,VG5/Q92H38B?47C1D60X';
    await signedIn(page, [], [], { unlocked: 41, met: [...koch], trials: [1, 2, 3, 4] });
    await page.goto('/signal-tower');
    await expect(page.getByRole('heading', { name: 'Chapter 5: The Beacon Speaks' })).toBeVisible();
    await expect(page.getByRole('img', { name: /9 of 9 lamps lit/ })).toBeVisible();
    await page.getByRole('button', { name: /Face The Beacon’s Answer/ }).click();
    await expect(page.getByText('50 characters · 90% to pass · +150 XP')).toBeVisible();
  });

  test('after the last trial, the scroll tells how the beacon was relit', async ({ page }) => {
    const koch = 'KMURESNAPTLWI.JZ=FOY,VG5/Q92H38B?47C1D60X';
    await signedIn(page, [], [], { unlocked: 41, met: [...koch], trials: [1, 2, 3, 4, 5] });
    await page.goto('/signal-tower');
    await expect(page.getByText(/The beacon blazes/)).toBeVisible();
    await expect(page.getByText('Passed.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Face The Beacon’s Answer/ })).toHaveCount(0);
  });
});
