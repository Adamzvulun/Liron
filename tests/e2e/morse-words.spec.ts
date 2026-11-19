import { expect, test } from './fixtures.ts';
import { signedIn, type SubjectCall } from './fake-supabase.ts';

test.describe('the Codebook in the Signal Tower (#154)', () => {
  test('is locked until the Gatekeeper is passed', async ({ page }) => {
    await signedIn(page, []);
    await page.goto('/signal-tower');
    await expect(
      page.getByText('Opens at step 11 · The Logbook’s Words').filter({ visible: true }),
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
    // The number and "XP" never break apart on a narrow phone.
    await expect(page.getByText(/^\+\d+ XP$/)).toHaveCSS('white-space', 'nowrap');
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

  test('after tapping letters, Enter answers instead of typing the last one again (review, 2026-11-15)', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await signedIn(page, [], [], { unlocked: 9, met: [...'KMURESNAP'], trials: [1] });
    await page.goto('/signal-tower?run=short');
    await page
      .getByRole('button', { name: /Codebook/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Start a round' }).click();
    await expect(page.getByText('Word 1 of 3 · type what you heard')).toBeVisible({
      timeout: 10_000,
    });
    const pad = page.getByLabel('Letter keys');
    await pad.getByRole('button', { name: 'A', exact: true }).click();
    await pad.getByRole('button', { name: 'M', exact: true }).click();
    await page.keyboard.press('Enter');
    await expect(page.getByText(/^Right\.|You copied AM\./)).toBeVisible();
  });

  test('the callsign rush opens with a digit, and saves its score', async ({ page }) => {
    test.setTimeout(60_000);
    const calls: SubjectCall[] = [];
    const koch = 'KMURESNAPTLWI.JZ=FOY,VG5';
    await signedIn(page, [], calls, { unlocked: 24, met: [...koch], trials: [1, 2] });
    await page.goto('/signal-tower?open=words&run=short');
    await page.getByRole('button', { name: 'Start the rush' }).click();

    for (let i = 1; i <= 3; i++) {
      await expect(
        page.getByText(new RegExp(`^Call ${i} of 3 · \\d+ wpm · score \\d+ · type the call$`)),
      ).toBeVisible({
        timeout: 10_000,
      });
      await page.keyboard.press('k');
      await page.keyboard.press('5');
      await page.keyboard.press('Enter');
    }

    await expect(page.getByText('Rush finished')).toBeVisible();
    await expect(page.getByText(/Score \d+ · \d of 3 calls/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rush again' })).toBeVisible();
    // Nothing copied on a first rush: no "Your best: 0" (review, 2026-11-15).
    await expect(page.getByText(/Your best/)).toHaveCount(0);
    await expect
      .poll(() => calls.find((c) => c.rpc === 'save_subject_state')?.args)
      .toMatchObject({ p_subject: 'morse', p_state: { rush: { runs: 1 } } });
  });

  test('before a digit, the rush says when it opens', async ({ page }) => {
    await signedIn(page, [], [], { unlocked: 9, met: [...'KMURESNAP'], trials: [1] });
    await page.goto('/signal-tower?open=words');
    await expect(page.getByText(/Opens with your first digit/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start the rush' })).toHaveCount(0);
  });
});
