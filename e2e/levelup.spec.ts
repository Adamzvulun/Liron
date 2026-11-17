import { expect, test } from '@playwright/test';
import { FAKE_SUPABASE_URL, signedIn, TODAY, WALLET } from './fake-supabase.ts';

// The level-up celebration (#19, ADR 0020) had unit tests but no browser test until 2026-11-15:
// the fake database never levels up, so here one save does.
test('a round that crosses a level shows the celebration, its new title and what it paid', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await signedIn(page);
  await page.route(`${FAKE_SUPABASE_URL}/rest/v1/rpc/save_session`, (route) =>
    route.fulfill({
      json: {
        duplicate: false,
        award: {
          ...WALLET,
          xp: 140, // level 5 starts at 140 XP
          gold: WALLET.gold + 26,
          gems: WALLET.gems + 1,
          xp_earned: 12,
          gold_earned: 26,
          gems_earned: 1,
          level_before: 4,
          level: 5,
          today: { ...TODAY, minutes: TODAY.minutes + 1 },
        },
      },
    }),
  );
  await page.goto('/signal-tower?run=short');
  await page.getByRole('button', { name: /Instant Recognition/ }).click();
  await page.getByRole('button', { name: 'Start round' }).click();
  const keys = page.getByRole('group', { name: 'Letter keys' }).or(page.getByLabel('Letter keys'));
  await expect(page.getByText('Which letter?')).toBeVisible({ timeout: 8000 });
  await keys.getByRole('button', { name: 'K', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Level 5' });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByText('Level up!')).toBeVisible();
  // Level 5 is a new title, with "an" before a vowel.
  await expect(dialog.getByText('You are now an Adventurer')).toBeVisible();
  await expect(dialog.getByRole('list', { name: 'Rewards' })).toContainText('+26 gold');
  await expect(dialog.getByRole('list', { name: 'Rewards' })).toContainText('+1 gem');
  await expect(dialog.getByRole('button', { name: 'Onward' })).toBeFocused();
  // It fits a phone: nothing runs off the side.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBe(0);
  await dialog.getByRole('button', { name: 'Onward' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
