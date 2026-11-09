import { expect, test, type Page } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

/** Phones show the daily goal as a chip; wider screens in the quest panel (#27). */
const onPhone = () => test.info().project.name === 'phone';
const goal = (page: Page, done: number, of: number) =>
  onPhone()
    ? page.getByLabel(`Daily goal: ${done} of ${of} minutes`)
    : page.getByText(`${done} / ${of} min`);

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
  await expect(goal(page, 6, 15)).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Minutes a day').selectOption('20');
  await expect(goal(page, 6, 20)).toBeVisible();
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
  await expect(
    onPhone()
      ? page.getByText('Goal done', { exact: true })
      : page.getByText('Daily goal done! 6 min'),
  ).toBeVisible();
});

test('the HUD shows your name and today’s quests, which lead to their places', async ({ page }) => {
  await signedIn(page);
  await page.goto('/');
  await expect(page.getByText('Adam', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Your portrait' })).toBeVisible();
  if (onPhone()) {
    // On the phone the quests are behind the dock's Quests button (#27).
    await page
      .getByRole('navigation', { name: 'Places' })
      .getByRole('link', { name: 'Quests' })
      .click();
  }
  const quests = page.getByRole('region', { name: 'Quests' });
  await expect(quests).toBeVisible();
  // Two subjects and the daily goal, then the contracts: a summary in the HUD, each on the
  // Notice Board (where the phone's Quests button leads).
  await expect(quests.getByRole('link')).toHaveCount(onPhone() ? 6 : 4);
  await quests.getByRole('link', { name: /hear K and M/ }).click();
  await expect(page).toHaveURL(/\/signal-tower$/);
});

test('a started questline shows where it stands, and leads to its hall (#47)', async ({ page }) => {
  await signedIn(page, [], [], { unlocked: 6 });
  await page.goto('/');
  if (onPhone()) {
    await page
      .getByRole('navigation', { name: 'Places' })
      .getByRole('link', { name: 'Quests' })
      .click();
  }
  const beacon = page
    .getByRole('region', { name: 'Quests' })
    .getByRole('link', { name: /The Silent Beacon I: Embers/ });
  await expect(beacon).toContainText('6/8 lamps');
  await beacon.click();
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

test("the Notice Board lists today's contracts; the HUD says how many are done (#46)", async ({
  page,
}) => {
  await signedIn(page);
  await page.goto('/');
  if (!onPhone()) {
    const summary = page
      .getByRole('region', { name: 'Quests' })
      .getByRole('link', { name: /Contracts/ });
    await expect(summary).toContainText('0 of 3 done today');
    await expect(summary).toContainText('45 gold left to earn');
  }
  await page.goto('/notice-board');
  const quests = page.getByRole('region', { name: 'Quests' });
  const run = quests.getByRole('link', { name: /Signal Tower contract/ });
  await expect(run).toContainText('Pass a Koch run at 90%');
  await expect(run).toContainText('0/1');
  await expect(run).toContainText('20 gold');
  await expect(quests.getByRole('link', { name: /Habit contract/ })).toContainText('0/3');
  await run.click();
  await expect(page).toHaveURL(/\/signal-tower$/);
});

test('the streak shows the shields you hold, and says when one saved it (ADR 0034)', async ({
  page,
}) => {
  await signedIn(page, [], [], null, [], { today: { streak_shields: 2, shielded_days: 1 } });
  await page.goto('/');
  await expect(page.getByLabel('Streak: 2 days, 2 streak shields')).toBeVisible();
  await page.goto('/notice-board');
  await expect(page.getByText('A streak shield saved your 2-day streak')).toBeVisible();
});
