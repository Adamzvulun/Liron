import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

// The ledger in Your House (task 1.6, docs/game/ledger.md).

test.describe('the ledger in Your House (#314)', () => {
  test('a new player sees honest zeros, nothing blank', async ({ page }) => {
    await signedIn(page);
    await page.goto('/house');
    const ledger = page.getByRole('region', { name: 'Ledger' });
    const tower = ledger.getByRole('region', { name: 'Signal Tower' });
    await expect(tower).toContainText('Step 1 of');
    await expect(tower).toContainText('Characters learned');
    await expect(tower).toContainText('No drill yet');
    await expect(ledger.getByRole('region', { name: 'Caravanserai' })).toContainText(
      'Words known0',
    );
    const habit = ledger.getByRole('region', { name: 'Your habit' });
    await expect(habit).toContainText('Days practiced, last 30');
    await expect(habit).toContainText('0 of 30');
    await expect(ledger).toContainText('No reviews this week yet.');
    await expect(ledger).not.toContainText('NaN');
    for (const value of await ledger.locator('dd').allTextContents()) {
      expect(value.trim()).not.toBe('');
    }
  });

  test('an advanced player sees what they have learned', async ({ page }) => {
    const morse = {
      unlocked: 12,
      effWpm: 14,
      sending: { drills: 3, ditMs: 90, fastest: 80 },
      recognition: { best: 31, rounds: 9, avgMs: {} },
    };
    await signedIn(page, [], [], morse, [], {
      ledger: {
        cards: {
          morse: [
            { item_id: 'char:K', interval: 30, reps: 8 },
            { item_id: 'char:R', interval: 1, reps: 1 },
          ],
        },
        week: { morse: ['char:K', 'char:R'] },
        days: [
          { day: '2026-11-01', minutes: 20 },
          { day: '2026-11-02', minutes: 6 },
        ],
      },
    });
    await page.goto('/house');
    const tower = page.getByRole('region', { name: 'Signal Tower' });
    await expect(tower).toContainText('Characters learned12 of');
    await expect(tower).toContainText('Copy speed14 wpm');
    await expect(tower).toContainText('Sending speed15 wpm');
    await expect(tower).toContainText('Recognition best31');
    await expect(tower).toContainText('This week: 1 new character met, 2 reviews.');
    const habit = page.getByRole('region', { name: 'Your habit' });
    await expect(habit).toContainText('2 of 30');
    await expect(habit).toContainText('Minutes this week26');
    await expect(habit).toContainText('Longest run of days2 days');
  });

  test('fits a 320-pixel screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await signedIn(page);
    await page.goto('/house');
    const ledger = page.getByRole('region', { name: 'Ledger' });
    await expect(ledger.getByRole('region', { name: 'Your habit' })).toBeVisible();
    const box = await ledger.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 320).toBe(true);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(wide).toBeLessThanOrEqual(320);
    if (process.env.SHOT) await ledger.screenshot({ path: process.env.SHOT });
  });
});
