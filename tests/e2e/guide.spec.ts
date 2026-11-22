import { expect, test } from './fixtures.ts';
import { GUIDE_SAID, signedIn } from './fake-supabase.ts';
import { GUIDE_IDS } from '../../src/core/guide/seen.ts';

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
    // Nothing more in this visit; saved on the account, so the next visit has no welcome, only
    // Nour's first introduction.
    await page.reload();
    await expect(nour(page).getByRole('status')).toHaveText(/The Notice Board has today’s quests/);
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

// Introductions, one at a time (the-guide.md §3.3, R6–R8; #410).
test.describe('Nour’s introductions', () => {
  /** Where the new mark is: the places whose link wears it (a phone has a plaque and a dock). */
  const marked = (page: import('@playwright/test').Page) =>
    page
      .locator('a:has(.city__new)')
      .evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute('href')))]);

  test('one place at a time wears the new mark, and going in introduces it', async ({
    page,
  }, info) => {
    const updates: unknown[] = [];
    await signedIn(page, updates, [], { unlocked: 3, runs: 2 }, [], { guideSeen: ['welcome'] });
    await page.goto('/');
    const card = nour(page);
    await expect(card.getByRole('status')).toHaveText(/The Notice Board has today’s quests/);
    expect(await marked(page)).toEqual(['/notice-board']);
    const board =
      info.project.name === 'phone'
        ? page
            .getByRole('navigation', { name: 'Places' })
            .getByRole('link', { name: /Quests|Notice Board/ })
        : page.locator('a.city__place').filter({ hasText: 'Notice Board' });
    await expect(board.locator('.city__new')).toHaveText(', New');
    // Got it quiets Nour for this visit; the mark stays until the player goes in.
    await card.getByRole('button', { name: 'Got it' }).click();
    await expect(card).toHaveCount(0);
    expect(await marked(page)).toEqual(['/notice-board']);
    await (info.project.name === 'phone' ? board : board.locator('.city__plaque')).click();
    await expect(page).toHaveURL(/\/notice-board$/);
    await expect.poll(() => updates).toContainEqual({ guide_seen: ['intro:board', 'welcome'] });
    await page.getByRole('link', { name: 'Back to the square' }).click();
    await expect(page.locator('a.city__place').first()).toBeVisible();
    // Nothing else is due for this player, so no mark and no word.
    await expect(page.locator('.city__new')).toHaveCount(0);
    await expect(nour(page)).toHaveCount(0);
  });

  test('the Market is Nour’s to introduce now, not the compass’s', async ({ page }) => {
    await signedIn(page, [], [], { unlocked: 3, runs: 2 }, [], {
      guideSeen: ['welcome', 'intro:board'],
      gold: 120,
    });
    await page.goto('/');
    await expect(nour(page).getByRole('status')).toHaveText(/enough for something at the Market/);
    await expect(page.getByText('You have gold. The Market is open.')).toHaveCount(0);
  });

  test('tapping Nour by the compass brings back the line they were quieted on', async ({
    page,
  }) => {
    await signedIn(page, [], [], { unlocked: 3, runs: 2 }, [], { guideSeen: ['welcome'] });
    await page.goto('/');
    const card = nour(page);
    await card.getByRole('button', { name: 'Got it' }).click();
    await expect(card).toHaveCount(0);
    await page.getByRole('button', { name: /^Nour, the lamplighter/ }).click();
    await expect(card.getByRole('status')).toHaveText(/The Notice Board has today’s quests/);
  });

  test('with nothing new, tapping Nour shows the player around again', async ({ page }) => {
    const updates: unknown[] = [];
    await signedIn(page, updates, [], { unlocked: 3, runs: 2 });
    await page.goto('/');
    await expect(nour(page)).toHaveCount(0);
    await page.getByRole('button', { name: /^Nour, the lamplighter/ }).click();
    const card = nour(page);
    await expect(card.getByRole('status')).toHaveText(/I’m Nour; I light the lamps here/);
    await card.getByRole('button', { name: 'Skip' }).click();
    await expect(card).toHaveCount(0);
  });

  test('the fake’s old hand has heard every line Nour has', () => {
    expect([...GUIDE_SAID].sort()).toEqual(Object.values(GUIDE_IDS).sort());
  });
});
