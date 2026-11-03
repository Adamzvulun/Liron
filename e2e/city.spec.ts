import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

test.describe('the city square (#24)', () => {
  test('shows every place with its plaque, and your character', async ({ page }) => {
    await signedIn(page);
    await page.goto('/');
    for (const name of ['Signal Tower', 'Caravanserai', 'Notice Board', 'Your House', 'Market']) {
      await expect(page.getByRole('heading', { name })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: /Signal Tower: / })).toBeAttached();
    await expect(page.getByRole('img', { name: 'Your character' })).toBeAttached();
    await expect(page.getByText('The Arena · Locked')).toBeVisible();
  });

  test('fills the window without distortion', async ({ page }) => {
    await signedIn(page);
    for (const size of [
      { width: 1366, height: 768 },
      { width: 1866, height: 935 },
      { width: 1600, height: 1000 },
    ]) {
      await page.setViewportSize(size);
      await page.goto('/');
      const box = await page.locator('.city__stage').boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;
      expect(box.width / box.height).toBeCloseTo(1920 / 1080, 2);
      // Covers the whole window: no empty bands.
      expect(box.x).toBeLessThanOrEqual(0.5);
      expect(box.y).toBeLessThanOrEqual(0.5);
      expect(box.x + box.width).toBeGreaterThanOrEqual(size.width - 0.5);
      expect(box.y + box.height).toBeGreaterThanOrEqual(size.height - 0.5);
    }
  });

  test('ambient animations stop when the system asks for reduced motion', async ({ page }) => {
    await signedIn(page);
    await page.goto('/');
    const smoke = page.locator('.city .wm-smoke').first();
    expect(await smoke.evaluate((el) => getComputedStyle(el).animationName)).toBe('wm-smoke');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await smoke.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });
});
