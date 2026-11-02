import { expect, test } from '@playwright/test';

test('the lobby loads and shows both places', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Waymark');
  await expect(page.getByRole('heading', { level: 1, name: 'Waymark' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Signal Tower' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Caravanserai' })).toBeVisible();
});

test('the page never scrolls sideways', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test('fonts load from our own site, not a third party', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost')) external.push(req.url());
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('900 16px Cinzel'))).toBe(true);
  expect(external).toEqual([]);
});
