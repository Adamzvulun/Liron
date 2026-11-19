import { expect, test } from './fixtures.ts';
import { friendCard, signedIn, type Extras } from './fake-supabase.ts';

// The Fellowship in Your House (task 3.1, #326) and a friend's house (task 3.2, #327).
// docs/game/fellowship.md, docs/game/fellowship-build.md §5–6.

const BASMA = '00000000-0000-0000-0000-0000000000b2';
const CHEN = '00000000-0000-0000-0000-0000000000c3';

const withFellowship = (fellowship: NonNullable<Extras['fellowship']>) =>
  ({ fellowship }) satisfies Extras;

test.describe('the Fellowship in Your House', () => {
  test('with no friends, it says how codes work, and nothing else social shows', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto('/house');
    const panel = page.getByRole('region', { name: 'Fellowship' });
    await expect(panel).toContainText('No friends here yet. Give a friend your code below');
    await expect(panel.getByLabel('Your friend code: K 7 Q M 4 R X A')).toHaveText('K7QM-4RXA');
    await expect(panel.getByRole('list', { name: 'Your friends' })).toHaveCount(0);
    await expect(panel.getByRole('list', { name: 'Requests for you' })).toHaveCount(0);
    await page.goto('/');
    await expect(page.locator('a.city__place').first()).toBeVisible();
    await expect(page.getByText(/Fellowship|friend/i)).toHaveCount(0);
  });

  test('a player with no name is told friends see “A traveler” until they choose one', async ({
    page,
  }) => {
    await signedIn(page, [], [], null, [], { name: '' });
    await page.goto('/house');
    const panel = page.getByRole('region', { name: 'Fellowship' });
    await expect(panel).toContainText('Friends see you as “A traveler”');
    // Named, it says nothing of it.
    await signedIn(page);
    await page.goto('/house');
    await expect(panel.getByLabel(/Your friend code/)).toBeVisible();
    await expect(panel).not.toContainText('A traveler');
  });

  test('a request can be accepted, and the friend joins the list', async ({ page }) => {
    const extras = withFellowship({ requests: [{ id: BASMA, name: 'Basma', look: {} }] });
    await signedIn(page, [], [], undefined, [], extras);
    await page.goto('/house');
    const panel = page.getByRole('region', { name: 'Fellowship' });
    await expect(panel).toContainText('Basma would like to join your Fellowship.');
    await panel.getByRole('button', { name: 'Accept' }).click();
    await expect(panel.getByRole('status').last()).toHaveText('Basma joined your Fellowship.');
    const friends = panel.getByRole('list', { name: 'Your friends' });
    await expect(friends.getByRole('heading', { name: 'Basma' })).toBeVisible();
    expect(extras.fellowship.calls).toContainEqual({
      fn: 'answer_friend',
      args: { p_other: BASMA, p_accept: true },
    });
  });

  test('a friend’s code is sent however it was typed, and the answer says nothing of it', async ({
    page,
  }) => {
    const extras = withFellowship({});
    await signedIn(page, [], [], undefined, [], extras);
    await page.goto('/house');
    const panel = page.getByRole('region', { name: 'Fellowship' });
    const send = panel.getByRole('button', { name: 'Send a request' });
    await panel.getByLabel('Add a friend').fill('abcd');
    await expect(send).toBeDisabled();
    await panel.getByLabel('Add a friend').fill('abcd-efgh');
    await send.click();
    await expect(panel.getByRole('status').last()).toHaveText(
      'Sent. If that code is right, they’ll see your request, and you’ll be friends when they accept.',
    );
    expect(extras.fellowship.calls).toContainEqual({
      fn: 'ask_friend',
      args: { p_code: 'ABCDEFGH' },
    });
    await expect(panel.getByLabel('Add a friend')).toHaveValue('');
  });

  test('a refused request says why, kindly', async ({ page }) => {
    await signedIn(
      page,
      [],
      [],
      undefined,
      [],
      withFellowship({ refuse: { ask_friend: 'daily-limit' } }),
    );
    await page.goto('/house');
    const panel = page.getByRole('region', { name: 'Fellowship' });
    await panel.getByLabel('Add a friend').fill('ABCDEFGH');
    await panel.getByRole('button', { name: 'Send a request' }).click();
    await expect(panel.getByRole('status').last()).toHaveText(
      'That’s enough for today. Try again tomorrow.',
    );
  });

  test('a friend shows what §3 shares, and can be removed after a second press', async ({
    page,
  }) => {
    const extras = withFellowship({
      friends: [
        friendCard(BASMA, 'Basma', {
          title: 'Keyer',
          level: 5,
          streak: 12,
          ranks: ['morse:rank-listener'],
          achievements: ['first-light'],
        }),
      ],
    });
    await signedIn(page, [], [], undefined, [], extras);
    await page.goto('/house');
    const friend = page.getByRole('list', { name: 'Your friends' }).getByRole('listitem').first();
    await expect(friend).toContainText('Level 5 · Keyer');
    await expect(friend).toContainText('12 days in a row · 1 achievement');
    await expect(friend.getByRole('list', { name: 'Basma’s ranks' })).toHaveText('Listener');
    await friend.getByRole('button', { name: 'Remove' }).click();
    await friend.getByRole('button', { name: 'Keep' }).click();
    await friend.getByRole('button', { name: 'Remove' }).click();
    await friend.getByRole('button', { name: 'Yes, remove Basma' }).click();
    await expect(page.getByText('Basma has left your Fellowship.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Your friends' })).toHaveCount(0);
  });

  test('a name with markup in it is shown as plain text', async ({ page }) => {
    const evil = '<img src=x onerror=alert(1)>';
    await signedIn(
      page,
      [],
      [],
      undefined,
      [],
      withFellowship({ friends: [friendCard(BASMA, evil)] }),
    );
    await page.goto('/house');
    const panel = page.getByRole('region', { name: 'Fellowship' });
    await expect(panel.getByRole('heading', { name: evil })).toBeVisible();
    await expect(panel.locator('img')).toHaveCount(0);
  });

  test('fits a 320-pixel screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await signedIn(
      page,
      [],
      [],
      undefined,
      [],
      withFellowship({
        friends: [friendCard(BASMA, 'Basma', { title: 'Keyer', ranks: ['morse:rank-listener'] })],
        requests: [{ id: CHEN, name: 'Chen', look: {} }],
      }),
    );
    await page.goto('/house');
    const panel = page.getByRole('region', { name: 'Fellowship' });
    await expect(panel.getByRole('heading', { name: 'Basma' })).toBeVisible();
    const box = await panel.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 320).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
    if (process.env.SHOT) await panel.screenshot({ path: process.env.SHOT });
  });
});

