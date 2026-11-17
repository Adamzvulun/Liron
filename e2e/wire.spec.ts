import { expect, test, type Page } from '@playwright/test';
import { friendCard, signedIn, type Extras } from './fake-supabase.ts';
import { wireRelay } from './fake-realtime.ts';

// The wire: live Morse between friends (task 3.6, #331; ADR 0046). Two pages share one fake
// Realtime relay. Both are signed in as the same player keying to "Basma", which is enough to
// prove the line: what one keys, the other hears and reads. Who may join is tested in the
// database (fellowship.test.ts, "the wire").

const BASMA = '00000000-0000-0000-0000-0000000000b2';
const MORSE = { unlocked: 24, met: [...'KMURESNAPTLWI.JZ=FOY,VG5'], trials: [1, 2] };
const withFriend: Extras = { fellowship: { friends: [friendCard(BASMA, 'Basma')] } };

async function openLine(page: Page, relay: ReturnType<typeof wireRelay>) {
  await relay.connect(page);
  await signedIn(page, [], [], MORSE, [], withFriend);
  await page.goto('/signal-tower?open=wire');
  await page.getByRole('button', { name: 'Open a line to Basma' }).click();
}

/** Keys a mark on the space bar for `ms`, then rests `gap` ms. */
async function key(page: Page, ms: number, gap: number) {
  await page.keyboard.down(' ');
  await page.waitForTimeout(ms);
  await page.keyboard.up(' ');
  await page.waitForTimeout(gap);
}

test.describe('the wire', () => {
  test('two friends on the line hear and read each other’s key', async ({ browser }) => {
    test.setTimeout(60_000);
    const relay = wireRelay();
    const a = await (await browser.newContext()).newPage();
    const b = await (await browser.newContext()).newPage();
    await openLine(a, relay);
    await expect(a.getByRole('status').filter({ hasText: 'Waiting for Basma' })).toBeVisible();
    await openLine(b, relay);
    for (const p of [a, b]) {
      await expect(p.getByText('Basma is on the line.')).toBeVisible({ timeout: 10_000 });
    }
    // K: dah dit dah, at a slow, clean 12 wpm.
    await key(a, 300, 100);
    await key(a, 100, 100);
    await key(a, 300, 900);
    await expect(b.getByTestId('wire-heard')).toHaveText('K', { timeout: 5_000 });
    expect(relay.sent.filter((m) => m.event === 'key')).toHaveLength(6);
    // Only the key's edges and the sender's clock go over the wire.
    expect(relay.sent.find((m) => m.event === 'key')?.payload).toEqual({ d: 1, t: 0 });
    await a.context().close();
    await b.context().close();
  });

  test('a dropped line says so, and comes back by itself', async ({ browser }) => {
    test.setTimeout(60_000);
    const relay = wireRelay();
    const a = await (await browser.newContext()).newPage();
    const b = await (await browser.newContext()).newPage();
    await openLine(a, relay);
    await openLine(b, relay);
    await expect(a.getByText('Basma is on the line.')).toBeVisible({ timeout: 10_000 });
    relay.drop();
    await expect(a.getByText('The line dropped. Reconnecting…')).toBeVisible();
    await expect(a.getByText('Basma is on the line.')).toBeVisible({ timeout: 20_000 });
    await a.context().close();
    await b.context().close();
  });

  test('a line refused says so, and can be tried again', async ({ page }) => {
    const relay = wireRelay();
    relay.refuseJoins();
    await openLine(page, relay);
    await expect(page.getByRole('alert')).toHaveText(
      'The line couldn’t be opened. Check your connection, and that Basma is still your friend.',
    );
    relay.refuseJoins(false);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Waiting for Basma' })).toBeVisible();
  });

  test('the brass key on a phone keys the wire too', async ({ browser }) => {
    const relay = wireRelay();
    const a = await (await browser.newContext({ hasTouch: true })).newPage();
    await openLine(a, relay);
    await expect(a.getByRole('status').filter({ hasText: 'Waiting for Basma' })).toBeVisible();
    const brass = a.getByRole('button', { name: 'Morse key: hold to key' });
    // A real press on the brass key, as a thumb makes it.
    await brass.hover();
    await a.mouse.down();
    await a.waitForTimeout(120);
    await a.mouse.up();
    await expect.poll(() => relay.sent.filter((m) => m.event === 'key').length).toBe(2);
    await a.context().close();
  });

  test('the sending table offers the wire only to a player with a friend', async ({ page }) => {
    await signedIn(page, [], [], MORSE);
    await page.goto('/signal-tower?open=sending');
    await expect(page.getByRole('button', { name: 'Sit at the key' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Key to a friend' })).toHaveCount(0);
  });

  test('from the sending table, a player with a friend opens the wire', async ({ page }) => {
    await signedIn(page, [], [], MORSE, [], withFriend);
    await page.goto('/signal-tower?open=sending');
    await page.getByRole('button', { name: 'Key to a friend' }).click();
    await expect(page.getByRole('heading', { name: 'Key to a friend' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open a line to Basma' })).toBeVisible();
  });
});
