import { expect, test } from '@playwright/test';
import { deckWord, pathWord, signedIn, type SubjectCall } from './fake-supabase.ts';
import { ECHO_POOL } from '../src/subjects/arabic/words.ts';
import pack from '../content/arabic/core-words.json' with { type: 'json' };
import { tipId } from '../src/subjects/arabic/chat/innChat.ts';

// Sit and talk at the innkeeper's table (E17, ADR 0038). The partner function is mocked: the
// regular's lines here are ours, not a model's.
const GUEST = { lesson: 8, done: true, guest: true, ranks: ['guest'] };

interface InnAsk {
  kind: string;
  persona: { who: string; about: string };
  learner: { name: string };
  words: string[];
  told: string[];
  met: number;
  turns: { who: string; text: string }[];
}

test.describe('Sit and talk at the inn (E17)', () => {
  test('chat with a regular in Arabic, and it is remembered', async ({ page }) => {
    const asked: InnAsk[] = [];
    await page.route('**/api/partner', async (route) => {
      const ask = route.request().postDataJSON() as InnAsk;
      if (ask.kind === 'inn-coach') {
        const tip = { said: 'شكرا', better: 'شكرًا كتير', why: 'Warmer, the way people say it.' };
        return route.fulfill({ json: { text: JSON.stringify({ tips: [tip] }), left: 40 } });
      }
      asked.push(ask);
      const text = ask.turns.length ? 'منيح! وإنت شو بتشتغل؟' : 'أهلا وسهلا! كيفك اليوم؟';
      await route.fulfill({ json: { text, left: 59 - asked.length } });
    });
    const calls: SubjectCall[] = [];
    const events: string[][] = [];
    page.on('request', (r) => {
      if (r.url().includes('/rpc/save_session')) {
        const body = r.postDataJSON() as { p_events?: { kind: string }[] };
        events.push((body.p_events ?? []).map((e) => e.kind));
      }
    });
    await signedIn(page, [], calls, GUEST);
    await page.goto('/caravanserai?open=chat');

    await expect(page.getByRole('heading', { name: 'Who will you sit with?' })).toBeVisible();
    await expect(page.getByText(/written by an AI \(Groq\)/)).toBeVisible();
    const salim = page.getByRole('button', { name: /Salim the carter/ });
    await expect(salim).toBeDisabled();
    await expect(salim).toContainText('New face');
    await page.getByLabel('The name they know you by').fill('Adam');
    await salim.click();

    await expect(page.getByText('أهلا وسهلا! كيفك اليوم؟')).toBeVisible();
    expect(asked[0]).toMatchObject({
      kind: 'inn-chat',
      persona: { who: 'Salim the carter' },
      learner: { name: 'Adam' },
      turns: [],
      met: 0,
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
    // The contract's event, and the first chat with this regular (migration 20261209000000).
    expect(events[0]).toEqual(['inn-chat', 'inn-regular']);
    const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
      p_state: { chat: { name: string; told: Record<string, string[]>; chats: number } };
    };
    expect(saved.p_state.chat).toEqual({
      name: 'Adam',
      told: { 2: ['منيح، الحمد لله', 'طالب', 'شكرا'] },
      chats: 1,
      met: { 2: 1 },
      hebrew: false,
      tips: [],
    });
    await expect
      .poll(() => calls.find((c) => c.rpc === 'record_progress')?.args)
      .toMatchObject({
        p_xp: 10,
      });

    // The Coach looks at your lines, after the chat.
    await page.getByRole('button', { name: 'Ask the Coach' }).click();
    const coach = page.getByLabel('The Coach');
    await expect(coach.getByText('شكرًا كتير')).toBeVisible();
    await expect(coach.getByText('Warmer, the way people say it.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ask the Coach' })).toHaveCount(0);
    // The tip is kept for practice, as a review item.
    await expect(coach.getByText('Kept for practice')).toBeVisible();
    await expect
      .poll(() => calls.filter((c) => c.rpc === 'record_review').map((c) => c.args))
      .toEqual([expect.objectContaining({ p_item: tipId('شكرًا كتير') })]);

    // The next chat brings what you told them.
    await page.getByRole('button', { name: 'Back to the table' }).click();
    await expect(salim).toContainText('Knows you');
    await salim.click();
    await expect.poll(() => asked.length).toBe(5);
    expect(asked[4]?.told).toEqual(['منيح، الحمد لله', 'طالب', 'شكرا']);
    expect(asked[4]?.met).toBe(1);
  });

  test('a long chat keeps the newest line in view', async ({ page }) => {
    let n = 0;
    await page.route('**/api/partner', (route) =>
      route.fulfill({ json: { text: `أهلا وسهلا، كيفك اليوم يا صاحبي؟ ${++n}`, left: 50 } }),
    );
    await signedIn(page, [], [], { ...GUEST, chat: { name: 'Adam', told: {}, chats: 0 } });
    await page.goto('/caravanserai?open=chat');
    await page.getByRole('button', { name: /Salim the carter/ }).click();
    const line = page.getByLabel('Your line, in Arabic');
    for (let i = 1; i <= 6; i++) {
      await line.fill(`منيح، الحمد لله ${i}`);
      await page.getByRole('button', { name: 'Say it' }).click();
      await expect(page.getByText(`كيفك اليوم يا صاحبي؟ ${i + 1}`)).toBeAttached();
    }
    await expect(page.getByText('كيفك اليوم يا صاحبي؟ 7')).toBeInViewport();
  });

  test('the Coach’s phrases come back when they’re due', async ({ page }) => {
    const tip = { said: 'نعم أريد قهوة', better: 'آه بدّي قهوة', why: 'نعم and أريد are formal.' };
    const id = tipId(tip.better);
    const calls: SubjectCall[] = [];
    const coffee = pathWord(2, 'قهوة', 'the deck’s English');
    const gloss = ECHO_POOL.words.get(coffee.item_id)?.gloss ?? '';
    await signedIn(
      page,
      [],
      calls,
      { ...GUEST, chat: { name: 'Adam', told: {}, chats: 1, tips: [{ ...tip, id }] } },
      [coffee],
    );
    await page.route('**/rest/v1/review_cards*', (route) =>
      route.fulfill({ json: [{ item_id: id, due: '2026-01-01T00:00:00Z' }] }),
    );
    await page.goto('/caravanserai?open=chat');
    await page.getByRole('button', { name: 'The Coach’s phrases · 1' }).click();
    await expect(page.getByText('نعم أريد قهوة')).toBeVisible();
    await expect(page.getByText('آه بدّي قهوة')).toHaveCount(0);
    await page.getByRole('button', { name: 'Show' }).click();
    await expect(page.getByText('آه بدّي قهوة')).toBeVisible();
    await expect(page.locator('.arabic__bubble-glosses')).toHaveText(`قهوة ${gloss}`);
    await page.getByRole('button', { name: 'I had it' }).click();
    await expect(page.getByText('1 of 1 said the Palestinian way.')).toBeVisible();
    await expect
      .poll(() => calls.filter((c) => c.rpc === 'record_review').map((c) => c.args))
      .toEqual([expect.objectContaining({ p_item: id, p_rating: 3 })]);
    await page.getByRole('button', { name: 'Back to the table' }).click();
    await expect(page.getByRole('button', { name: /The Coach’s phrases/ })).toHaveCount(0);
  });

  test('their line and the Coach’s show the words you have met, with our glosses', async ({
    page,
  }) => {
    await page.route('**/api/partner', (route) => {
      const ask = route.request().postDataJSON() as InnAsk;
      const tip = { said: 'الآن', better: 'هلّق، اليوم', why: 'Palestinians say هلّق.' };
      const text =
        ask.kind === 'inn-coach' ? JSON.stringify({ tips: [tip] }) : 'صباح الخير! شو أخبار اليوم؟';
      return route.fulfill({ json: { text, left: 59 } });
    });
    const today = pathWord(1, 'اليوم', 'the deck’s English');
    const gloss = ECHO_POOL.words.get(today.item_id)?.gloss ?? '';
    await signedIn(page, [], [], { ...GUEST, chat: { name: 'Adam', told: {}, chats: 0 } }, [today]);
    await page.goto('/caravanserai?open=chat');
    await page.getByRole('button', { name: /Salim the carter/ }).click();
    await page.getByRole('button', { name: /صباح الخير/ }).click();
    const glosses = page.locator('.arabic__bubble-glosses');
    await expect(glosses).toHaveText(`اليوم ${gloss}`);
    await expect(glosses).not.toContainText('the deck’s English');

    await page.getByLabel('Your line, in Arabic').fill('الآن');
    await page.getByRole('button', { name: 'Say it' }).click();
    await page.getByRole('button', { name: 'Leave the table' }).click();
    await page.getByRole('button', { name: 'Ask the Coach' }).click();
    await expect(page.getByLabel('The Coach').locator('.arabic__bubble-glosses')).toHaveText(
      `اليوم ${gloss}`,
    );
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

  test('type in Hebrew letters: they read it in Arabic, and the choice is kept', async ({
    page,
  }) => {
    const asked: InnAsk[] = [];
    await page.route('**/api/partner', async (route) => {
      asked.push(route.request().postDataJSON() as InnAsk);
      await route.fulfill({ json: { text: 'أهلا! كيفك؟', left: 50 } });
    });
    const calls: SubjectCall[] = [];
    await signedIn(page, [], calls, { ...GUEST, chat: { name: 'Adam', told: {}, chats: 0 } });
    await page.goto('/caravanserai?open=chat');
    await page.getByRole('button', { name: /Salim the carter/ }).click();
    await expect(page.getByText('أهلا! كيفك؟')).toBeVisible();

    await page.getByRole('button', { name: 'Hebrew letters' }).click();
    await expect(page.getByRole('group', { name: 'Arabic keyboard' })).toHaveCount(0);
    await page.getByLabel('Your line, in Hebrew letters').fill("מניח, ח'לאץ");
    await expect(page.getByText('They read: منيح، خلاص')).toBeVisible();
    await page.getByRole('button', { name: 'Say it' }).click();
    await expect.poll(() => asked.length).toBe(2);
    expect(asked[1]?.turns.at(-1)).toEqual({ who: 'you', text: 'منيح، خلاص' });

    await page.getByRole('button', { name: 'Leave the table' }).click();
    await expect.poll(() => calls.some((c) => c.rpc === 'save_subject_state')).toBe(true);
    const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
      p_state: { chat: { hebrew: boolean } };
    };
    expect(saved.p_state.chat.hebrew).toBe(true);
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
