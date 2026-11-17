import { expect, type Page, test } from '@playwright/test';
import { codeFor } from '../src/subjects/morse/code.ts';
import { signedIn, type SaveSessionArgs } from './fake-supabase.ts';

// Forty Winters (tasks 4.2 and 4.3, #334, #335; ADR 0047): the Silent Beacon's finale. With
// Math.random at 0 the far voice sends its first message; ?run=short plays only its first word.
const KOCH = 'KMURESNAPTLWI.JZ=FOY,VG5/Q92H38B?47C1D60X';
const ghost = {
  unlocked: 41,
  met: [...KOCH],
  trials: [1, 2, 3, 4, 5],
  ranks: ['listener', 'keyer', 'operator', 'telegraphist', 'signal-master', 'ghost'],
  rankTrials: ['lamp-signal', 'far-station', 'night-watch'],
  sending: { drills: 40, ditMs: 60, fastest: 40 },
  // Everything else on the road, done.
  runs: 60,
  prosigns: ['prosign:ar', 'prosign:sk', 'prosign:bt', 'prosign:kn'],
  recognition: { best: 30, rounds: 5, avgMs: {} },
  words: { rounds: 12, best: 10 },
  rush: { runs: 5, best: 20, topWpm: 30 },
  radio: { call: 'W1AW', name: 'ADAM', qth: 'HAIFA', contacts: 10, cleanFast: true },
};
const REPLY = 'SHE IS HERE = PLEASE WAIT';
const ANSWERS = ['Forty winters', 'The light', 'Whether she is there'];

const saves = (page: Page) => {
  const sent: SaveSessionArgs[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/rpc/save_session')) sent.push(r.postDataJSON() as SaveSessionArgs);
  });
  return sent;
};

/** Keys `text` on the space bar at 20 wpm: a dot of 60 ms. */
async function keyText(page: Page, text: string) {
  const dit = 60;
  for (const word of text.split(' ')) {
    for (const ch of word) {
      for (const el of codeFor(ch) ?? '') {
        await page.keyboard.down(' ');
        await page.waitForTimeout(el === '.' ? dit : dit * 3);
        await page.keyboard.up(' ');
        await page.waitForTimeout(dit);
      }
      await page.waitForTimeout(dit * 2);
    }
    await page.waitForTimeout(dit * 4);
  }
}

async function hearAndAnswer(page: Page, answers: readonly string[]) {
  await page.getByRole('button', { name: 'Listen' }).click();
  await expect(page.getByText('On the air… Listen. Don’t write.')).toBeVisible();
  // Head copy: nothing to type while it plays.
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'I have it' }).click({ timeout: 20_000 });
  const answer = page.getByRole('button', { name: 'Answer it' });
  await expect(answer).toBeDisabled();
  for (const a of answers) await page.getByLabel(a, { exact: true }).check();
  await answer.click();
}

test.describe('Forty Winters, the Silent Beacon’s finale', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
  });

  test('stays shut until you are a Ghost of the Ether', async ({ page }) => {
    await signedIn(page, [], [], { ...ghost, ranks: ['listener'] });
    await page.goto('/signal-tower?open=beacon');
    await expect(page.getByRole('heading', { name: 'Forty Winters' })).toBeVisible();
    await expect(page.getByText('Opens once you are a Ghost of the Ether.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Listen' })).toHaveCount(0);
  });

  test('the compass leads a Ghost to the finale', async ({ page }) => {
    await signedIn(page, [], [], ghost);
    await page.goto('/signal-tower');
    await expect(
      page.getByRole('button', { name: 'Step 75 of 75 · the road so far' }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: /Next: At nine minutes past, answer the far voice/ })
      .click();
    await expect(page.getByRole('heading', { name: 'Forty Winters' })).toBeVisible();
  });

  test('heard once, understood and answered: the finale, saved with its event', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const sent = saves(page);
    await signedIn(page, [], [], ghost);
    await page.goto('/signal-tower?open=beacon&run=short');
    await hearAndAnswer(page, ANSWERS);
    await expect(page.getByText(REPLY, { exact: true })).toBeVisible();
    await keyText(page, REPLY);
    await expect(page.getByRole('img', { name: /The lantern room at night/ })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('You are Keeper of the Hour.', { exact: false })).toBeVisible();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]?.p_events).toEqual([{ kind: 'trial-forty-winters', count: 1 }]);
    expect((sent[0]?.p_state as { rankTrials: string[] }).rankTrials).toContain('forty-winters');
    await page.getByRole('button', { name: 'Somebody is calling: the Radio Room' }).click();
    await expect(page.getByRole('heading', { name: 'Forty Winters' })).toHaveCount(0);
  });

  test('a question missed: not tonight, saved with no event, and it can be heard again', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const sent = saves(page);
    await signedIn(page, [], [], ghost);
    await page.goto('/signal-tower?open=beacon&run=short');
    await hearAndAnswer(page, ['Four winters', ...ANSWERS.slice(1)]);
    await keyText(page, REPLY);
    await expect(page.getByRole('heading', { name: 'Not tonight' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('it said: Forty winters')).toBeVisible();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]?.p_events).toEqual([]);
    // Again, and the far voice sends another message: a retry is never a memory test.
    await page.getByRole('button', { name: 'Listen again' }).click();
    await page.getByRole('button', { name: 'I have it' }).click({ timeout: 20_000 });
    await expect(page.getByText('How long has the far voice kept the hour?')).toHaveCount(0);
  });
});
