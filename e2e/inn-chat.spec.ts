import { expect, test } from '@playwright/test';
import { deckWord, signedIn, type SubjectCall } from './fake-supabase.ts';
import pack from '../content/arabic/core-words.json' with { type: 'json' };

// Sit and talk at the innkeeper's table (E17, ADR 0038). The partner function is mocked: the
// regular's lines here are ours, not a model's.
const GUEST = { lesson: 8, done: true, guest: true, ranks: ['guest'] };

interface InnAsk {
  kind: string;
  persona: { who: string; about: string };
  learner: { name: string };
  words: string[];
  told: string[];
  turns: { who: string; text: string }[];
}

test.describe('Sit and talk at the inn (E17)', () => {
  test('chat with a regular in Arabic, and it is remembered', async ({ page }) => {
    const asked: InnAsk[] = [];
    await page.route('**/api/partner', async (route) => {
      const ask = route.request().postDataJSON() as InnAsk;
      asked.push(ask);
      const text = ask.turns.length ? 'منيح! وإنت شو بتشتغل؟' : 'أهلا وسهلا! كيفك اليوم؟';
      await route.fulfill({ json: { text, left: 59 - asked.length } });
    });
    const calls: SubjectCall[] = [];
    await signedIn(page, [], calls, GUEST);
    await page.goto('/caravanserai?open=chat');

    await expect(page.getByRole('heading', { name: 'Who will you sit with?' })).toBeVisible();
    await expect(page.getByText(/written by an AI \(Groq\)/)).toBeVisible();
    const salim = page.getByRole('button', { name: /Salim the carter/ });
    await expect(salim).toBeDisabled();
    await page.getByLabel('The name they know you by').fill('Adam');
    await salim.click();

    await expect(page.getByText('أهلا وسهلا! كيفك اليوم؟')).toBeVisible();
    expect(asked[0]).toMatchObject({
      kind: 'inn-chat',
      persona: { who: 'Salim the carter' },
      learner: { name: 'Adam' },
      turns: [],
    });
    expect(asked[0]?.persona.about).toMatch(/^You are a man\./);

    // Tap their line: it's spelled in Hebrew letters.
    await page.getByRole('button', { name: /أهلا وسهلا/ }).click();
    await expect(page.locator('[lang="he"]')).toBeVisible();

    // Three lines of yours: typed, and keyed on the on-screen keyboard.
    const line = page.getByLabel('Your line, in Arabic');
    await line.fill('منيح، الحمد لله');
    await page.getByRole('button', { name: 'Say it' }).click();
    await expect(page.getByText('منيح! وإنت شو بتشتغل؟')).toBeVisible();
    const keys = page.getByRole('group', { name: 'Arabic keyboard' });
    for (const k of ['ط', 'ا', 'ل', 'ب'])
      await keys.getByRole('button', { name: k, exact: true }).click();
    await expect(line).toHaveValue('طالب');
    await page.getByRole('button', { name: 'Say it' }).click();
    await expect.poll(() => asked.length).toBe(3);
    await line.fill('شكرا');
    await page.getByRole('button', { name: 'Say it' }).click();
    await expect.poll(() => asked.length).toBe(4);
    expect(asked[3]?.turns.filter((t) => t.who === 'you').map((t) => t.text)).toEqual([
      'منيح، الحمد لله',
      'طالب',
      'شكرا',
    ]);
    await expect(page.getByText('Sit and talk · Salim the carter · 3 of 8')).toBeVisible();

    await page.getByRole('button', { name: 'Leave the table' }).click();
    await expect(page.getByText('+10 XP')).toBeVisible();
    await expect.poll(() => calls.some((c) => c.rpc === 'save_subject_state')).toBe(true);
    const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
      p_state: { chat: { name: string; told: Record<string, string[]>; chats: number } };
    };
    expect(saved.p_state.chat).toEqual({
      name: 'Adam',
      told: { 2: ['منيح، الحمد لله', 'طالب', 'شكرا'] },
      chats: 1,
    });
    await expect
      .poll(() => calls.find((c) => c.rpc === 'record_progress')?.args)
      .toMatchObject({
        p_xp: 10,
      });

    // The next chat brings what you told them.
    await page.getByRole('button', { name: 'Back to the table' }).click();
    await page.getByRole('button', { name: /Salim the carter/ }).click();
    await expect.poll(() => asked.length).toBe(5);
    expect(asked[4]?.told).toEqual(['منيح، الحمد لله', 'طالب', 'شكرا']);
  });

  test('when the partner is busy, the regular has to go, kindly', async ({ page }) => {
    await page.route('**/api/partner', (route) =>
      route.fulfill({ status: 503, json: { error: 'busy' } }),
    );
    await signedIn(page, [], [], { ...GUEST, chat: { name: 'Adam', told: {}, chats: 0 } });
    await page.goto('/caravanserai?open=chat');
    await page.getByRole('button', { name: /Salim the carter/ }).click();
    await expect(
      page.getByText('Salim the carter has to serve a customer.', { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to the table' })).toBeVisible();
  });

  test('opens from the innkeeper’s table, only for guests', async ({ page }) => {
    const first = pack.items[0]?.data.words[0];
    const row = { ...deckWord(1, 'نعم', first?.gloss ?? 'yes'), item_id: first?.deck ?? '' };
    await signedIn(page, [], [], GUEST, [row]);
    await page.goto('/caravanserai?open=words');
    await page.getByRole('button', { name: 'Sit and talk' }).click();
    await expect(page.getByRole('heading', { name: 'Who will you sit with?' })).toBeVisible();
  });
});
