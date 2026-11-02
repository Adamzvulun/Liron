import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

test('the lobby shows your level, XP bar, gold and gems', async ({ page }) => {
  await signedIn(page);
  await page.goto('/');
  // 65 XP: level 3 starts at 50 XP and level 4 at 90, so 15 of 40.
  await expect(page.getByText('Lv 3')).toBeVisible();
  await expect(page.getByText('Wanderer')).toBeVisible();
  await expect(page.getByText('15 / 40 XP')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Level 3 progress' })).toHaveAttribute(
    'aria-valuenow',
    '15',
  );
  await expect(page.getByLabel('Gold: 31')).toBeVisible();
  await expect(page.getByLabel('Gems: 2')).toBeVisible();
});

test('the HUD shows the streak and today’s goal, and the goal can change', async ({ page }) => {
  await signedIn(page);
  await page.goto('/');
  await expect(page.getByLabel('Streak: 2 days')).toBeVisible();
  await expect(page.getByText('6 / 15 min')).toBeVisible();
  await page.getByLabel('Minutes a day').selectOption('20');
  await expect(page.getByText('6 / 20 min')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('reaching the daily goal opens the chest and grows the streak', async ({ page }) => {
  await signedIn(page);
  await page.goto('/');
  await page.getByLabel('Minutes a day').selectOption('5'); // 6 minutes done: goal reached
  const dialog = page.getByRole('dialog', { name: '3 days' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('+20 gold')).toBeVisible();
  await expect(page.getByLabel('Gold: 51')).toBeAttached();
  await dialog.getByRole('button', { name: 'Onward' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Streak: 3 days')).toBeVisible();
  await expect(page.getByText('Done! 6 min today')).toBeVisible();
});
