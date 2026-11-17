import { expect, test } from '@playwright/test';
import { GREETINGS, signedIn } from './fake-supabase.ts';

// "Would they understand me?" (ADR 0014) in the coffee corner, with Chromium's fake microphone
// (a beep) allowed without a prompt, and our function (api/understood.ts) faked.
test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
});

test('sends a recording to Groq only when asked, and shows what it heard', async ({ page }) => {
  await signedIn(page, [], [], null, GREETINGS);
  // Our function, faked: it hears whatever the test says.
  const sent: { auth: string | null; type: string | null }[] = [];
  let answer: { status: number; json: object } = { status: 200, json: {} };
  await page.route('**/api/understood', (route) => {
    const r = route.request();
    sent.push({
      auth: r.headers()['authorization'] ?? null,
      type: r.headers()['content-type'] ?? null,
    });
    return route.fulfill(answer);
  });
  await page.goto('/caravanserai');
  await page.getByRole('button', { name: /Coffee corner/ }).click();
  await page.getByRole('button', { name: 'Meet the phrases' }).click();
  // Meeting a phrase has the recorder but no check.
  await page.getByRole('button', { name: '● Record yourself' }).click();
  await page.getByRole('button', { name: '■ Stop' }).click();
  await expect(page.getByRole('button', { name: '▶ You' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Would they understand me?' })).toBeHidden();
  for (let i = 0; i < 9; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Start practice' }).click();
  for (let i = 0; i < 10; i++) {
    await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
    await page.getByRole('button', { name: 'Next' }).click();
  }

  await expect(page.getByText('Say it · 1 of 10')).toBeVisible();
  const target = (await page.locator('.arabic__phrase-ar').textContent()) ?? '';
  await page.getByRole('button', { name: '● Record yourself' }).click();
  await page.getByRole('button', { name: '■ Stop' }).click();
  const ask = page.getByRole('button', { name: 'Would they understand me?' });
  await expect(ask).toBeVisible();
  await expect(page.getByText('Sends this recording to Groq')).toBeVisible();
  expect(sent).toHaveLength(0);

  answer = { status: 200, json: { text: target, left: 99 } };
  await ask.click();
  await expect(page.getByText('Understood ✓ · Groq heard')).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(sent[0]?.auth).toMatch(/^Bearer \S+/);
  expect(sent[0]?.type).toMatch(/^multipart\/form-data/);

  // Recording again offers a fresh check; a wrong answer says so.
  answer = { status: 200, json: { text: 'شكرا كتير', left: 98 } };
  await page.getByRole('button', { name: '● Record again' }).click();
  await page.getByRole('button', { name: '■ Stop' }).click();
  await ask.click();
  await expect(page.getByText('Not quite · Groq heard')).toBeVisible();

  // The learner still rates the phrase; the check only advises.
  await page.getByRole('button', { name: 'Close enough' }).click();
  await expect(page.getByText('Say it · 2 of 10')).toBeVisible();
  answer = { status: 429, json: { error: 'daily-limit' } };
  await page.getByRole('button', { name: '● Record yourself' }).click();
  await page.getByRole('button', { name: '■ Stop' }).click();
  await ask.click();
  await expect(page.getByText('That’s all of today’s checks.')).toBeVisible();
  expect(sent).toHaveLength(3);
});
