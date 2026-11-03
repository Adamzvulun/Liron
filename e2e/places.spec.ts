import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

test.describe('places in the city (#25)', () => {
  test('a place opens its screen, and the back button returns to the square', async ({ page }) => {
    await signedIn(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Signal Tower' }).click();
    await expect(page).toHaveURL(/\/signal-tower$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Signal Tower' })).toBeFocused();
    await expect(page.getByText('Morse code by sound and light')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Caravanserai' })).toBeVisible();
  });

  test('every place has its own address that opens directly', async ({ page }) => {
    await signedIn(page);
    for (const [path, title] of [
      ['/signal-tower', 'Signal Tower'],
      ['/caravanserai', 'Caravanserai'],
      ['/notice-board', 'Notice Board'],
      ['/house', 'Your House'],
      ['/market', 'Market'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    }
    await page.getByRole('link', { name: 'Back to the square' }).click();
    await expect(page.getByRole('heading', { name: 'Your House' })).toBeVisible();
  });

  test('places work from the keyboard', async ({ page }) => {
    test.skip(test.info().project.name === 'phone', 'no keyboard on the phone');
    await signedIn(page);
    await page.goto('/');
    const caravanserai = page.getByRole('link', { name: /^Caravanserai: / });
    await caravanserai.focus();
    await expect(caravanserai).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/caravanserai$/);
  });

  test('the Arena says it is locked; empty plots wait for new guilds', async ({ page }) => {
    await signedIn(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'The Arena · Locked' }).click();
    await expect(page.getByRole('status')).toHaveText(/opens with the Fellowship/);
    await expect(page.getByRole('img', { name: /empty plot/ })).toHaveCount(2);
  });

  test('an unknown address says so and links home', async ({ page }) => {
    await signedIn(page);
    await page.goto('/nowhere');
    await expect(page.getByRole('heading', { name: 'Lost?' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to the square' }).click();
    await expect(page.getByRole('heading', { name: 'Signal Tower' })).toBeVisible();
  });
});
