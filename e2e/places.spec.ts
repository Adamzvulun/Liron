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

  test('you can walk out of each place back to the square, in the app (review, 2026-11-15)', async ({
    page,
  }) => {
    await signedIn(page);
    // Each place's view loads on its own (#137): wait for it before walking out.
    for (const [path, ready] of [
      ['/house', 'Achievements'],
      ['/market', 'Market'],
      ['/notice-board', 'Chests'],
    ] as const) {
      await page.goto(path);
      await page.getByRole('heading', { name: ready, exact: true }).first().waitFor();
      await page.getByRole('link', { name: 'Back to the square' }).click();
      await expect(page.getByRole('link', { name: /^Caravanserai: / })).toBeVisible();
      await expect(page.getByText('Something went wrong')).toHaveCount(0);
    }
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

test("a place that can't load says so, can try again, and the top bar stays (review, 2026-11-15)", async ({
  page,
}) => {
  await signedIn(page);
  let down = true;
  const flaky = (path: string) =>
    page.route(`**/rest/v1/rpc/${path}`, (route) =>
      down ? route.fulfill({ status: 500, json: { message: 'down' } }) : route.fallback(),
    );
  await flaky('market_today');
  await flaky('my_achievements');
  const settings = page.getByRole('button', { name: 'Settings' });
  const back = page.getByRole('link', { name: 'Back to the square' });
  for (const [path, failed, loaded] of [
    [
      '/market',
      'The stall couldn’t be set out.',
      page.getByRole('heading', { name: 'Today’s wares' }),
    ],
    ['/house', 'The wall couldn’t be read.', page.getByText(/\d+ of \d+ earned/)],
  ] as const) {
    down = true;
    await page.goto(path);
    await expect(page.getByText(failed)).toBeVisible();
    // Back on the square, without a reload, the top bar is still there.
    await back.click();
    await expect(settings).toBeVisible();
    await page.goBack();
    await expect(page.getByText(failed)).toBeVisible();
    down = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(loaded).toBeVisible();
  }
});
