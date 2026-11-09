import { expect, test } from '@playwright/test';
import { signedIn, type SubjectCall } from './fake-supabase.ts';

test.describe('the Codebook in the Signal Tower (#154)', () => {
  test('is locked until the Gatekeeper is passed', async ({ page }) => {
    await signedIn(page, []);
    await page.goto('/signal-tower');
    await expect(
      page.getByText('Locked · pass the Gatekeeper').filter({ visible: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Codebook/ })).toHaveCount(0);
  });

  test('a short round: words play, you copy them, the round is saved', async ({ page }) => {
    test.setTimeout(60_000);
    const calls: SubjectCall[] = [];
    await signedIn(page, [], calls, { unlocked: 9, met: [...'KMURESNAP'], trials: [1] });
    // run=short: a round of 3 words instead of 10.
    await page.goto('/signal-tower?run=short');
    await page
      .getByRole('button', { name: /Codebook/ })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'The Codebook' })).toBeVisible();
    await expect(page.getByText(/\d+ words open/)).toBeVisible();
    await page.getByRole('button', { name: 'Start a round' }).click();

    for (let i = 1; i <= 3; i++) {
      await expect(page.getByText(`Word ${i} of 3 · type what you heard`)).toBeVisible({
        timeout: 10_000,
      });
      await page.keyboard.press('a');
      await page.keyboard.press('Enter');
      await expect(page.getByText(/^Right\.|You copied A\./)).toBeVisible();
      await page.keyboard.press('Enter');
    }

    await expect(page.getByText('Round finished')).toBeVisible();
    await expect(page.getByText(/\d of 3 words · \+\d+ XP/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Another round' })).toBeVisible();

    // One save: the state with the round counted, and a head-copy result per word.
    await expect.poll(() => calls.filter((c) => c.rpc === 'record_result').length).toBe(3);
    expect(calls.find((c) => c.rpc === 'save_subject_state')?.args).toMatchObject({
      p_subject: 'morse',
      p_state: { words: { rounds: 1 } },
    });
    for (const c of calls.filter((c) => c.rpc === 'record_result'))
      expect(c.args).toMatchObject({ p_subject: 'morse', p_skill: 'head-copy' });
  });
});
