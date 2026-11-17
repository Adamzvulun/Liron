import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

// World events (task 4.4, docs/game/events.md): by the player's own day, with no deploy.

test('in an event’s week the square is dressed and the board says why', async ({ page }) => {
  await signedIn(page, [], [], null, [], { today: { day: '2027-10-22' } });
  await page.goto('/');
  await expect(
    page.getByRole('img', { name: 'The square is dressed for The Olive Harvest' }),
  ).toBeAttached();
  await page.goto('/notice-board');
  await expect(page.getByRole('note')).toContainText('The olive harvest');
  await expect(page.getByText('Olive-wood chest').first()).toBeVisible();
});

test('outside every event the square is as always', async ({ page }) => {
  await signedIn(page, [], [], null, [], { today: { day: '2027-10-27' } });
  await page.goto('/');
  await page.locator('a.city__place').first().waitFor();
  await expect(page.locator('.city__bunting')).toHaveCount(0);
  await page.goto('/notice-board');
  await expect(page.getByRole('note')).toHaveCount(0);
});
