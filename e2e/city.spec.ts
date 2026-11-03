import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

test.describe('the city square (#24)', () => {
  test('shows every place with its plaque, and your character', async ({ page }) => {
    await signedIn(page);
    await page.goto('/');
    for (const name of ['Signal Tower', 'Caravanserai', 'Notice Board', 'Your House', 'Market']) {
      await expect(page.getByRole('heading', { name })).toBeVisible();
    }
    await expect(page.getByRole('region', { name: /Signal Tower: / })).toBeAttached();
    await expect(page.getByRole('img', { name: 'Your character' })).toBeAttached();
    await expect(page.getByText('The Arena · Locked')).toBeVisible();
  });

  test('scales to fit the window without distortion', async ({ page }) => {
    await signedIn(page);
    for (const size of [
      { width: 1366, height: 768 },
      { width: 1280, height: 1024 },
      { width: 412, height: 915 },
    ]) {
      await page.setViewportSize(size);
      await page.goto('/');
      const box = await page.locator('.city__stage').boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;
      expect(box.width / box.height).toBeCloseTo(1920 / 1080, 2);
      // Fits: touches two opposite edges, never spills over.
      expect(box.width).toBeLessThanOrEqual(size.width + 0.5);
      expect(box.height).toBeLessThanOrEqual(size.height + 0.5);
      expect(Math.max(box.width / size.width, box.height / size.height)).toBeCloseTo(1, 2);
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
