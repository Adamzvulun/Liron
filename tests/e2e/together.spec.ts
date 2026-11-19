import { expect, test } from './fixtures.ts';
import { friendCard, signedIn, TODAY, type Extras } from './fake-supabase.ts';

// Fellowship quests and gifts (task 3.5, #330; ADR 0045).

const BASMA = '00000000-0000-0000-0000-0000000000b2';

const quest = (more: Record<string, unknown> = {}) => ({
  id: 'inn-talk',
  metric: 'event',
  subject: 'arabic',
  target: 10,
  gold: 40,
  week: '2026-11-02',
  total: 7,
  mine: 3,
  collected: false,
  ...more,
});

const withFriend = (more: NonNullable<Extras['fellowship']> = {}): Extras => ({
  gold: 130,
  fellowship: { friends: [friendCard(BASMA, 'Basma')], ...more },
});

test.describe('together this week, on the Notice Board', () => {
  test('a player alone sees no quest', async ({ page }) => {
    await signedIn(page);
    await page.goto('/notice-board');
    await expect(page.getByRole('heading', { name: 'Notice Board', level: 1 })).toBeVisible();
    await expect(page.getByText('Together this week')).toHaveCount(0);
  });

  test('shows the quest, everyone’s total and your part', async ({ page }) => {
    await signedIn(page, [], [], null, [], withFriend({ quest: quest() }));
    await page.goto('/notice-board');
    const card = page.getByRole('region', { name: 'Together this week' });
    await expect(card).toContainText('Have 10 chats at the inn between you');
    await expect(card).toContainText('7 of 10 done · your part: 3');
    await expect(card).toContainText('Everyone who helps gets 40 gold when it’s done.');
    await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '7');
  });

  test('when it’s done, a helper collects the gold once', async ({ page }) => {
    const extras = withFriend({ quest: quest({ total: 10 }) });
    await signedIn(page, [], [], null, [], extras);
    await page.goto('/notice-board');
    await page.getByRole('button', { name: 'Collect 40 gold' }).click();
    await expect(page.getByText('Collected. A new quest is posted on Monday.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Collect/ })).toHaveCount(0);
    expect(
      extras.fellowship?.calls?.filter((c) => c.fn === 'collect_fellowship_quest'),
    ).toHaveLength(1);
  });

  test('a player who didn’t help is asked to lend a hand', async ({ page }) => {
    await signedIn(page, [], [], null, [], withFriend({ quest: quest({ total: 12, mine: 0 }) }));
    await page.goto('/notice-board');
    await expect(
      page.getByText('Your friends finished it. Lend a hand to share the 40 gold.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Collect/ })).toHaveCount(0);
  });
});

test.describe('gifts', () => {
  test('a ware can be given to a friend, in your gold', async ({ page }) => {
    const extras = withFriend();
    await signedIn(page, [], [], null, [], extras);
    await page.goto('/market');
    const tarboosh = page.getByRole('listitem').filter({ hasText: 'Red tarboosh' });
    await tarboosh.getByRole('button', { name: 'Give to a friend' }).click();
    const pick = tarboosh.getByRole('group', { name: 'Give Red tarboosh to a friend' });
    await expect(pick).toContainText('For 60 gold, to:');
    await pick.getByRole('button', { name: 'Basma' }).click();
    await expect(tarboosh.getByText('Red tarboosh is on its way to Basma.')).toBeVisible();
    await expect(page.getByText('70 gold', { exact: true })).toBeVisible();
    expect(extras.fellowship?.calls?.find((c) => c.fn === 'give_item')?.args).toEqual({
      p_friend: BASMA,
      p_item: 'tarboosh',
    });
    // The shield is for yourself.
    const shield = page.getByRole('listitem').filter({ hasText: /shield/i });
    await expect(shield.getByRole('button', { name: 'Give to a friend' })).toHaveCount(0);
  });

  test('a friend who has it already is named', async ({ page }) => {
    await signedIn(page, [], [], null, [], withFriend({ refuse: { give_item: 'owned' } }));
    await page.goto('/market');
    const tarboosh = page.getByRole('listitem').filter({ hasText: 'Red tarboosh' });
    await tarboosh.getByRole('button', { name: 'Give to a friend' }).click();
    await tarboosh.getByRole('button', { name: 'Basma' }).click();
    await expect(tarboosh.getByText('Basma already has it.')).toBeVisible();
  });

  test('a player alone is offered no gifts', async ({ page }) => {
    await signedIn(page, [], [], null, [], { gold: 130 });
    await page.goto('/market');
    await expect(page.getByRole('button', { name: 'Buy Red tarboosh for 60 gold' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Give to a friend' })).toHaveCount(0);
  });

  test('gifts for you are listed in Your House', async ({ page }) => {
    const gifts = [{ id: 1, from: BASMA, name: 'Basma', item: 'tarboosh', day: TODAY.day }];
    await signedIn(page, [], [], null, [], withFriend({ gifts }));
    await page.goto('/house');
    const panel = page.getByRole('region', { name: 'Fellowship' });
    await expect(panel.getByRole('heading', { name: 'Gifts for you' })).toBeVisible();
    await expect(panel).toContainText(
      'Basma sent you the Red tarboosh · Today. It’s in your wardrobe.',
    );
  });
});
