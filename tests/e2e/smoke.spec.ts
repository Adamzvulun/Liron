import { expect, test } from './fixtures.ts';
import { signedIn } from './fake-supabase.ts';

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => signedIn(page));

  test('the lobby loads and shows both places', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Waymark');
    await expect(page.getByRole('heading', { level: 1, name: 'Waymark' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Signal Tower' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Caravanserai' })).toBeVisible();
  });

  test('the page never scrolls sideways', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Signal Tower' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});

test('the tab has our signpost icon', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  const icon = await request.get('/favicon.svg');
  expect(icon.ok()).toBe(true);
  expect(icon.headers()['content-type']).toContain('image/svg+xml');
  // An iPhone's home screen and shared links take a square PNG.
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/apple-touch-icon.png',
  );
  const touch = await request.get('/apple-touch-icon.png');
  expect(touch.ok()).toBe(true);
  expect(touch.headers()['content-type']).toContain('image/png');
});

test('fonts load from our own site, not a third party', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost')) external.push(req.url());
  });
  await page.goto('/');
  // Wait for real text first: while the login state loads, nothing is rendered, so no font
  // is requested yet and document.fonts.ready would resolve too early.
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('900 16px Cinzel'))).toBe(true);
  expect(external).toEqual([]);
});
