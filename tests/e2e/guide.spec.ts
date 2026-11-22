import { expect, test } from './fixtures.ts';
import {
  FAKE_SUPABASE_URL,
  friendCard,
  GUIDE_SAID,
  signedIn,
  TODAY,
  WALLET,
} from './fake-supabase.ts';
import { cardId, GUIDE_IDS } from '../../src/core/guide/seen.ts';
import { PLACE_CARDS } from '../../src/core/guide/words.ts';
import { CARD_KEYS as MORSE_CARDS } from '../../src/subjects/morse/guide.ts';
import { CARD_KEYS as ARABIC_CARDS } from '../../src/subjects/arabic/guide.ts';

// Nour's welcome (docs/game/the-guide.md §3.2, R1–R5; #409).
const nour = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Nour, the lamplighter' });
const point = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.dataset.guidePoint ?? null);

test.describe('Nour’s welcome', () => {
  test('after "Look around the square first", three lines point the way, then it is saved', async ({
    page,
  }) => {
    const updates: unknown[] = [];
    await signedIn(page, updates, [], null, [], { firstPage: true, guideSeen: [] });
    await page.goto('/');
    await page
      .getByRole('dialog', { name: 'Waymark' })
      .getByRole('button', { name: 'Look around the square first' })
      .click();
    const card = nour(page);
    await expect(card.getByRole('status')).toHaveText(/I’m Nour; I light the lamps here/);
    expect(await point(page)).toBe('compass');
    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByRole('status')).toHaveText(/your level, your gold and gems/);
    expect(await point(page)).toBe('top-bar');
    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByRole('status')).toHaveText(/Every building is a place/);
    expect(await point(page)).toBe('places');
    // The last line has no Skip: there is nothing left to skip.
    await expect(card.getByRole('button', { name: 'Skip' })).toHaveCount(0);
    await card.getByRole('button', { name: 'Got it' }).click();
    await expect(card).toHaveCount(0);
    expect(await point(page)).toBeNull();
    await expect.poll(() => updates).toContainEqual({ guide_seen: ['welcome'] });
    // Nothing more in this visit; saved on the account, so the next visit has no welcome, only
    // Nour's first introduction.
    await page.reload();
    await expect(nour(page).getByRole('status')).toHaveText(/The Notice Board has today’s quests/);
  });

  test('a player back from their first step meets Nour, and Skip ends it for good', async ({
    page,
  }) => {
    const updates: unknown[] = [];
    await signedIn(page, updates, [], { unlocked: 3, runs: 2 }, [], { guideSeen: [] });
    await page.goto('/');
    const card = nour(page);
    await expect(card).toBeVisible();
    // Not a dialog: the square stays usable around it.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await card.getByRole('button', { name: 'Skip' }).click();
    await expect(card).toHaveCount(0);
    await expect.poll(() => updates).toContainEqual({ guide_seen: ['welcome'] });
  });

  test('a brand-new player hears nothing from Nour before the first page or a first step', async ({
    page,
  }) => {
    await signedIn(page, [], [], null, [], { firstPage: true, guideSeen: [] });
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: 'Waymark' })).toBeVisible();
    await expect(nour(page)).toHaveCount(0);
  });

  test('a player who has had the welcome is not greeted again', async ({ page }) => {
    await signedIn(page, [], [], { unlocked: 3, runs: 2 });
    await page.goto('/');
    await expect(page.getByText('Adam', { exact: true })).toBeVisible();
    await expect(nour(page)).toHaveCount(0);
  });
});

