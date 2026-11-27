import { MORSE_CHARS } from '../../src/subjects/morse/code.ts';
import { expect, test } from './fixtures.ts';
import { signedIn, type SubjectCall } from './fake-supabase.ts';

const ALL = MORSE_CHARS.map((c) => c.char);
const morse = {
  unlocked: ALL.length,
  met: ALL,
  trials: [1],
  runs: 3,
  charWpm: 25,
  effWpm: 25,
  rungs: [22, 25],
};

test.describe('the milestone check (#517)', () => {
  test('one check: six answers, a Long Copy probe, a saved row, a new point, no rating', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const calls: SubjectCall[] = [];
    const saved: { subject: string; answers: number[]; probe: number | null }[] = [];
    await signedIn(page, [], calls, morse, [], {
      milestone: { checks: [], saved },
    });
    await page.goto('/house#ledger');
    const check = page.getByRole('region', { name: 'The milestone check' });
    await check.getByRole('button', { name: 'Take the check' }).click();
    // Both roads are started (the fake serves one state to every guild); the Arabic deck isn't
    // served here, so its probe has nothing to ask.
    await expect(page.getByRole('region', { name: 'Caravanserai' })).toContainText('Step 2 of');
    for (const place of ['Signal Tower', 'Caravanserai']) {
      await expect(check.getByText(`${place}: can you?`)).toBeVisible();
      await expect(check.locator('fieldset')).toHaveCount(6);
      if (process.env.SHOT_FORM && place === 'Signal Tower')
        await check.screenshot({ path: process.env.SHOT_FORM });
      await expect(check.getByRole('button', { name: 'Next: show it' })).toBeDisabled();
      for (const fieldset of await check.locator('fieldset').all()) {
        await fieldset.getByRole('radio', { name: 'With help' }).check({ force: true });
      }
      await check.getByRole('button', { name: 'Next: show it' }).click();
      if (place === 'Signal Tower') {
        await expect(page.getByText('What did it say?')).toBeVisible({ timeout: 90_000 });
        for (const fieldset of await page.locator('fieldset').all()) {
          await fieldset.getByRole('radio').first().check({ force: true });
        }
        await page.getByRole('button', { name: 'Answer it' }).click();
      }
    }
    await expect(check.getByText(/Finished/)).toBeVisible();
    expect(saved.map((r) => r.subject)).toEqual(['morse', 'arabic']);
    expect(saved[0]?.probe).toBeGreaterThanOrEqual(0);
    // The fake serves an empty deck, so Arabic has nothing to ask and saves without a probe.
    expect(saved[1]).toMatchObject({ answers: [1, 1, 1, 1, 1, 1], probe: null });
    // The probe is a measurement: no result, review or session was saved.
    expect(calls.filter((c) => /record_result|record_review|save_session/.test(c.rpc))).toEqual([]);
    // The ledger now draws the check as a point, with the answers next to it.
    const tower = page.getByRole('region', { name: 'Signal Tower' });
    await expect(tower.getByText('Milestone checks')).toBeVisible();
    await expect(tower.getByText(/0 yes, 6 with help, 0 not yet; probe \d+%/)).toBeVisible();
    await expect(tower.locator('circle')).toHaveCount(1);
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });
  });

  test('the compass offers it 28 days after the first practice, once', async ({ page }) => {
    await signedIn(page, [], [], morse, [], {
      ledger: { days: [{ day: '2020-01-01', minutes: 10 }] },
      milestone: { checks: [], saved: [] },
    });
    await page.goto('/');
    await expect(page.getByText(/take the milestone check/).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(/take the milestone check/)).toHaveCount(0);
  });
});
