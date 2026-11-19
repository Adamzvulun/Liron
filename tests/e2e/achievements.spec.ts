import { expect, test } from './fixtures.ts';
import { signedIn } from './fake-supabase.ts';

test.describe('achievements and titles in Your House (#177)', () => {
  test('the wall shows what is earned and how far along the rest are', async ({ page }) => {
    await signedIn(page, [], [], null, [], {
      earned: ['first-light', 'overspeed'],
      progress: { 'chest-hunter': 4 },
    });
    await page.goto('/house');
    const wall = page.getByRole('region', { name: 'Achievements' });
    await expect(wall.getByText('2 of 24 earned')).toBeVisible();
    const overspeed = wall.getByRole('listitem').filter({ hasText: 'Overspeed' });
    await expect(overspeed).toContainText('Earned');
    await expect(overspeed).toContainText('Title: the Quick-Eared');
    const chests = wall.getByRole('listitem').filter({ hasText: 'Chest Hunter' });
    await expect(chests).toContainText('4 / 10');
    await expect(chests.getByRole('progressbar', { name: 'Chest Hunter: 4 of 10' })).toBeVisible();
    // Only earned titles can be worn.
    await expect(wall.getByRole('radio', { name: 'the Quick-Eared' })).toBeVisible();
    await expect(wall.getByRole('radio', { name: 'the Steadfast' })).toHaveCount(0);
    if (process.env.SHOT) await wall.screenshot({ path: process.env.SHOT });
  });

  test('wearing a title saves it, and the HUD shows it under your name', async ({ page }) => {
    const updates: unknown[] = [];
    await signedIn(page, updates, [], null, [], { earned: ['overspeed'] });
    await page.goto('/');
    await expect(page.locator('.hud__title')).toHaveText('Wanderer');
    await page.goto('/house');
    const wall = page.getByRole('region', { name: 'Achievements' });
    await expect(wall.getByRole('radio', { name: 'Your level’s title' })).toBeChecked();
    await wall.locator('label', { hasText: 'the Quick-Eared' }).click();
    await expect(wall.getByRole('radio', { name: 'the Quick-Eared' })).toBeChecked();
    await expect.poll(() => updates).toContainEqual({ title: 'the Quick-Eared' });
    await page.goto('/');
    await expect(page.locator('.hud__title')).toHaveText('the Quick-Eared');
  });

  test('with nothing earned yet, the picker says where titles come from', async ({ page }) => {
    await signedIn(page);
    await page.goto('/house');
    const wall = page.getByRole('region', { name: 'Achievements' });
    await expect(wall.getByText('0 of 24 earned')).toBeVisible();
    await expect(wall.getByText('Some achievements give a title')).toBeVisible();
    await expect(wall.getByRole('radio')).toHaveCount(1);
  });
});
