import { expect, test, type Page } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

// The city's sounds (task 4.6, docs/design/sound.md): nothing before the first tap, the switches
// in Settings stay as set across reloads, and off means no sound is made at all.

/** Counts audio contexts made and tones started on the page. */
async function countSound(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { made: number; tones: number };
    w.made = 0;
    w.tones = 0;
    const Real = window.AudioContext;
    window.AudioContext = class extends Real {
      constructor(o?: AudioContextOptions) {
        super(o);
        w.made += 1;
      }
      createOscillator() {
        w.tones += 1;
        return super.createOscillator();
      }
    };
  });
}

const sound = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { made: number; tones: number };
    return { made: w.made, tones: w.tones };
  });

test('nothing plays before the first tap; a tap then clicks', async ({ page }) => {
  await countSound(page);
  await signedIn(page);
  await page.goto('/');
  await page.locator('a.city__place').first().waitFor();
  await page.waitForTimeout(300);
  expect(await sound(page)).toEqual({ made: 0, tones: 0 });
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect.poll(async () => (await sound(page)).tones).toBeGreaterThan(0);
  expect((await sound(page)).made).toBe(1);
});

test('switching sound off stays off across a reload, and then nothing is made', async ({
  page,
}) => {
  await countSound(page);
  await signedIn(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const clicks = page.getByRole('switch', { name: 'Clicks and chimes' });
  const places = page.getByRole('switch', { name: 'Sounds of each place' });
  await expect(clicks).toBeChecked();
  await expect(places).not.toBeChecked();
  await clicks.click();
  await expect(clicks).not.toBeChecked();

  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('switch', { name: 'Clicks and chimes' })).not.toBeChecked();
  // More taps and keys: still nothing.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings' }).first().click();
  await page.waitForTimeout(300);
  expect(await sound(page)).toEqual({ made: 0, tones: 0 });
});

test('the halls are quiet: their sounds are the lessons', async ({ page }) => {
  await signedIn(page);
  await page.goto('/signal-tower');
  await expect(page.locator('main.place-screen')).toHaveAttribute('data-sound', 'quiet');
  await page.goto('/house');
  await expect(page.locator('main.place-screen')).not.toHaveAttribute('data-sound', 'quiet');
});
