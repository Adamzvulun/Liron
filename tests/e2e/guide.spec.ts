import { expect, test } from './fixtures.ts';
import { signedIn } from './fake-supabase.ts';

// Nour's welcome (docs/game/the-guide.md §3.2, R1–R5; #409).
const nour = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Nour, the lamplighter' });
const point = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.dataset.guidePoint ?? null);

test.describe('Nour’s welcome', () => {
  test('after "Look around the square first", three lines point the way, then it is saved', async ({
    page,
  }) => {
    const updates: unknown[] = [];
    await signedIn(page, updates, [], null, [], { firstPage: true, guideSeen: [] });
    await page.goto('/');
    await page
      .getByRole('dialog', { name: 'Waymark' })
      .getByRole('button', { name: 'Look around the square first' })
      .click();
    const card = nour(page);
    await expect(card.getByRole('status')).toHaveText(/I’m Nour; I light the lamps here/);
    expect(await point(page)).toBe('compass');
    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByRole('status')).toHaveText(/your level, your gold and gems/);
    expect(await point(page)).toBe('top-bar');
    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByRole('status')).toHaveText(/Every building is a place/);
    expect(await point(page)).toBe('places');
    // The last line has no Skip: there is nothing left to skip.
    await expect(card.getByRole('button', { name: 'Skip' })).toHaveCount(0);
    await card.getByRole('button', { name: 'Got it' }).click();
    await expect(card).toHaveCount(0);
    expect(await point(page)).toBeNull();
    await expect.poll(() => updates).toContainEqual({ guide_seen: ['welcome'] });
    // Saved on the account: the next visit has no welcome.
    await page.reload();
    await expect(page.getByText('Adam', { exact: true })).toBeVisible();
    await expect(nour(page)).toHaveCount(0);
  });

  test('a player back from their first step meets Nour, and Skip ends it for good', async ({
    page,
  }) => {
    const updates: unknown[] = [];
    await signedIn(page, updates, [], { unlocked: 3, runs: 2 }, [], { guideSeen: [] });
    await page.goto('/');
    const card = nour(page);
    await expect(card).toBeVisible();
    // Not a dialog: the square stays usable around it.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await card.getByRole('button', { name: 'Skip' }).click();
    await expect(card).toHaveCount(0);
    await expect.poll(() => updates).toContainEqual({ guide_seen: ['welcome'] });
  });

  test('a brand-new player hears nothing from Nour before the first page or a first step', async ({
    page,
  }) => {
    await signedIn(page, [], [], null, [], { firstPage: true, guideSeen: [] });
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: 'Waymark' })).toBeVisible();
    await expect(nour(page)).toHaveCount(0);
  });

  test('a player who has had the welcome is not greeted again', async ({ page }) => {
    await signedIn(page, [], [], { unlocked: 3, runs: 2 });
    await page.goto('/');
    await expect(page.getByText('Adam', { exact: true })).toBeVisible();
    await expect(nour(page)).toHaveCount(0);
  });
});
