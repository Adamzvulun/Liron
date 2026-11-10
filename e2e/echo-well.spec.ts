import { expect, test } from '@playwright/test';
import { pathWord, signedIn, type SubjectCall } from './fake-supabase.ts';

// The echo well (#193): "Hear the difference", ear training on sound pairs. Made-up deck-like
// words (not the deck's own), romanized the deck's way: ɧ for ح, h for ه. They borrow word-path
// ids, since the well draws only on the path and the reviewed lesson words.
const word = (n: number, arabic: string, latin: string) => {
  const row = pathWord(n, arabic, `word ${n}`);
  return { ...row, data: { ...row.data, pronunciation: latin } };
};
const ROWS = [
  word(1, 'حسك', 'ɧask'),
  word(2, 'حشك', 'ɧašk'),
  word(3, 'حسن', 'ɧasan'),
  word(4, 'حكم', 'ɧukum'),
  word(5, 'حشم', 'ɧašam'),
  word(6, 'هسك', 'hask'),
  word(7, 'هشك', 'hašk'),
  word(8, 'هسن', 'hasan'),
  word(9, 'هكم', 'hukum'),
  word(10, 'هشم', 'hašam'),
];

test.describe('The echo well (#193)', () => {
  test('opens from the courtyard on the first pair, ḥ or h', async ({ page }) => {
    await signedIn(page, [], [], { lesson: 2 }, ROWS);
    await page.goto('/caravanserai');
    // Only the painting and its plaque take clicks: click the plaque (or the phone's card).
    await page
      .getByText('The echo well', { exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'ḥ or h' })).toBeVisible();
    await expect(page.getByText('Right in a row: 0 of 20.', { exact: false })).toBeVisible();
    await expect(page.getByRole('list', { name: 'The pairs' }).getByRole('listitem')).toHaveCount(
      8,
    );
  });

  test('a round of ten is asked, answered and saved on its pair', async ({ page }) => {
    const calls: SubjectCall[] = [];
    await signedIn(page, [], calls, { lesson: 2, echo: { heard: [], streak: 4 } }, ROWS);
    await page.goto('/caravanserai?open=echo');
    await page.getByRole('button', { name: 'Listen' }).click();
    for (let i = 0; i < 10; i++) {
      await expect(page.getByText(`Which sound? · ${i + 1} of 10`)).toBeVisible();
      const choices = page.getByRole('group', { name: 'Choices' }).getByRole('button');
      await expect(choices).toHaveCount(2);
      await choices.first().click();
      await expect(page.getByText(/^(Right!|Not quite\.)$/)).toBeVisible();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(page.getByText('Round done')).toBeVisible();

    await expect.poll(() => calls.some((c) => c.rpc === 'save_subject_state')).toBe(true);
    const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
      p_state: { echo: { heard: string[]; streak: number; rounds: number } };
    };
    expect(saved.p_state.echo.rounds).toBe(1);
    expect(saved.p_state.echo.heard).toEqual([]);
    const rated = calls.filter((c) => c.rpc === 'record_result');
    expect(rated).toHaveLength(10);
    for (const r of rated)
      expect(r.args).toMatchObject({ p_skill: 'listen', p_item: 'pair:hah-heh' });
    // Five words start with each sound, and the first choice is always ḥ: five right.
    const right = rated.filter((r) => (r.args as { p_score: number }).p_score === 1).length;
    expect(right).toBe(5);
    await expect(page.getByText('+5 XP')).toBeVisible();
  });
});