// Introductions, one at a time (the-guide.md §3.3, R6–R8; #410).
test.describe('Nour’s introductions', () => {
  /** Where the new mark is: the places whose link wears it (a phone has a plaque and a dock). */
  const marked = (page: import('@playwright/test').Page) =>
    page
      .locator('a:has(.city__new)')
      .evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute('href')))]);

  test('one place at a time wears the new mark, and going in introduces it', async ({
    page,
  }, info) => {
    const updates: unknown[] = [];
    await signedIn(page, updates, [], { unlocked: 3, runs: 2 }, [], { guideSeen: ['welcome'] });
    await page.goto('/');
    const card = nour(page);
    await expect(card.getByRole('status')).toHaveText(/The Notice Board has today’s quests/);
    expect(await marked(page)).toEqual(['/notice-board']);
    const board =
      info.project.name === 'phone'
        ? page
            .getByRole('navigation', { name: 'Places' })
            .getByRole('link', { name: /Quests|Notice Board/ })
        : page.locator('a.city__place').filter({ hasText: 'Notice Board' });
    await expect(board.locator('.city__new')).toHaveText(', New');
    // Got it quiets Nour for this visit; the mark stays until the player goes in.
    await card.getByRole('button', { name: 'Got it' }).click();
    await expect(card).toHaveCount(0);
    expect(await marked(page)).toEqual(['/notice-board']);
    await (info.project.name === 'phone' ? board : board.locator('.city__plaque')).click();
    await expect(page).toHaveURL(/\/notice-board$/);
    await expect.poll(() => updates).toContainEqual({ guide_seen: ['intro:board', 'welcome'] });
    await page.getByRole('link', { name: 'Back to the square' }).click();
    await expect(page.locator('a.city__place').first()).toBeVisible();
    // Nothing else is due for this player, so no mark and no word.
    await expect(page.locator('.city__new')).toHaveCount(0);
    await expect(nour(page)).toHaveCount(0);
  });

  test('the Market is Nour’s to introduce now, not the compass’s', async ({ page }) => {
    await signedIn(page, [], [], { unlocked: 3, runs: 2 }, [], {
      guideSeen: ['welcome', 'intro:board'],
      gold: 120,
    });
    await page.goto('/');
    await expect(nour(page).getByRole('status')).toHaveText(/enough for something at the Market/);
    await expect(page.getByText('You have gold. The Market is open.')).toHaveCount(0);
  });

  test('tapping Nour by the compass brings back the line they were quieted on', async ({
    page,
  }) => {
    await signedIn(page, [], [], { unlocked: 3, runs: 2 }, [], { guideSeen: ['welcome'] });
    await page.goto('/');
    const card = nour(page);
    await card.getByRole('button', { name: 'Got it' }).click();
    await expect(card).toHaveCount(0);
    await page.getByRole('button', { name: /^Nour, the lamplighter/ }).click();
    await expect(card.getByRole('status')).toHaveText(/The Notice Board has today’s quests/);
  });

  test('with nothing new, tapping Nour opens the Guidebook', async ({ page }) => {
    await signedIn(page, [], [], { unlocked: 3, runs: 2 });
    await page.goto('/');
    await expect(nour(page)).toHaveCount(0);
    await page.getByRole('button', { name: /^Nour, the lamplighter/ }).click();
    await expect(page).toHaveURL(/\/guidebook$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Guidebook' })).toBeVisible();
  });

  test('the fake’s old hand has heard every line Nour has, and seen every card', () => {
    const cards = [
      ...Object.keys(PLACE_CARDS).map((p) => cardId(p)),
      ...MORSE_CARDS.map((k) => cardId('morse', k)),
      ...ARABIC_CARDS.map((k) => cardId('arabic', k)),
    ];
    expect([...GUIDE_SAID].sort()).toEqual([...Object.values(GUIDE_IDS), ...cards].sort());
  });
});

