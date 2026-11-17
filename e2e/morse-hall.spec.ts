import { expect, test } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

test.describe('the Signal Tower hall (#33, #34)', () => {
  test('a new player sees chapter I, two lit lamps and the first lesson', async ({ page }) => {
    await signedIn(page, []);
    await page.goto('/signal-tower');
    await expect(page.getByRole('heading', { name: 'Chapter 1: Embers' })).toBeVisible();
    await expect(page.getByRole('img', { name: /2 of 8 lamps lit/ })).toBeVisible();
    await expect(page.getByText('Initiate', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Hear K and M/ }).click();
    await expect(page.getByRole('heading', { name: 'Hear K and M' })).toBeVisible();
    await page.getByRole('button', { name: '← Tower hall' }).click();
    await expect(page.getByRole('heading', { name: 'Chapter 1: Embers' })).toBeVisible();
  });

  test('with every lamp lit, the Gatekeeper holds the gate', async ({ page }) => {
    await signedIn(page, [], [], { unlocked: 8, met: [...'KMURESNA'] });
    await page.goto('/signal-tower');
    await expect(page.getByRole('img', { name: /8 of 8 lamps lit/ })).toBeVisible();
    await page.getByRole('button', { name: /Face The Gatekeeper/ }).click();
    await expect(page.getByRole('heading', { name: 'The Gatekeeper' })).toBeVisible();
    await expect(page.getByText('50 characters · 90% to pass · +50 XP')).toBeVisible();
    await page.getByRole('button', { name: 'Face the trial' }).click();
    await expect(page.getByText(/Listening/)).toBeVisible();
  });

  test('the scroll on the wall holds each chapter whole, however long (review, 2026-11-15)', async ({
    page,
  }) => {
    test.skip(test.info().project.name === 'phone', 'a phone shows the story as a card');
    const koch = 'KMURESNAPTLWI.JZ=FOY,VG5/Q92H38B?47C1D60X';
    for (const state of [
      { unlocked: 2, met: [...'KM'] },
      // The first trial's whole text under the last lamp's beat.
      { unlocked: 8, met: [...'KMURESNA'] },
      // The last chapter's outro, the longest story of all.
      { unlocked: 41, met: [...koch], trials: [1, 2, 3, 4, 5] },
    ]) {
      await signedIn(page, [], [], state);
      await page.goto('/signal-tower');
      const scroll = page.getByRole('region', { name: 'Main questline' });
      await expect(scroll.getByRole('heading', { name: /^Chapter \d+:/ })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() => scroll.evaluate((el) => el.scrollHeight - el.clientHeight))
        .toBeLessThanOrEqual(1);
    }
  });

  test('while the Gatekeeper holds the gate, the lesson says runs are practice (review, 2026-11-15)', async ({
    page,
  }) => {
    await signedIn(page, [], [], { unlocked: 8, met: [...'KMURESNA'], recent: [0.95] });
    await page.goto('/signal-tower?open=koch');
    await expect(page.getByRole('heading', { name: 'Practice your letters' })).toBeVisible();
    await expect(page.getByText('The Gatekeeper')).toBeVisible();
    await expect(page.getByText('1 of 2 runs done')).toHaveCount(0);
  });

  test('the last chapter has nine lamps, and its trial relights the beacon', async ({ page }) => {
    const koch = 'KMURESNAPTLWI.JZ=FOY,VG5/Q92H38B?47C1D60X';
    await signedIn(page, [], [], { unlocked: 41, met: [...koch], trials: [1, 2, 3, 4] });
    await page.goto('/signal-tower');
    await expect(page.getByRole('heading', { name: 'Chapter 5: The Beacon Speaks' })).toBeVisible();
    await expect(page.getByRole('img', { name: /9 of 9 lamps lit/ })).toBeVisible();
    await page.getByRole('button', { name: /Face The Beacon’s Answer/ }).click();
    await expect(page.getByText('50 characters · 90% to pass · +150 XP')).toBeVisible();
  });

  test('after the last trial, the scroll tells how the beacon was relit', async ({ page }) => {
    const koch = 'KMURESNAPTLWI.JZ=FOY,VG5/Q92H38B?47C1D60X';
    await signedIn(page, [], [], { unlocked: 41, met: [...koch], trials: [1, 2, 3, 4, 5] });
    await page.goto('/signal-tower');
    await expect(page.getByText(/The beacon blazes/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Face The Beacon’s Answer/ })).toHaveCount(0);
  });
});

test('if the server refuses the day-end filter, the lesson still loads what is due now (review, 2026-11-15)', async ({
  page,
}) => {
  await signedIn(page, []);
  const asked: string[] = [];
  await page.route('**/rest/v1/review_cards**', (route) => {
    const url = new URL(route.request().url());
    asked.push(url.search);
    return url.searchParams.has('or')
      ? route.fulfill({ status: 400, json: { message: 'bad filter' } })
      : route.fallback();
  });
  await page.goto('/signal-tower?open=koch');
  await expect(page.getByRole('heading', { name: 'Hear K and M' })).toBeVisible();
  expect(asked.some((q) => q.includes('or=') && q.includes('state.eq.2'))).toBe(true);
  expect(asked.some((q) => q.includes('due=lte.'))).toBe(true);
});

test('in a short window the halls show their first card under the painting (review, 2026-11-15)', async ({
  page,
}) => {
  // A phone held sideways, or a laptop at 200%: the writing moves into cards below the
  // painting, and the first of them must start on the screen, not one scroll away.
  test.skip(test.info().project.name === 'phone', 'the window size is set here; one run is enough');
  await page.setViewportSize({ width: 915, height: 412 });
  await signedIn(page);
  for (const [path, name] of [
    ['/signal-tower', 'Main questline'],
    ['/caravanserai', 'Main questline'],
  ] as const) {
    await page.goto(path);
    const card = page.getByRole('region', { name });
    await expect(card).toBeAttached();
    const top = (await card.boundingBox())?.y ?? Infinity;
    expect(top, path).toBeLessThan(412 - 40);
  }
});

test('the hall shows where the road stands, what is next, and the road so far', async ({
  page,
}) => {
  await signedIn(page, [], [], { unlocked: 6, runs: 3 });
  await page.goto('/signal-tower');
  const quest = page.getByRole('region', { name: 'Main questline' });
  // The same count as the square, and the one thing to do now.
  await expect(quest.getByRole('button', { name: /^Step 4 of 75/ })).toBeVisible();
  // A locked station says which step opens it.
  await expect(
    page.getByText('Opens at step 11 · The Logbook’s Words').filter({ visible: true }),
  ).toBeVisible();
  // The road so far: what's ahead by name, and every step walked with its line of the tale.
  await quest.getByRole('button', { name: /the road so far/ }).click();
  const book = page.getByRole('dialog', { name: 'The Silent Beacon: the road so far' });
  await expect(book.getByText('5 of 75 steps walked · chapter 1 of 10: Embers')).toBeVisible();
  await expect(book.getByText('The Warm Key')).toBeVisible();
  await expect(book.getByText('and 67 more')).toBeVisible();
  await expect(book.getByText('Lamp U')).toBeVisible();
  await expect(book.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(book).toHaveCount(0);
  // "Next" opens the step's own door.
  await quest.getByRole('button', { name: /^Next: Key your first letters/ }).click();
  await expect(page.getByText(/straight key|brass key/i).first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Main questline' })).toHaveCount(0);
});
