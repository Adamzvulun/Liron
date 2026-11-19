import { expect, test } from './fixtures.ts';
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
    // A round that scored nothing has no best to show yet (review, 2026-11-15).
    await expect(page.getByText(/^(Your best: [1-9]\d* · )?\+\d+ XP$/)).toBeVisible();

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

    // The road (the-road.md §6): this first round was a step, so its title and its line of the
    // tale are shown, and the first button leads to the road's next step, at its own door.
    await expect(page.getByText('Before the Lamp Fades')).toBeVisible();
    await page.getByRole('button', { name: 'Next: Hear your first two sounds, K and M' }).click();
    await expect(page.getByRole('heading', { name: 'Hear K and M' })).toBeVisible();
  });

  test('a step is announced once: the next round behind the same door doesn’t repeat it (review, 2026-11-19)', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await signedIn(page, []);
    await page.goto('/signal-tower?run=short');
    await page.getByRole('button', { name: /Instant Recognition/ }).click();
    const keys = page
      .getByRole('group', { name: 'Letter keys' })
      .or(page.getByLabel('Letter keys'));
    const round = async (start: string) => {
      await page.getByRole('button', { name: start }).click();
      await expect(page.getByText('Which letter?')).toBeVisible({ timeout: 8000 });
      await keys.getByRole('button', { name: 'K', exact: true }).click();
      await expect(page.getByText('points', { exact: true })).toBeVisible({ timeout: 20_000 });
    };
    await round('Start round');
    await expect(page.getByText('Before the Lamp Fades')).toBeVisible();
    await round('Play again');
    await expect(page.getByRole('button', { name: /^Next: / })).toBeVisible();
    await expect(page.getByText('Before the Lamp Fades')).toHaveCount(0);
  });
});
