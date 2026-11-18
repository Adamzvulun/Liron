import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

test.describe('the first page (the-road.md §8)', () => {
  test('a new player is told what the city is, and one button starts the first step', async ({
    page,
  }) => {
    await signedIn(page, [], [], null, [], { firstPage: true });
    await page.goto('/');
    const first = page.getByRole('dialog', { name: 'Waymark' });
    await expect(first.getByText(/A city grown up around a crossroads/)).toBeVisible();
    const tower = first.getByRole('link', { name: 'Climb the Signal Tower' });
    await expect(tower).toBeFocused();
    await expect(
      first.getByRole('link', { name: 'Or sit down at the Caravanserai' }),
    ).toBeVisible();
    await tower.click();
    // Straight to the first lesson, not just into the hall.
    await expect(page).toHaveURL(/\/signal-tower\?open=koch$/);
    await expect(page.getByRole('heading', { name: 'Hear K and M' })).toBeVisible();
    // Once closed it stays closed on this device.
    await page.goto('/');
    await expect(page.getByText('Adam', { exact: true })).toBeVisible();
    await expect(first).toHaveCount(0);
  });

  test('it can be put aside to look around, and a player with a step done never sees it', async ({
    page,
  }) => {
    await signedIn(page, [], [], null, [], { firstPage: true });
    await page.goto('/');
    const first = page.getByRole('dialog', { name: 'Waymark' });
    await first.getByRole('button', { name: 'Look around the square first' }).click();
    await expect(first).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });

  test('a player who has started a road goes straight to the square', async ({ page }) => {
    await signedIn(page, [], [], { unlocked: 3, runs: 2 }, [], { firstPage: true });
    await page.goto('/');
    await expect(page.getByText('Adam', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Signal Tower/ }).first()).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Waymark' })).toHaveCount(0);
  });
});
