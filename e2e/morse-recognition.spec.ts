import { expect, test } from '@playwright/test';
import { signedIn, type SubjectCall } from './fake-supabase.ts';

test.describe('Instant Recognition in the Signal Tower (#32)', () => {
  test('a short round: letters play, answers score, the result lists the letters', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const calls: SubjectCall[] = [];
    await signedIn(page, [], calls);
    // run=short: a 10-second round instead of 60.
    await page.goto('/signal-tower?run=short');
    await page.getByRole('button', { name: /Instant Recognition/ }).click();
    await expect(page.getByText('Your letters: K M')).toBeVisible();
    await page.getByRole('button', { name: 'Start round' }).click();

    const keys = page
      .getByRole('group', { name: 'Letter keys' })
      .or(page.getByLabel('Letter keys'));
    for (let i = 0; i < 4; i++) {
      await expect(page.getByText('Which letter?')).toBeVisible({ timeout: 8000 });
      await keys.getByRole('button', { name: 'K', exact: true }).click();
    }

    await expect(page.getByText('points', { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/\d+ of \d+ right/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Slowest letters first' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();
    await expect(page.getByText(/Your best: \d+ · \+\d+ XP/)).toBeVisible();

    // The round is saved: state with the best score, then a receive rating per letter played.
    await expect.poll(() => calls.some((c) => c.rpc === 'record_result')).toBe(true);
    const state = calls.find((c) => c.rpc === 'save_subject_state');
    expect(state?.args).toMatchObject({
      p_subject: 'morse',
      p_state: { unlocked: 2, recognition: { rounds: 1 } },
    });
    for (const c of calls.filter((c) => c.rpc === 'record_result')) {
      expect(c.args).toMatchObject({ p_subject: 'morse', p_skill: 'receive' });
    }
  });
});
