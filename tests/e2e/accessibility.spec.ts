import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { emailLinkFragment, fakeSupabase, friendCard, signedIn } from './fake-supabase.ts';
import { STARTER } from '../../src/core/home/layout.ts';

// Every screen against WCAG 2.1 A and AA, with axe-core (ADR 0051). Adam, 2026-11-19: "not
// automatically every CI, once we push a major release". So it runs on a release PR into `main`
// and on every local run, like the phone's full set (playwright.config.ts), and is skipped on a
// PR into `dev`.
const release = !process.env.CI || process.env.PHONE_ALL === '1';

const MORSE = { unlocked: 24, met: [...'KMURESNAPTLWI.JZ=FOY,VG5'], trials: [1, 2] };
const BASMA = '00000000-0000-0000-0000-0000000000b2';

const SCREENS = [
  '/',
  '/signal-tower',
  '/caravanserai',
  '/notice-board',
  '/house',
  '/house#wardrobe',
  '/house#trophies',
  '/house#ledger',
  '/house#fellowship',
  '/market',
  '/arena',
  '/guidebook',
  '/nowhere',
  '/signal-tower?open=koch',
  '/signal-tower?open=sending',
  '/signal-tower?open=words',
  '/signal-tower?open=lamp',
  '/signal-tower?open=watch',
  '/signal-tower?open=rush',
  '/signal-tower?open=radio',
  '/signal-tower?open=far',
  '/signal-tower?open=wire',
  '/signal-tower?open=beacon',
  '/signal-tower?open=trial',
  '/caravanserai?open=lesson',
  '/caravanserai?open=words',
  '/caravanserai?open=chat',
  '/caravanserai?open=echo',
];

/** What axe finds on the page as it stands, one line per problem and element. */
async function problems(page: Page): Promise<string[]> {
  // Let the screen settle: paintings fade in, and a door opens after its data arrives.
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')}`),
  );
}

test.describe('accessibility (ADR 0051)', () => {
  test.skip(!release, 'runs on a release PR into main, and locally');

  test('the sign-in screens', async ({ page }) => {
    await fakeSupabase(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(await problems(page)).toEqual([]);
    await page.getByRole('button', { name: 'Forgot your password?' }).click();
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
    expect(await problems(page)).toEqual([]);
  });

  test('choosing a password from an email link', async ({ page }) => {
    await fakeSupabase(page);
    await page.goto(`/${emailLinkFragment('invite')}`);
    await expect(page.getByRole('heading', { name: 'Set your password' })).toBeVisible();
    expect(await problems(page)).toEqual([]);
  });

  test('creating an account from an invite link', async ({ page }) => {
    await fakeSupabase(page);
    await page.route('**/api/join', (route) => route.fulfill({ json: { open: true } }));
    await page.goto(`/join#${'ab'.repeat(32)}`);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
    expect(await problems(page)).toEqual([]);
  });

  test('Settings', async ({ page }) => {
    await signedIn(page, [], [], MORSE, [], { invites: { inviter: true } });
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Change password' }).click();
    await page.getByRole('button', { name: 'Create invite link' }).click();
    await expect(page.getByLabel('Invite link')).toBeVisible();
    expect(await problems(page)).toEqual([]);
  });

  test('Nour’s welcome, and a first-visit card', async ({ page }) => {
    await signedIn(page, [], [], null, [], { firstPage: true, guideSeen: [] });
    await page.goto('/');
    await page.getByRole('button', { name: 'Look around the square first' }).click();
    await expect(page.getByRole('region', { name: 'Nour, the lamplighter' })).toBeVisible();
    expect(await problems(page)).toEqual([]);
    await page.goto('/market');
    await expect(page.getByRole('region', { name: 'About The Market' })).toBeVisible();
    expect(await problems(page)).toEqual([]);
  });

  test('the home: decorating, a friend’s room and their shelf (v1.4)', async ({ page }) => {
    await signedIn(page, [], [], MORSE, [], {
      owned: ['home-chair', 'wallpaper-zellige'],
      fellowship: {
        friends: [friendCard(BASMA, 'Basma', { ranks: ['morse:rank-listener'] })],
      },
    });
    await page.goto('/house');
    await page.getByRole('button', { name: 'Decorate' }).click();
    await page.getByRole('button', { name: 'Pick up the chair' }).click();
    await expect(page.getByRole('region', { name: 'Decorate' })).toBeVisible();
    expect(await problems(page)).toEqual([]);
    await page.goto(`/house/visit/${BASMA}`);
    await expect(page.getByRole('group', { name: /^Basma’s room/ })).toBeVisible();
    expect(await problems(page)).toEqual([]);
    await page.getByRole('button', { name: 'Shelf: see their trophies' }).click();
    await expect(page.getByRole('dialog', { name: 'Basma’s trophies' })).toBeVisible();
    expect(await problems(page)).toEqual([]);
  });

  test('the home lived in: notes, coziness and Turn (v1.5)', async ({ page }) => {
    await signedIn(page, [], [], MORSE, [], {
      owned: ['home-chair'],
      held: ['home-chair'],
      home: {
        ...STARTER,
        pieces: [...STARTER.pieces, { id: 'home-chair', at: [6, 2], facing: 'away' }],
      },
      fellowship: {
        friends: [friendCard(BASMA, 'Basma', { cozy: 7 })],
        notes: [{ id: 1, from: BASMA, name: 'Basma', note: 'tea', day: '2026-11-02' }],
        left: { [BASMA]: '73' },
      },
    });
    await page.goto('/house');
    await expect(page.locator('.room-cozy__line')).toBeVisible();
    await page.getByRole('button', { name: 'Decorate' }).click();
    await page.getByRole('group', { name: /decorating/ }).waitFor();
    expect(await problems(page)).toEqual([]);
    // Away and back, so the room opens afresh with the Fellowship open.
    await page.goto('/notice-board');
    await page.goto('/house#fellowship');
    await expect(page.getByRole('heading', { name: 'Notes in your letterbox' })).toBeVisible();
    expect(await problems(page)).toEqual([]);
    await page.goto(`/house/visit/${BASMA}`);
    await page.getByRole('button', { name: 'Letterbox: leave a note' }).click();
    await expect(page.getByRole('dialog', { name: 'Basma’s letterbox' })).toBeVisible();
    expect(await problems(page)).toEqual([]);
  });

  for (const path of SCREENS) {
    test(`${path}`, async ({ page }) => {
      await signedIn(page, [], [], MORSE, [], {
        fellowship: { friends: [friendCard(BASMA, 'Basma')] },
      });
      await page.goto(path);
      expect(await problems(page)).toEqual([]);
    });
  }
});
