import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

test.describe('the Market (#49)', () => {
  test('sells 4 wares; gold buys one, and it goes to the wardrobe', async ({ page }) => {
    await signedIn(page, [], [], null, [], { gold: 130 });
    await page.goto('/market');
    const wares = page.getByRole('region', { name: 'Today’s wares' }).getByRole('listitem');
    await expect(wares).toHaveCount(4);
    await expect(page.getByText('Four wares a day. Gold only, earned by learning.')).toBeVisible();
    // The robe costs 180: 50 more gold, and it can't be bought.
    await expect(page.getByText('50 more gold')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Buy Scholar.s robe for 180 gold/ }),
    ).toBeDisabled();
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });

    await page.getByRole('button', { name: 'Buy Red tarboosh for 60 gold' }).click();
    await expect(page.getByText('Red tarboosh is yours.')).toBeVisible();
    await expect(
      wares.filter({ hasText: 'Red tarboosh' }).getByText('Yours', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('70 gold', { exact: true })).toBeVisible();
    // 70 left: the shield (120) is out of reach now.
    await expect(page.getByRole('button', { name: /Buy Streak shield/ })).toBeDisabled();

    await page.goto('/house');
    await page.locator('label', { hasText: 'Red tarboosh' }).click();
    await expect(page.getByRole('radio', { name: 'Red tarboosh' })).toBeChecked();
  });

  test('what you own says so instead of a price', async ({ page }) => {
    await signedIn(page, [], [], null, [], {
      gold: 500,
      owned: ['robe'],
      today: { streak_shields: 2 },
    });
    await page.goto('/market');
    await expect(page.getByText('Yours', { exact: true })).toBeVisible();
    await expect(page.getByText('You hold 2')).toBeVisible();
    await expect(page.getByRole('button', { name: /Buy Scholar/ })).toHaveCount(0);
  });
});