test.describe('a friend’s house (task 3.2)', () => {
  test('shows their card, read-only, with a clear way home', async ({ page }) => {
    await signedIn(
      page,
      [],
      [],
      undefined,
      [],
      withFellowship({
        friends: [
          friendCard(BASMA, 'Basma', {
            title: 'Keyer',
            level: 5,
            ranks: ['morse:rank-listener'],
            achievements: ['first-light'],
            look: { gear: { pet: 'sand-cat' } },
          }),
        ],
      }),
    );
    await page.goto('/house');
    await page.getByRole('link', { name: 'Visit Basma’s house' }).click();
    await expect(page).toHaveURL(new RegExp(`/house/visit/${BASMA}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Basma’s house');
    const shelf = page.getByRole('region', { name: 'Trophies' });
    await expect(shelf).toContainText('Listener');
    await expect(shelf).toContainText('First Light');
    await expect(page.getByText('Level 5 · Keyer')).toBeVisible();
    // Nothing of theirs can be changed: no wardrobe, no buttons at all in the room.
    await expect(page.getByRole('heading', { name: 'Gear' })).toHaveCount(0);
    await expect(page.locator('main').getByRole('button')).toHaveCount(0);
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });
    await page.getByRole('link', { name: '← Back to your house' }).click();
    await expect(page).toHaveURL(/\/house$/);
    await expect(page.getByRole('region', { name: 'Fellowship' })).toBeVisible();
  });

  test('someone who isn’t a friend finds the door closed', async ({ page }) => {
    await signedIn(page);
    await page.goto(`/house/visit/${CHEN}`);
    await expect(page.getByText('This door is closed.')).toBeVisible();
    await expect(page.getByRole('link', { name: '← Back to your house' })).toBeVisible();
    await expect(page.getByRole('link', { name: '← Back to the square' })).toBeVisible();
  });
});

test.describe('the party feed and sharing (task 3.3)', () => {
  const ME = '00000000-0000-0000-0000-00000000000a';
  const feed = [
    {
      id: 3,
      who: BASMA,
      name: 'Basma',
      me: false,
      kind: 'rank',
      detail: 'morse:rank-keyer',
      day: '2026-11-02',
    },
    { id: 2, who: ME, name: 'Adam', me: true, kind: 'streak', detail: '7', day: '2026-11-01' },
    {
      id: 1,
      who: BASMA,
      name: 'Basma',
      me: false,
      kind: 'achievement',
      detail: 'first-light',
      day: '2026-10-28',
    },
  ];

  test('friends’ milestones are pinned on the Notice Board, newest first', async ({ page }) => {
    await signedIn(
      page,
      [],
      [],
      undefined,
      [],
      withFellowship({ friends: [friendCard(BASMA, 'Basma')], feed }),
    );
    await page.goto('/notice-board');
    const news = page.getByRole('region', { name: 'Word in the square' });
    await expect(news.getByRole('listitem')).toHaveText([
      'Basma took the rank of Keyer at the Signal Tower.Today',
      'You kept a 7-day streak.Yesterday',
      'Basma earned First Light.Oct 28',
    ]);
  });

  test('a player with no friends sees no feed and no sharing switch', async ({ page }) => {
    await signedIn(page, [], [], undefined, [], withFellowship({ feed }));
    await page.goto('/notice-board');
    // The day's quests are on the board; the feed isn't.
    await expect(page.locator('.notice-board .hud__quests')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Word in the square' })).toHaveCount(0);
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('switch', { name: 'Clicks and chimes' })).toBeVisible();
    await expect(
      page.getByRole('switch', { name: 'Share my milestones with friends' }),
    ).toHaveCount(0);
  });

  test('a player with a friend can stop sharing their milestones', async ({ page }) => {
    const profileUpdates: unknown[] = [];
    await signedIn(
      page,
      profileUpdates,
      [],
      undefined,
      [],
      withFellowship({ friends: [friendCard(BASMA, 'Basma')] }),
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    const share = page.getByRole('switch', { name: 'Share my milestones with friends' });
    await expect(share).toBeChecked();
    await share.click();
    await expect(share).not.toBeChecked();
    await expect.poll(() => profileUpdates).toContainEqual({ share_milestones: false });
  });
});

test.describe('friends in the square (task 3.3)', () => {
  test('friends stand in the square, and each one is a way to their house', async ({
    page,
  }, info) => {
    test.skip(info.project.name === 'phone', 'on a phone the square pans; one viewport is enough');
    await signedIn(
      page,
      [],
      [],
      undefined,
      [],
      withFellowship({ friends: [friendCard(BASMA, 'Basma'), friendCard(CHEN, 'Chen')] }),
    );
    await page.goto('/');
    const basma = page.getByRole('link', { name: 'Basma, a friend: visit their house' });
    await expect(basma).toBeVisible();
    await expect(page.locator('.city__friend')).toHaveCount(2);
    await basma.click({ force: true }); // the square's sprites never stand still
    await expect(page).toHaveURL(new RegExp(`/house/visit/${BASMA}$`));
  });

  test('a player with no friends has the square to themself', async ({ page }) => {
    await signedIn(page);
    await page.goto('/');
    await expect(page.locator('a.city__place').first()).toBeVisible();
    await page.waitForTimeout(700);
    await expect(page.locator('.city__friend')).toHaveCount(0);
  });
});
