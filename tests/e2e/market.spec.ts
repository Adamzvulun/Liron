import { expect, test } from './fixtures.ts';
import { signedIn } from './fake-supabase.ts';

test.describe('the Market (#49)', () => {
  test('sells 5 wares; gold buys one, and it goes to the wardrobe', async ({ page }) => {
    await signedIn(page, [], [], null, [], { gold: 130 });
    await page.goto('/market');
    const wares = page.getByRole('region', { name: 'Today’s wares' }).getByRole('listitem');
    await expect(wares).toHaveCount(5);
    await expect(page.getByText('Five wares a day. Gold only, earned by learning.')).toBeVisible();
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

    // The shop points you to the wardrobe to try it on.
    await page.getByRole('link', { name: 'Try it on at your house' }).click();
    await expect(page).toHaveURL(/\/house#wardrobe$/);
    await page.locator('label', { hasText: 'Red tarboosh' }).click();
    await expect(page.getByRole('radio', { name: 'Red tarboosh' })).toBeChecked();
  });

  test('the stall stands in a painted bazaar lane (roadmap A3)', async ({ page }) => {
    await signedIn(page, [], [], null, [], { gold: 130 });
    await page.goto('/market');
    const lane = page.locator('.hall-backdrop[data-hall="market"]');
    await expect(lane).toHaveAttribute('aria-hidden', 'true');
    await expect(lane.locator('img')).toHaveJSProperty('complete', true);
    await expect(page.getByRole('region', { name: 'Today’s wares' })).toBeVisible();
  });

  test('sells a chair, shown in a room, which then goes in your room (#443)', async ({ page }) => {
    await signedIn(page, [], [], null, [], { gold: 130 });
    await page.goto('/market');
    const chair = page
      .getByRole('region', { name: 'Today’s wares' })
      .getByRole('listitem')
      .filter({ hasText: 'Chair' });
    await expect(chair.getByText('Common · for your room')).toBeVisible();
    await expect(chair.locator('.market__room image')).toHaveCount(1);
    await chair.getByRole('button', { name: 'Buy Chair for 60 gold' }).click();
    await expect(page.getByText('Chair is yours.')).toBeVisible();
    await page.getByRole('link', { name: 'Place it in your room' }).click();
    await expect(page).toHaveURL(/\/house$/);
    await page.getByRole('button', { name: 'Decorate' }).click();
    await page.getByRole('button', { name: 'Pick up the chair' }).click();
    // Set down on the rug, in the middle of the room.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Set down the chair.')).toBeVisible();
    const save = page.waitForRequest('**/rpc/save_home');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    const { p_layout } = (await save).postDataJSON() as { p_layout: { pieces: { id: string }[] } };
    expect(p_layout.pieces.map((p) => p.id)).toContain('home-chair');
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
