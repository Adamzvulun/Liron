import { expect, test, type Page } from '@playwright/test';
import { CONTRACTS, signedIn } from './fake-supabase.ts';

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
  // The goal chip opens its own panel, on the goal you have now.
  await page.getByRole('button', { name: 'Daily goal: 6 of 15 minutes' }).click();
  const panel = page.getByRole('group', { name: 'Daily goal' });
  await expect(panel.getByText('6 of 15 min today')).toBeVisible();
  await expect(panel.getByText('9 more minutes to open the daily chest.')).toBeVisible();
  await expect(panel.getByRole('button', { name: '15 minutes a day', exact: true })).toBeFocused();
  await expect(
    panel.getByRole('button', { name: '15 minutes a day', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await panel.getByRole('button', { name: '20 minutes a day', exact: true }).click();
  await expect(goal(page, 6, 20)).toBeVisible();
  await expect(panel.getByText('Saved: 20 minutes a day')).toBeVisible();
  await expect(
    panel.getByRole('button', { name: '20 minutes a day', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Settings show the goal too, and lead to the same panel.
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(panel).toHaveCount(0);
  const settings = page.getByRole('group', { name: 'Settings' });
  await expect(settings.getByText('20 minutes a day')).toBeVisible();
  await settings.getByRole('button', { name: 'Change' }).click();
  await expect(panel.getByRole('button', { name: '20 minutes a day', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Daily goal:/ })).toBeFocused();
});

test('reaching the daily goal opens the chest and grows the streak', async ({ page }) => {
  await signedIn(page);
  await page.goto('/');
  await page.getByRole('button', { name: /^Daily goal:/ }).click();
  await page.getByRole('button', { name: '5 minutes a day', exact: true }).click(); // 6 minutes done: reached
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
    .getByRole('link', { name: /The Silent Beacon, Chapter 1: Embers/ });
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
  // The board hangs on the guildhall's painted wall (roadmap A4).
  await expect(page.locator('.hall-backdrop[data-hall="board"] img')).toHaveJSProperty(
    'complete',
    true,
  );
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

test('chests wait on the Notice Board and open once, paying what they held (ADR 0033)', async ({
  page,
}) => {
  await signedIn(page, [], [], null, [], {
    chests: [{ id: 'c1', kind: 'brass', source: 'streak', source_key: '2026-11-02:7' }],
  });
  await page.goto('/');
  if (!onPhone()) {
    await expect(
      page.getByRole('region', { name: 'Quests' }).getByRole('link', { name: /Chests/ }),
    ).toContainText('1 to open');
  }
  await page.goto('/notice-board');
  const shelf = page.getByRole('region', { name: 'Chests' });
  await expect(shelf).toContainText('Brass chest');
  await expect(shelf).toContainText('For a 7-day streak');
  // Today's contract chest stays locked until all three are done.
  await expect(shelf).toContainText('Finish all three of today’s contracts to open it');
  await expect(shelf).toContainText('0 of 3 done');

  await shelf.getByRole('button', { name: 'Open' }).click();
  const opened = page.getByRole('dialog', { name: 'Brass chest' });
  await expect(opened).toContainText('+30 gold');
  await expect(opened).toContainText('+1 gem');
  await expect(opened).toContainText('Copper-toe boots, new to wear');
  await expect(opened).toContainText('A streak shield');
  await opened.getByRole('button', { name: 'Collect' }).click();
  await expect(opened).toBeHidden();
  await expect(shelf.getByRole('button', { name: 'Open' })).toHaveCount(0);
  await expect(shelf).not.toContainText('Brass chest');
});

test('opening the last chest on the shelf still shows what it held (review, 2026-11-15)', async ({
  page,
}) => {
  await signedIn(page, [], [], null, [], {
    chests: [{ id: 'c1', kind: 'wooden', source: 'contracts', source_key: '2026-11-02' }],
  });
  // All three of today's contracts done, so no locked chest stays on the shelf.
  await page.route('**/rest/v1/rpc/todays_contracts', (route) =>
    route.fulfill({
      json: {
        day: '2026-11-02',
        // The kind is the fake's own bookkeeping; the database never sends it.
        contracts: CONTRACTS.map((c) => ({
          ...c,
          kind: undefined,
          progress: c.target,
          paid: true,
        })),
        paid_now: [],
        gold: 76,
      },
    }),
  );
  await page.goto('/notice-board');
  const shelf = page.getByRole('region', { name: 'Chests' });
  await shelf.getByRole('button', { name: 'Open' }).click();
  const opened = page.getByRole('dialog', { name: 'Wooden chest' });
  await expect(opened).toContainText('+30 gold');
  await opened.getByRole('button', { name: 'Collect' }).click();
  await expect(opened).toBeHidden();
  await expect(shelf).toHaveCount(0);
});

test("a chest that won't open says so on the shelf and keeps the top bar (review, 2026-11-15)", async ({
  page,
}) => {
  await signedIn(page, [], [], null, [], {
    chests: [{ id: 'c1', kind: 'wooden', source: 'contracts', source_key: '2026-11-02' }],
  });
  await page.route('**/rest/v1/rpc/open_chest', (route) =>
    route.fulfill({ status: 500, json: { message: 'down' } }),
  );
  await page.goto('/notice-board');
  const shelf = page.getByRole('region', { name: 'Chests' });
  await shelf.getByRole('button', { name: 'Open' }).click();
  await expect(shelf.getByRole('alert')).toHaveText(/wouldn’t open/);
  await expect(shelf.getByRole('button', { name: 'Open' })).toBeEnabled();
  // Back on the square, without a reload, the top bar is still there.
  await page.getByRole('link', { name: 'Back to the square' }).click();
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
});

test('closing a celebration from the keyboard puts focus back where it was (review, 2026-11-15)', async ({
  page,
}) => {
  await signedIn(page);
  await page.goto('/');
  await page.getByRole('button', { name: /^Daily goal:/ }).click();
  const minutes = page.getByRole('button', { name: '5 minutes a day', exact: true });
  await minutes.focus(); // as a keyboard player would be
  await page.keyboard.press('Enter'); // 6 minutes done: goal reached
  const onward = page
    .getByRole('dialog', { name: '3 days' })
    .getByRole('button', { name: 'Onward' });
  await expect(onward).toBeFocused();
  // Tab stays inside the dialog: the page behind it can't take focus while it's open.
  await page.keyboard.press('Tab');
  await expect(onward).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(onward).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(minutes).toBeFocused();
});

test("a goal that can't be saved says so and keeps the old one (review, 2026-11-15)", async ({
  page,
}) => {
  await signedIn(page);
  await page.route('**/rest/v1/rpc/set_daily_goal', (route) =>
    route.fulfill({ status: 500, json: { message: 'down' } }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: /^Daily goal:/ }).click();
  await page.getByRole('button', { name: '20 minutes a day', exact: true }).click();
  await expect(page.getByText('Couldn’t save your goal. Try again.')).toBeVisible();
  await expect(page.getByRole('button', { name: '15 minutes a day', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('Streak: 2 days')).toBeVisible();
});

test('coming back to the tab on a new day reads the day again (review, 2026-11-15)', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-02T23:50:00') });
  await signedIn(page);
  let reads = 0;
  page.on('request', (r) => {
    if (r.url().includes('/rest/v1/rpc/today_status')) reads += 1;
  });
  await page.goto('/');
  await expect(page.getByLabel('Streak: 2 days')).toBeVisible();
  await expect.poll(() => reads).toBe(1);
  // Same day: nothing is read again.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.clock.setSystemTime(new Date('2026-11-03T00:10:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => reads).toBe(2);
});

test('a phone held sideways sees the square, not the quests over it (2026-11-15)', async ({
  page,
}) => {
  test.skip(onPhone(), 'the sideways size is set here; one run is enough');
  await page.setViewportSize({ width: 844, height: 390 });
  await signedIn(page);
  await page.goto('/');
  await expect(page.getByRole('progressbar', { name: 'Level 3 progress' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Quests' })).toBeHidden();
  await expect(page.getByRole('link', { name: /Notice Board/ })).toBeVisible();
});

test('on a phone, the settings button still takes a whole thumb (WCAG 2.5.5)', async ({ page }) => {
  test.skip(test.info().project.name !== 'phone', 'the slim top bar is the phone’s');
  await signedIn(page);
  await page.goto('/');
  const gear = await page.getByRole('button', { name: 'Settings' }).boundingBox();
  expect(gear?.width).toBeGreaterThanOrEqual(44);
  expect(gear?.height).toBeGreaterThanOrEqual(44);
});

test('on the narrowest phone, the top bar and the dock fit: chips on one line, the gear and Market on screen', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'phone', 'the slim top bar is the phone’s');
  await page.setViewportSize({ width: 320, height: 640 });
  await signedIn(page);
  await page.goto('/');
  // The units go; the labels keep them.
  const streak = page.getByLabel('Streak: 2 days');
  await expect(streak.locator('.hud__unit')).toBeHidden();
  // The dock below fits too: all five places, none cut off.
  const dock = page.getByRole('navigation', { name: 'Places' });
  await expect(dock.getByRole('link')).toHaveCount(5);
  expect(await dock.evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(true);
  const bar = await page.locator('.lobby__top').boundingBox();
  expect((bar?.x ?? 999) + (bar?.width ?? 0)).toBeLessThanOrEqual(320);
  const gear = await page.getByRole('button', { name: 'Settings' }).boundingBox();
  expect((gear?.x ?? 999) + (gear?.width ?? 0)).toBeLessThanOrEqual(320);
  for (const chip of await page.locator('.hud__chip').all()) {
    expect((await chip.boundingBox())?.height).toBeLessThan(40);
  }
});