// First-visit cards (the-guide.md §3.4, R11–R13; #411).
test.describe('first-visit cards', () => {
  const about = (page: import('@playwright/test').Page, title: string) =>
    page.getByRole('region', { name: `About ${title}` });

  test('a place says what it is for once, and Got it saves it', async ({ page }) => {
    const updates: unknown[] = [];
    const seen = GUIDE_SAID.filter((id) => id !== 'card:market');
    await signedIn(page, updates, [], null, [], { guideSeen: seen });
    await page.goto('/market');
    const card = about(page, 'The Market');
    await expect(card).toContainText('Four wares are set out each day');
    // Not a dialog: the Market works around it.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await card.getByRole('button', { name: 'Got it' }).click();
    await expect(card).toHaveCount(0);
    await expect
      .poll(() => updates)
      .toContainEqual({ guide_seen: expect.arrayContaining(['card:market']) as unknown });
    await page.reload();
    await expect(page.getByRole('heading', { name: /Market/ }).first()).toBeVisible();
    await expect(about(page, 'The Market')).toHaveCount(0);
  });

  test('in a hall the first action closes its card, and a station has its own', async ({
    page,
  }) => {
    const updates: unknown[] = [];
    const seen = GUIDE_SAID.filter((id) => !id.startsWith('card:morse:'));
    await signedIn(page, updates, [], { unlocked: 3, runs: 2 }, [], { guideSeen: seen });
    await page.goto('/signal-tower');
    await expect(about(page, 'The Signal Tower')).toContainText('Morse code by ear');
    await page.getByRole('button', { name: /Instant Recognition/ }).click();
    await expect(about(page, 'The Signal Tower')).toHaveCount(0);
    await expect(about(page, 'Instant Recognition')).toContainText('before its lamp fades');
    await expect
      .poll(() => updates)
      .toContainEqual({ guide_seen: expect.arrayContaining(['card:morse:hall']) as unknown });
  });
});

// The Guidebook (the-guide.md §3.5, R14–R17; #412).
test.describe('the Guidebook', () => {
  test('opens from Settings, a page at a time, and Take me there goes to the place', async ({
    page,
  }) => {
    await signedIn(page, [], [], { unlocked: 3, runs: 2 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page
      .getByRole('region', { name: 'Guidebook' })
      .getByRole('link', { name: 'Open' })
      .click();
    await expect(page).toHaveURL(/\/guidebook$/);
    const pages = page.getByRole('navigation', { name: 'Pages' });
    // Each guild has its own chapter, with its stations.
    await pages.getByRole('button', { name: 'The Signal Tower' }).click();
    const shown = page.getByRole('article');
    await expect(shown.getByRole('heading', { name: 'The Signal Tower' })).toBeFocused();
    await expect(shown.getByRole('term').first()).toBeVisible();
    if (await page.getByRole('button', { name: '← All pages' }).isVisible()) {
      await page.getByRole('button', { name: '← All pages' }).click();
    }
    // Numbers are filled in from the code.
    await pages.getByRole('button', { name: 'Your streak' }).click();
    await expect(shown).toContainText(/costs \d+ gold/);
    await expect(shown).not.toContainText('{');
    if (await page.getByRole('button', { name: '← All pages' }).isVisible()) {
      await page.getByRole('button', { name: '← All pages' }).click();
    }
    await pages.getByRole('button', { name: 'The Market' }).click();
    await shown.getByRole('link', { name: 'Take me there' }).click();
    await expect(page).toHaveURL(/\/market$/);
  });

  test('Show me around again brings Nour’s welcome back on the square', async ({ page }) => {
    await signedIn(page, [], [], { unlocked: 3, runs: 2 });
    await page.goto('/guidebook');
    await page.getByRole('button', { name: 'Show me around again' }).click();
    await expect(page).toHaveURL(/\/$/);
    const card = nour(page);
    await expect(card.getByRole('status')).toHaveText(/I’m Nour; I light the lamps here/);
    await card.getByRole('button', { name: 'Skip' }).click();
    await expect(card).toHaveCount(0);
  });
});

// A newcomer's first day, end to end, on a phone (the-guide.md §9; #414): an invited friend
// with nothing seen meets the first page, the welcome, an introduction, a place's card, the
// next introduction and the Guidebook.
test('an invited friend finds their way on a phone, start to finish', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'the newcomer arrives on a phone');
  const updates: unknown[] = [];
  await signedIn(page, updates, [], null, [], {
    firstPage: true,
    guideSeen: [],
    gold: 0,
    fellowship: { friends: [friendCard('00000000-0000-0000-0000-0000000000a1', 'Adam')] },
  });
  await page.goto('/');
  // The first page, as before the guide: nothing from Nour over it.
  const first = page.getByRole('dialog', { name: 'Waymark' });
  await expect(nour(page)).toHaveCount(0);
  await first.getByRole('button', { name: 'Look around the square first' }).click();
  // The welcome, three lines.
  const card = nour(page);
  for (const line of [/I’m Nour/, /Up top/, /Every building/]) {
    await expect(card.getByRole('status')).toHaveText(line);
    await card.getByRole('button', { name: /Next|Got it/ }).click();
  }
  await expect(card).toHaveCount(0);
  // The next visit: the Notice Board's introduction, then its card inside.
  await page.reload();
  await expect(card.getByRole('status')).toHaveText(/The Notice Board has today’s quests/);
  await card.getByRole('button', { name: 'Got it' }).click();
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('link', { name: /Quests|Notice Board/ })
    .click();
  await expect(page).toHaveURL(/\/notice-board$/);
  const about = page.getByRole('region', { name: 'About The Notice Board' });
  await expect(about).toContainText('Today’s quests');
  await about.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('link', { name: 'Back to the square' }).click();
  // Then the friend who invited them.
  await page.reload();
  await expect(card.getByRole('status')).toHaveText(/Your friend is in town/);
  // And the Guidebook, from Settings, says what each place is for.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('region', { name: 'Guidebook' }).getByRole('link', { name: 'Open' }).click();
  await page.getByRole('button', { name: 'Your House' }).click();
  await expect(page.getByRole('article')).toContainText('The wardrobe dresses your traveler');
  // All of it is kept on the account.
  await expect
    .poll(() => updates)
    .toContainEqual({
      guide_seen: expect.arrayContaining(['card:board', 'intro:board', 'welcome']) as unknown,
    });
});

