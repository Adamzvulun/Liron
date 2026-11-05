import { expect, test, type Page } from '@playwright/test';
import characters from '../content/morse/characters.json' with { type: 'json' };
import { listenForMorse, morseRuns, signedIn, type SubjectCall } from './fake-supabase.ts';

// Review item 7, Morse half: copy each run right or wrong on purpose, reading what played from
// the tones the page schedules, and check the gate (two runs in a row at 90%) end to end.

const DIT = 1.2 / 20; // seconds, at the lessons' 20 wpm character speed
const BY_CODE = new Map(characters.items.map((i) => [i.data.code, i.data.char]));
/** Lesson 1 with K and M met, so Begin goes straight to a run (never a warm-up at lesson 1). */
const LESSON_1 = { unlocked: 2, met: ['K', 'M'] };

/**
 * Starts a short run with the named button and copies every character right, or copies nothing.
 * (Swapping K and M isn't a clean fail: the scorer aligns copies, so some swaps still line up.)
 */
async function run(page: Page, start: 'Begin' | 'Next run', right: boolean) {
  const before = (await morseRuns(page, DIT)).length;
  await page.getByRole('button', { name: start }).click();
  await expect(page.getByLabel('Run')).toBeVisible();
  await expect.poll(async () => (await morseRuns(page, DIT)).length).toBeGreaterThan(before);
  const codes = (await morseRuns(page, DIT)).at(-1) ?? [];
  const played = codes.map((c) => BY_CODE.get(c) ?? `?${c}`);
  expect(
    played.every((c) => c === 'K' || c === 'M'),
    played.join(' '),
  ).toBe(true);
  if (right)
    for (const c of played)
      await page.locator('.lesson__key', { hasText: new RegExp(`^${c}$`) }).click();
  await expect(page.locator('.lesson__pct')).toHaveText(right ? '100%' : '0%', {
    timeout: 20_000,
  });
}

/** The last saved state, or undefined until the first save arrives (polls wait for it). */
function lastState(calls: SubjectCall[]) {
  const saves = calls.filter((c) => c.rpc === 'save_subject_state');
  const last = saves.at(-1)?.args as
    { p_state: { unlocked: number; recent: number[] } } | undefined;
  return last?.p_state;
}

test.describe('the Koch gate: passing and failing (review item 7)', () => {
  test.setTimeout(90_000);

  test('two runs in a row at 90% light the next lamp', async ({ page }) => {
    const calls: SubjectCall[] = [];
    await listenForMorse(page);
    await signedIn(page, [], calls, LESSON_1);
    await page.goto('/signal-tower?open=koch&run=short');

    await run(page, 'Begin', true);
    await expect(page.getByLabel('1 of 2 runs at 90%')).toBeVisible();
    await expect(page.getByText('One more run at 90% lights the next lamp.')).toBeVisible();
    await expect.poll(() => lastState(calls)?.recent).toEqual([1]);

    await run(page, 'Next run', true);
    await expect(page.getByText('Two in a row! U is next.')).toBeVisible();
    await expect.poll(() => lastState(calls)?.unlocked).toBe(3);
    expect(lastState(calls)?.recent).toEqual([]);

    // Reloaded, the lesson opens on the new letter.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Add U' })).toBeVisible();
  });

  test('a bad run in between restarts the count', async ({ page }) => {
    const calls: SubjectCall[] = [];
    await listenForMorse(page);
    await signedIn(page, [], calls, LESSON_1);
    await page.goto('/signal-tower?open=koch&run=short');

    await run(page, 'Begin', true);
    await run(page, 'Next run', false);
    await expect(page.getByLabel('0 of 2 runs at 90%')).toBeVisible();
    await expect(page.getByText('Keep going: two runs in a row at 90% light')).toBeVisible();

    // A good run now is only one in a row: no lamp yet.
    await run(page, 'Next run', true);
    await expect(page.getByLabel('1 of 2 runs at 90%')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Meet / })).toHaveCount(0);
    await expect.poll(() => lastState(calls)?.recent).toEqual([1, 0, 1]);
    expect(lastState(calls)?.unlocked).toBe(2);
  });
});
