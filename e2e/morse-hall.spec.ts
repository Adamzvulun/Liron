import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

test.describe('the Signal Tower hall (#33, #34)', () => {
  test('a new player sees chapter I, two lit lamps and the first lesson', async ({ page }) => {
    await signedIn(page, []);
    await page.goto('/signal-tower');
    await expect(page.getByRole('heading', { name: 'Chapter I: Embers' })).toBeVisible();
    await expect(page.getByRole('img', { name: /2 of 8 lamps lit/ })).toBeVisible();
    await expect(page.getByText('Initiate', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Hear K and M/ }).click();
    await expect(page.getByRole('heading', { name: 'Hear K and M' })).toBeVisible();
    await page.getByRole('button', { name: '← Tower hall' }).click();
    await expect(page.getByRole('heading', { name: 'Chapter I: Embers' })).toBeVisible();
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
});
