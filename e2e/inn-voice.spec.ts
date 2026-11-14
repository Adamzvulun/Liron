import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

// Say your line at the inn (E17, ADR 0014, 0038), with Chromium's fake microphone (a beep)
// allowed without a prompt. Our functions are faked: Whisper "hears" a line, the regular answers.
test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
});

const GUEST = { lesson: 8, done: true, guest: true, ranks: ['guest'] };

test('say your line: Whisper writes it in the box, and you send it', async ({ page }) => {
  const asked: { turns: { who: string; text: string }[] }[] = [];
  await page.route('**/api/partner', async (route) => {
    asked.push(route.request().postDataJSON() as (typeof asked)[number]);
    await route.fulfill({ json: { text: 'أهلا! كيفك؟', left: 50 } });
  });
  let heard = 0;
  await page.route('**/api/understood', (route) => {
    heard++;
    return route.fulfill({ json: { text: 'منيح الحمد لله', left: 90 } });
  });
  await signedIn(page, [], [], { ...GUEST, chat: { name: 'Adam', told: {}, chats: 0 } });
  await page.goto('/caravanserai?open=chat');
  await expect(page.getByText(/or say into the microphone/)).toBeVisible();
  await page.getByRole('button', { name: /Salim the carter/ }).click();
  await expect(page.getByText('أهلا! كيفك؟')).toBeVisible();
  expect(heard).toBe(0);

  await page.getByRole('button', { name: '🎙 Say your line' }).click();
  await page.getByRole('button', { name: '■ Stop' }).click();
  await expect(page.getByLabel('Your line, in Arabic')).toHaveValue('منيح الحمد لله');
  expect(heard).toBe(1);
  await page.getByRole('button', { name: 'Say it' }).click();
  await expect.poll(() => asked.length).toBe(2);
  expect(asked[1]?.turns.at(-1)).toEqual({ who: 'you', text: 'منيح الحمد لله' });
});

test('when the listening fails, it says so and you can type', async ({ page }) => {
  await page.route('**/api/partner', (route) =>
    route.fulfill({ json: { text: 'أهلا! كيفك؟', left: 50 } }),
  );
  await page.route('**/api/understood', (route) =>
    route.fulfill({ status: 429, json: { error: 'daily-limit' } }),
  );
  await signedIn(page, [], [], { ...GUEST, chat: { name: 'Adam', told: {}, chats: 0 } });
  await page.goto('/caravanserai?open=chat');
  await page.getByRole('button', { name: /Salim the carter/ }).click();
  await page.getByRole('button', { name: '🎙 Say your line' }).click();
  await page.getByRole('button', { name: '■ Stop' }).click();
  await expect(page.getByText('That’s all the listening for today.')).toBeVisible();
  await expect(page.getByLabel('Your line, in Arabic')).toHaveValue('');
});
