import { expect, test } from '@playwright/test';
import { signedIn, type SubjectCall } from './fake-supabase.ts';

test.describe('the Koch lesson in the Signal Tower (#31 concept)', () => {
  test('meet K and M, copy a short run, and see the result', async ({ page }) => {
    test.setTimeout(60_000);
    const calls: SubjectCall[] = [];
    await signedIn(page, [], calls);
    // run=short: an 8-second run instead of 2 minutes, for tests.
    await page.goto('/signal-tower?open=koch&run=short');
    await expect(page.getByRole('heading', { name: 'Hear K and M' })).toBeVisible();
    await page.getByRole('button', { name: 'Begin' }).click();

    // Meet each new letter: hear it, then ten "which was it?" choices.
    for (const letter of ['K', 'M']) {
      await expect(page.getByText(`This is ${letter}.`)).toBeVisible();
      await page.getByRole('button', { name: 'I’ve got it' }).click();
      for (let i = 1; i <= 10; i++) {
        await expect(page.getByText(`Which one was it? ${i} / 10`)).toBeVisible();
        await page.getByRole('button', { name: 'K', exact: true }).click();
        // Every answer is told in words, not only by colour (UX review H4).
        if (i === 1) await expect(page.getByText(/^(Right!|Not quite: it was [KM]\.)$/)).toBeVisible();
      }
    }

    // The run: tap letters on the pad; they appear in groups.
    const copied = page.getByTestId('copied');
    for (const c of 'KMKMKK')
      await page.locator('.lesson__key', { hasText: new RegExp(`^${c}$`) }).click();
    await expect(copied).toHaveText(/KMKMK\s*K/);

    // The result: a score, the gate lamps and each letter's accuracy.
    await expect(page.locator('.lesson__pct')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel(/of 2 runs at 90%/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Next run|Meet U/ })).toBeVisible();

    // Progress is saved: the letters met, then the run (state, then each letter's review and
    // rating). XP and minutes are only sent when there are any, so they may not appear here.
    await expect.poll(() => calls.filter((c) => c.rpc === 'record_result').length).toBe(2);
    const states = calls.filter((c) => c.rpc === 'save_subject_state');
    expect(states.at(-1)?.args).toMatchObject({
      p_subject: 'morse',
      p_state: { unlocked: 2, met: ['K', 'M'], runs: 1 },
    });
    expect(calls.filter((c) => c.rpc === 'record_review').map((c) => c.args)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ p_subject: 'morse', p_item: 'char:K' }),
        expect.objectContaining({ p_subject: 'morse', p_item: 'char:M' }),
      ]),
    );
  });
});
