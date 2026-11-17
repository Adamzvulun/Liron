import { expect, test, type Page } from '@playwright/test';
import { friendCard, signedIn, TODAY as FAKE_TODAY, type Extras } from './fake-supabase.ts';

// Challenges between friends and the Arena (task 3.4, #329; docs/game/challenges.md).

const BASMA = '00000000-0000-0000-0000-0000000000b2';
const ME = '00000000-0000-0000-0000-000000000001';
const KOCH = 'KMURESNAPTLWI.JZ=FOY,VG5';
const RUSH_READY = { unlocked: 24, met: [...KOCH], trials: [1, 2] };
const TODAY = FAKE_TODAY.day;

const challenge = (more: Record<string, unknown> = {}) => ({
  id: '00000000-0000-4000-8000-0000000000c1',
  kind: 'rush',
  mine: false,
  from: { id: BASMA, name: 'Basma', score: 534, best: 610 },
  to: { id: ME, name: 'Adam', score: null, best: 498 },
  state: 'open',
  sent: TODAY,
  ...more,
});

/** Plays a short rush (3 calls), typing K5 for each. */
async function rush(page: Page) {
  for (let i = 1; i <= 3; i++) {
    await expect(page.getByText(new RegExp(`^Call ${i} of 3 · .* · type the call$`))).toBeVisible({
      timeout: 10_000,
    });
    await page.keyboard.press('k');
    await page.keyboard.press('5');
    await page.keyboard.press('Enter');
  }
  await expect(page.getByText('Rush finished')).toBeVisible();
}

