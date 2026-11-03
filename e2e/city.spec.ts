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

  test('scales to fit the window without distortion', async ({ page }) => {
    await signedIn(page);
    for (const size of [
      { width: 1366, height: 768 },
      { width: 1280, height: 1024 },
      { width: 915, height: 412 }, // a phone on its side
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

  test('an upright phone fills the height, pans from the compass, and has a dock', async ({
    page,
  }) => {
    await signedIn(page);
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/');
    await page.getByText('Adam', { exact: true }).waitFor();
    const view = page.locator('.city__view');
    const stage = page.locator('.city__stage');
    // The view shrinks once the HUD has loaded above it; the stage follows.
    await expect
      .poll(async () => {
        const [b, v] = [await stage.boundingBox(), await view.boundingBox()];
        return b && v ? Math.abs(b.height - v.height) : Infinity;
      })
      .toBeLessThan(1);
    const box = await stage.boundingBox();
    if (!box) return;
    expect(box.width / box.height).toBeCloseTo(1920 / 1080, 2);
    // The compass (x = 1010 of 1920) starts in the middle of the view.
    const centre = await view.evaluate(
      (el) => (el.scrollLeft + el.clientWidth / 2) / (el.scrollWidth / 1920),
    );
    expect(Math.abs(centre - 1010)).toBeLessThan(5);
    // No sideways page scroll: only the view pans.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      412,
    );
    const dock = page.getByRole('navigation', { name: 'Places' });
    for (const name of ['Signal Tower', 'Caravanserai', 'Quests', 'House', 'Market']) {
      const link = dock.getByRole('link', { name });
      await expect(link).toBeVisible();
      const b = await link.boundingBox();
      expect(b?.height ?? 0).toBeGreaterThanOrEqual(48); // thumb-sized
    }
    await dock.getByRole('link', { name: 'Quests' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Notice Board' })).toBeVisible();
    await expect(page.getByRole('link', { name: /hear K and M/ })).toBeVisible();
  });

  test('wide screens have no dock', async ({ page }) => {
    await signedIn(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await page.getByText('Adam', { exact: true }).waitFor();
    await expect(page.getByRole('navigation', { name: 'Places' })).toHaveCount(0);
  });
});
