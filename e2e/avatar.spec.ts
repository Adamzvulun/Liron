import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

test.describe('the avatar in Your House (#28, #29)', () => {
  test('choosing a look previews it, and saving stores it in the profile', async ({ page }) => {
    const updates: unknown[] = [];
    await signedIn(page, updates);
    await page.goto('/house');
    const save = page.getByRole('button', { name: 'Save my look' });
    await expect(save).toBeDisabled();

    // The labels are the tap targets; the radios inside them are hidden.
    await page.locator('label', { hasText: 'Curls' }).click();
    await page.locator('label[title="Umber"]').click();
    await page.locator('label', { hasText: 'Walking staff' }).click();
    await expect(page.getByRole('radio', { name: 'Curls' })).toBeChecked();
    await expect(save).toBeEnabled();

    await save.click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
    expect(updates).toContainEqual({
      avatar: expect.objectContaining({
        hair: 'curly',
        skin: 'umber',
        gear: expect.objectContaining({ hand: 'staff' }),
      }),
    });
    await expect(save).toBeDisabled();
  });

  test('locked gear says how to earn it and cannot be worn', async ({ page }) => {
    await signedIn(page);
    await page.goto('/house');
    await expect(page.getByText("Signaller's headset (locked)")).toBeVisible();
    await expect(page.getByText('Reach level 5 in the Signal Tower')).toBeVisible();
    await expect(page.getByRole('radio', { name: "Signaller's headset" })).toHaveCount(0);
  });

  test('undo puts the saved look back', async ({ page }) => {
    await signedIn(page);
    await page.goto('/house');
    await page.locator('label', { hasText: 'Long' }).click();
    await page.getByRole('button', { name: 'Undo changes' }).click();
    await expect(page.getByRole('radio', { name: 'Crop' })).toBeChecked();
  });
});
