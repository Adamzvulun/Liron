import { expect, type Page, test } from '@playwright/test';
import { signedIn, type SaveSessionArgs } from './fake-supabase.ts';

// The Lamp Signal (#175): the Keyer's trial. Ten words with the straight key, nine read right,
// at 15 wpm or faster. Keying all ten in a test is too slow, so this checks the door, the gate
// and a short failed try (saved with no trial event).
const KOCH = 'KMURESNAPTLWI.JZ=FOY,VG5/Q92H38B?47C1D60X';
const listener = { unlocked: 41, met: [...KOCH], trials: [1, 2, 3, 4, 5], ranks: ['listener'] };

const saves = (page: Page) => {
  const sent: SaveSessionArgs[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/rpc/save_session')) sent.push(r.postDataJSON() as SaveSessionArgs);
  });
  return sent;
};

test.describe('The Lamp Signal (#175)', () => {
  test('stays shut until every character is learned', async ({ page }) => {
    await signedIn(page, [], [], { unlocked: 20 });
    await page.goto('/signal-tower?open=lamp');
    await expect(page.getByRole('heading', { name: 'The Lamp Signal' })).toBeVisible();
    await expect(page.getByText('Opens once you’ve learned all 41 characters.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Work the lamp' })).toHaveCount(0);
  });

  test('the sending station names the trial, and a short try fails and is saved', async ({
    page,
  }) => {
    const sent = saves(page);
    await signedIn(page, [], [], listener);
    await page.goto('/signal-tower');
    await page.getByRole('button', { name: /Trial · The Lamp Signal/ }).click();
    await page.getByRole('button', { name: 'Trial · The Lamp Signal' }).click();
    await page.getByRole('button', { name: 'Work the lamp' }).click();
    await expect(page.getByText('Key this')).toBeVisible();

    const pad = page.getByRole('button', { name: /Morse key/ });
    await pad.scrollIntoViewIfNeeded();
    const box = await pad.boundingBox();
    if (!box) throw new Error('no key');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(page.getByRole('heading', { name: 'The tower needs 9 words' })).toBeVisible();
    await expect(page.getByText('+10 XP')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]?.p_events).toEqual([]);
    expect((sent[0]?.p_state as { rankTrials: string[] }).rankTrials).toEqual([]);
  });
});
