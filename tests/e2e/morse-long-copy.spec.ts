import { MORSE_CHARS } from '../../src/subjects/morse/code.ts';
import { expect, test } from './fixtures.ts';
import { signedIn, type SubjectCall } from './fake-supabase.ts';

const ALL = MORSE_CHARS.map((c) => c.char);

test.describe('The Long Copy in the Codebook (#509)', () => {
  test('a round at 25 wpm: the line plays, three questions, a head-copy result is saved', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const calls: SubjectCall[] = [];
    await signedIn(page, [], calls, {
      unlocked: ALL.length,
      met: ALL,
      trials: [1],
      charWpm: 25,
      effWpm: 25,
      rungs: [22, 25],
    });
    await page.goto('/signal-tower');
    await page
      .getByRole('button', { name: /Codebook/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Start a Long Copy' }).click();
    await expect(page.getByText(/25 wpm · listening…/)).toBeVisible();
    // Nothing of the line shows until it has ended.
    await expect(page.getByText('What did it say?')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('fieldset')).toHaveCount(3);
    for (const fieldset of await page.locator('fieldset').all()) {
      await expect(fieldset.getByRole('radio')).toHaveCount(4);
      await fieldset.getByRole('radio').first().check({ force: true });
    }
    await page.getByRole('button', { name: 'Answer it' }).click();
    await expect(page.getByText(/The Long Copy · 25 wpm/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Another line' })).toBeVisible();
    await expect.poll(() => calls.filter((c) => c.rpc === 'record_result').length).toBe(1);
    expect(calls.find((c) => c.rpc === 'record_result')?.args).toMatchObject({
      p_subject: 'morse',
      p_skill: 'head-copy',
      p_item: 'long-copy:25',
    });
  });

  test('from 28 wpm the line plays once and you type it a word behind', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: SubjectCall[] = [];
    await signedIn(page, [], calls, {
      unlocked: ALL.length,
      met: ALL,
      trials: [1],
      charWpm: 28,
      effWpm: 28,
      rungs: [22, 25, 28],
    });
    await page.goto('/signal-tower');
    await page
      .getByRole('button', { name: /Codebook/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Start a Long Copy' }).click();
    await expect(page.getByText(/28 wpm, once · copy one word behind/)).toBeVisible();
    await page.getByLabel('Your copy, word by word').fill('cq de qn4il');
    await expect(page.getByRole('button', { name: 'Done' })).toBeDisabled();
    await expect(page.getByText(/finish/)).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByText('You copied: CQ DE QN4IL')).toBeVisible();
    await expect.poll(() => calls.filter((c) => c.rpc === 'record_result').length).toBe(1);
    expect(calls.find((c) => c.rpc === 'record_result')?.args).toMatchObject({
      p_skill: 'head-copy',
      p_item: 'long-copy:28',
    });
  });
});
