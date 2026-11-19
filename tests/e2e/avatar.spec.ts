import { expect, test } from './fixtures.ts';
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

  test('a headscarf can be chosen and saved, and taken off again', async ({ page }) => {
    const updates: unknown[] = [];
    await signedIn(page, updates);
    await page.goto('/house');
    await page.locator('label', { hasText: 'Rose' }).click();
    await expect(page.getByRole('radio', { name: 'Rose' })).toBeChecked();
    await page.getByRole('button', { name: 'Save my look' }).click();
    await expect
      .poll(() => updates)
      .toContainEqual({ avatar: expect.objectContaining({ scarf: 'rose' }) });
    await page
      .getByRole('group', { name: 'Headscarf' })
      .locator('label', { hasText: 'None' })
      .click();
    await expect(page.getByRole('radio', { name: 'Rose' })).not.toBeChecked();
  });

  test('the wardrobe stands in a painted room (roadmap A2)', async ({ page }) => {
    await signedIn(page);
    await page.goto('/house');
    const room = page.locator('.hall-backdrop[data-hall="house"]');
    await expect(room).toHaveAttribute('aria-hidden', 'true');
    await expect(room.locator('img')).toHaveJSProperty('complete', true);
    await expect(page.getByRole('button', { name: 'Save my look' })).toBeVisible();
  });

  test('locked gear says how to earn it and cannot be worn', async ({ page }) => {
    await signedIn(page);
    await page.goto('/house');
    // Locked pieces are folded under each slot, one line saying how many (report §4bk).
    const head = page.getByRole('group', { name: 'Head' });
    await expect(page.getByText('Signaler’s headset (locked)')).toBeHidden();
    await head.getByText(/^\d+ still to find$/).click();
    await expect(page.getByText('Signaler’s headset (locked)')).toBeVisible();
    await expect(page.getByText('Reach level 5 in the Signal Tower')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Signaler’s headset' })).toHaveCount(0);
  });

  test('gear you own can be worn and saved (ADR 0033)', async ({ page }) => {
    const updates: unknown[] = [];
    await signedIn(page, updates, [], null, [], { owned: ['cloak'] });
    await page.goto('/house');
    await page.locator('label', { hasText: 'Merchant cloak' }).click();
    await expect(page.getByRole('radio', { name: 'Merchant cloak' })).toBeChecked();
    await expect(page.getByText('Signaler’s headset (locked)')).toBeAttached();
    await page.getByRole('button', { name: 'Save my look' }).click();
    // The save is a request: wait for it rather than read the list at the click.
    await expect
      .poll(() => updates)
      .toContainEqual({
        avatar: expect.objectContaining({ gear: expect.objectContaining({ back: 'cloak' }) }),
      });
  });

  test('a companion you own sits at your feet; the others say where they come from', async ({
    page,
  }) => {
    const updates: unknown[] = [];
    await signedIn(page, updates, [], null, [], { owned: ['sand-cat'] });
    await page.goto('/house');
    const row = page.getByRole('group', { name: 'Companion' });
    await expect(row.getByRole('radio', { name: 'None' })).toBeChecked();
    await row.getByText(/still to find$/).click();
    await expect(row.getByText('Fennec fox (locked)')).toBeVisible();
    await row.locator('label', { hasText: 'Sand cat' }).click();
    await expect(row.getByRole('radio', { name: 'Sand cat' })).toBeChecked();
    await page.getByRole('button', { name: 'Save my look' }).click();
    await expect
      .poll(() => updates)
      .toContainEqual({
        avatar: expect.objectContaining({ gear: expect.objectContaining({ pet: 'sand-cat' }) }),
      });
  });

  test('a dye you own colors the tunic; others are locked (#49)', async ({ page }) => {
    const updates: unknown[] = [];
    await signedIn(page, updates, [], null, [], { owned: ['indigo-dye', 'coat'] });
    await page.goto('/house');
    await expect(page.getByText('Crimson dye (locked)')).toBeAttached();
    await page.locator('label[title="Indigo dye"]').click();
    await expect(page.getByRole('radio', { name: 'Indigo dye' })).toBeChecked();
    await expect(page.getByText('Guildmaster’s coat (locked)')).toHaveCount(0);
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });
    await page.getByRole('button', { name: 'Save my look' }).click();
    await expect
      .poll(() => updates)
      .toContainEqual({ avatar: expect.objectContaining({ dye: 'indigo-dye' }) });
  });

  test('undo puts the saved look back', async ({ page }) => {
    await signedIn(page);
    await page.goto('/house');
    await page.locator('label', { hasText: 'Long' }).click();
    await page.getByRole('button', { name: 'Undo changes' }).click();
    await expect(page.getByRole('radio', { name: 'Crop' })).toBeChecked();
  });
});