test.describe('challenges', () => {
  test('a rush’s result offers its score to a friend', async ({ page }) => {
    test.setTimeout(60_000);
    const extras: Extras = { fellowship: { friends: [friendCard(BASMA, 'Basma')] } };
    await signedIn(page, [], [], RUSH_READY, [], extras);
    await page.goto('/signal-tower?open=words&run=short');
    await page.getByRole('button', { name: 'Start the rush' }).click();
    await rush(page);
    await page.getByRole('button', { name: 'Challenge a friend with this score' }).click();
    const pick = page.getByRole('group', { name: 'Challenge a friend' });
    await expect(pick).toContainText(/Who gets a callsign rush to beat \d+\?/);
    await pick.getByRole('button', { name: 'Basma' }).click();
    await expect(page.getByText('Sent to Basma.')).toBeVisible();
    await expect(pick.getByRole('button', { name: 'Basma' })).toBeDisabled();
    // The challenge names the session whose score was recorded, never a number.
    const calls = extras.fellowship?.calls ?? [];
    const recorded = calls.find((c) => c.fn === 'record_round_score')?.args as {
      p_session: string;
      p_kind: string;
    };
    expect(recorded.p_kind).toBe('rush');
    expect(calls.find((c) => c.fn === 'send_challenge')?.args).toEqual({
      p_friend: BASMA,
      p_session: recorded.p_session,
    });
  });

  test('a player with no friends is offered nothing', async ({ page }) => {
    test.setTimeout(60_000);
    await signedIn(page, [], [], RUSH_READY);
    await page.goto('/signal-tower?open=words&run=short');
    await page.getByRole('button', { name: 'Start the rush' }).click();
    await rush(page);
    await expect(page.getByRole('button', { name: 'Rush again' })).toBeVisible();
    await expect(page.getByText(/challenge/i)).toHaveCount(0);
  });

  test('a busy friend is named, kindly', async ({ page }) => {
    test.setTimeout(60_000);
    const extras: Extras = {
      fellowship: { friends: [friendCard(BASMA, 'Basma')], refuse: { send_challenge: 'open' } },
    };
    await signedIn(page, [], [], RUSH_READY, [], extras);
    await page.goto('/signal-tower?open=words&run=short');
    await page.getByRole('button', { name: 'Start the rush' }).click();
    await rush(page);
    await page.getByRole('button', { name: 'Challenge a friend with this score' }).click();
    await page.getByRole('button', { name: 'Basma' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'Basma already has three of your challenges waiting.',
    );
  });
});

test.describe('the Arena', () => {
  test('the square’s sign opens it; alone, it says how to bring a friend', async ({ page }) => {
    await signedIn(page);
    await page.goto('/');
    const sign = page.getByRole('link', { name: 'The Arena' });
    await sign.scrollIntoViewIfNeeded();
    await sign.click({ force: true });
    await expect(page).toHaveURL(/\/arena$/);
    await expect(page.getByRole('heading', { name: 'The Arena', level: 1 })).toBeVisible();
    await expect(page.getByText(/The Arena is for friends\./)).toBeVisible();
    await page.getByRole('link', { name: 'Your House' }).click();
    await expect(page).toHaveURL(/\/house$/);
  });

  test('a challenge for you can be taken on: it opens the rush', async ({ page }) => {
    const extras: Extras = {
      fellowship: { friends: [friendCard(BASMA, 'Basma')], challenges: [challenge()] },
    };
    await signedIn(page, [], [], RUSH_READY, [], extras);
    await page.goto('/arena');
    const forYou = page.getByRole('region', { name: 'For you' });
    await expect(forYou).toContainText('Basma challenges you to a callsign rush: 534');
    await expect(forYou).toContainText('Today');
    await forYou.getByRole('button', { name: 'Take it on' }).click();
    await expect(page).toHaveURL(/\/signal-tower\?open=rush$/);
    await expect(page.getByText(/^Call 1 of 25 · /)).toBeVisible({ timeout: 10_000 });
  });

  test('the next rush answers the challenge taken on', async ({ page }) => {
    test.setTimeout(60_000);
    const extras: Extras = {
      fellowship: { friends: [friendCard(BASMA, 'Basma')], challenges: [challenge()] },
    };
    await signedIn(page, [], [], RUSH_READY, [], extras);
    await page.goto('/arena');
    await page.getByRole('button', { name: 'Take it on' }).click();
    await expect(page).toHaveURL(/open=rush/);
    // The same tab, with a short rush for the test.
    await page.goto('/signal-tower?open=rush&run=short');
    await rush(page);
    await expect(page.getByRole('status').filter({ hasText: 'answered' })).toContainText(
      /You answered Basma’s challenge: Basma 534, you \d+\./,
    );
    const calls = extras.fellowship?.calls ?? [];
    const recorded = calls.find((c) => c.fn === 'record_round_score')?.args as {
      p_session: string;
    };
    expect(calls.find((c) => c.fn === 'answer_challenge')?.args).toEqual({
      p_challenge: challenge().id,
      p_session: recorded.p_session,
    });
    await page.getByRole('link', { name: 'See it in the Arena' }).click();
    const done = page.getByRole('region', { name: 'Done' });
    await expect(done).toContainText('Basma');
    await expect(done).toContainText('534');
    await expect(done).toContainText('best 610');
    await expect(page.getByRole('region', { name: 'For you' })).toHaveCount(0);
  });

  test('a challenge can be let go, and yours wait for an answer', async ({ page }) => {
    const mine = challenge({
      id: '00000000-0000-4000-8000-0000000000c2',
      kind: 'words',
      mine: true,
      from: { id: ME, name: 'Adam', score: 8, best: 9 },
      to: { id: BASMA, name: 'Basma', score: null, best: 7 },
    });
    const extras: Extras = {
      fellowship: { friends: [friendCard(BASMA, 'Basma')], challenges: [challenge(), mine] },
    };
    await signedIn(page, [], [], RUSH_READY, [], extras);
    await page.goto('/arena');
    await expect(page.getByRole('region', { name: 'Yours' })).toContainText(
      'You challenged Basma to a Codebook round: 8',
    );
    await page.getByRole('button', { name: 'Let it go' }).click();
    await expect(page.getByRole('region', { name: 'Done' })).toContainText(
      'Basma’s rush challenge to you: you let it go.',
    );
    await expect(page.getByRole('region', { name: 'For you' })).toHaveCount(0);
  });

  test('a finished challenge shows both scores and bests, and no winner', async ({ page }) => {
    const done = challenge({
      state: 'answered',
      to: { id: ME, name: 'Adam', score: 498, best: 498 },
    });
    const extras: Extras = {
      fellowship: { friends: [friendCard(BASMA, 'Basma')], challenges: [done] },
    };
    await signedIn(page, [], [], RUSH_READY, [], extras);
    await page.goto('/arena');
    const region = page.getByRole('region', { name: 'Done' });
    await expect(region).toContainText('Callsign rush');
    await expect(region).toContainText('That was your best yet.');
    await expect(region.locator('.arena__side')).toHaveText(['Basma534best 610', 'You498best 498']);
    await expect(page.getByText(/won|lost|winner|beat you/i)).toHaveCount(0);
  });
});
