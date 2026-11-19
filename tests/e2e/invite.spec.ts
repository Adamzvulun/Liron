import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { fakeSupabase, PASSWORD, signedIn } from './fake-supabase.ts';

// Invite links (ADR 0052): an inviter makes one in Settings; a friend opens it, creates their
// account and is signed in. api/join.ts itself is tested in tests/join-api.test.ts.

const CODE = 'ab'.repeat(32);

/** Fakes /api/join: `check` answers `open`, `join` answers `joined`; every body is recorded. */
async function joinApi(page: Page, open: boolean, joined: object = { ok: true }) {
  const sent: Record<string, unknown>[] = [];
  await page.route('**/api/join', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    sent.push(body);
    if (body.action === 'check') return route.fulfill({ json: { open } });
    const failed = 'error' in joined;
    return route.fulfill({ status: failed ? 409 : 200, json: joined });
  });
  return sent;
}

async function fill(page: Page, again = PASSWORD) {
  await page.getByLabel('Email').fill('friend@example.com');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password', { exact: true }).fill(again);
}

test.describe('invite links (ADR 0052)', () => {
  test('an inviter creates a link in Settings and copies it', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const made: string[] = [];
    await signedIn(page, [], [], null, [], { invites: { inviter: true, made } });
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Invite a friend' })).toBeVisible();
    await page.getByRole('button', { name: 'Create invite link' }).click();
    const link = page.getByLabel('Invite link');
    await expect(link).toHaveValue(new RegExp(`/join#${made[0]}$`));
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Link copied.')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await link.inputValue());
    // Another link is another code.
    await page.getByRole('button', { name: 'Create another link' }).click();
    await expect(link).toHaveValue(new RegExp(`/join#${made[1]}$`));
    expect(made[1]).not.toBe(made[0]);
  });

  test('on a site without the secret key, Settings says so and makes no link', async ({ page }) => {
    await signedIn(page, [], [], null, [], { invites: { inviter: true } });
    await page.route('**/api/join', (route) =>
      route.fulfill({ status: 503, json: { error: 'not-set-up' } }),
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(
      page.getByText('Invite links aren’t set up on this site yet', { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create invite link' })).toHaveCount(0);
  });

  test('a player who isn’t an inviter sees no invite section', async ({ page }) => {
    await signedIn(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Invite a friend' })).toHaveCount(0);
  });

  test('a friend opens the link, creates an account and is signed in', async ({ page }) => {
    await fakeSupabase(page);
    const sent = await joinApi(page, true);
    await page.goto(`/join#${CODE}`);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByText('You’ve been invited to Waymark.')).toBeVisible();
    await fill(page);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(sent).toEqual([
      { action: 'check', code: CODE },
      { action: 'join', code: CODE, email: 'friend@example.com', password: PASSWORD },
    ]);
  });

  test('passwords that don’t match are caught before anything is sent', async ({ page }) => {
    await fakeSupabase(page);
    const sent = await joinApi(page, true);
    await page.goto(`/join#${CODE}`);
    await fill(page, 'something else');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Passwords do not match.')).toBeVisible();
    expect(sent.filter((b) => b.action === 'join')).toEqual([]);
  });

  test('an email already taken says so, and offers to sign in', async ({ page }) => {
    await fakeSupabase(page);
    await joinApi(page, true, { error: 'email-taken' });
    await page.goto(`/join#${CODE}`);
    await fill(page);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(
      page.getByText('An account with this email already exists. Sign in instead.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('a used or expired link says so', async ({ page }) => {
    await fakeSupabase(page);
    await joinApi(page, false);
    await page.goto(`/join#${CODE}`);
    await expect(page.getByRole('heading', { name: 'Invite link expired' })).toBeVisible();
    await page.getByRole('button', { name: 'Go to sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