// One voice at a time (the-guide.md R5, R9; #408): a level-up and Nour never show together, and
// once a celebration has had the square, Nour waits for the next visit.
test('a level-up has the square to itself, and Nour waits for the next visit', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'the phone is where they would stack');
  test.setTimeout(60_000);
  await signedIn(page, [], [], null, [], { guideSeen: ['welcome'] });
  await page.route(`${FAKE_SUPABASE_URL}/rest/v1/rpc/save_session`, (route) =>
    route.fulfill({
      json: {
        duplicate: false,
        award: {
          ...WALLET,
          xp: 140,
          xp_earned: 12,
          gold_earned: 0,
          gems_earned: 0,
          level_before: 4,
          level: 5,
          today: { ...TODAY, minutes: TODAY.minutes + 1 },
        },
      },
    }),
  );
  await page.goto('/signal-tower?run=short');
  await page.getByRole('button', { name: /Instant Recognition/ }).click();
  await page.getByRole('button', { name: 'Start round' }).click();
  await expect(page.getByText('Which letter?')).toBeVisible({ timeout: 8000 });
  await page
    .getByRole('group', { name: 'Letter keys' })
    .or(page.getByLabel('Letter keys'))
    .getByRole('button', { name: 'K', exact: true })
    .click();
  const levelUp = page.getByRole('dialog', { name: 'Level 5' });
  await expect(levelUp).toBeVisible({ timeout: 20_000 });
  // Back to the square with the celebration still open: it keeps the square, and Nour is quiet.
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(levelUp).toBeVisible();
  await expect(nour(page)).toHaveCount(0);
  await levelUp.getByRole('button', { name: 'Continue' }).click();
  await expect(levelUp).toHaveCount(0);
  await expect(nour(page)).toHaveCount(0);
  // The next visit to the square is Nour's.
  await page.getByRole('navigation', { name: 'Places' }).getByRole('link').first().click();
  await page.getByRole('link', { name: /Back to the square/ }).click();
  await expect(nour(page).getByRole('status')).toHaveText(/The Notice Board has today’s quests/);
});
