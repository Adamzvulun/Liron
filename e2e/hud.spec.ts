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
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Minutes a day').selectOption('20');
  await expect(page.getByText('6 / 20 min')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('reaching the daily goal opens the chest and grows the streak', async ({ page }) => {
  await signedIn(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Minutes a day').selectOption('5'); // 6 minutes done: goal reached
  const dialog = page.getByRole('dialog', { name: '3 days' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('+20 gold')).toBeVisible();
  await expect(page.getByLabel('Gold: 51')).toBeAttached();
  await dialog.getByRole('button', { name: 'Onward' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Streak: 3 days')).toBeVisible();
  await expect(page.getByText('Daily goal done! 6 min')).toBeVisible();
});

test('the HUD shows your name and today’s quests, which lead to their places', async ({ page }) => {
  await signedIn(page);
  await page.goto('/');
  await expect(page.getByText('Adam', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Your portrait' })).toBeVisible();
  const quests = page.getByRole('region', { name: 'Quests' });
  await expect(quests).toBeVisible();
  if (test.info().project.name === 'phone') return; // the list waits for the phone layout (#27)
  await expect(quests.getByRole('link')).toHaveCount(3);
  await quests.getByRole('link', { name: /hear K and M/ }).click();
  await expect(page).toHaveURL(/\/signal-tower$/);
});

test('settings change your name, and Escape closes them', async ({ page }) => {
  const updates: unknown[] = [];
  await signedIn(page, updates);
  await page.goto('/');
  const gear = page.getByRole('button', { name: 'Settings' });
  await gear.click();
  const name = page.getByLabel('Your name');
  await expect(name).toBeFocused();
  await name.fill('  Adam   Z ');
  await name.press('Enter');
  await expect(page.getByText('Saved')).toBeVisible();
  expect(updates).toEqual([{ display_name: 'Adam Z' }]);
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Your name')).toHaveCount(0);
  await expect(gear).toBeFocused();
  await expect(page.getByText('Adam Z', { exact: true })).toBeVisible();
});
