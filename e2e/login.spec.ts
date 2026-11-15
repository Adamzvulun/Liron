import { expect, test } from '@playwright/test';
import {
  emailLinkFragment,
  FAKE_SUPABASE_URL,
  fakeSession,
  fakeSupabase,
  PASSWORD,
  signedIn,
} from './fake-supabase.ts';

test('logged out, you see the login screen and not the lobby', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Signal Tower' })).toHaveCount(0);
});

test('a wrong password shows an error', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/');
  await page.getByLabel('Email').fill('adam@example.com');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Enter Waymark' }).click();
  await expect(page.getByRole('status')).toHaveText('That email and password don’t match.');
});

test("a sign-in that can't reach the server doesn't blame the password (review, 2026-11-15)", async ({
  page,
}) => {
  await fakeSupabase(page);
  await page.route('**/auth/v1/token**', (route) => route.abort());
  await page.goto('/');
  await page.getByLabel('Email').fill('adam@example.com');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Enter Waymark' }).click();
  await expect(page.getByRole('status')).toHaveText(/Couldn’t reach Waymark just now/);
});

test('the right password opens the lobby, and the session survives a reload', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/');
  await page.getByLabel('Email').fill('adam@example.com');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Enter Waymark' }).click();
  await expect(page.getByRole('heading', { name: 'Signal Tower' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Signal Tower' })).toBeVisible();
});

test('"email me a link" confirms without saying whether the account exists', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/');
  await page.getByLabel('Email').fill('someone@example.com');
  await page.getByRole('button', { name: /Email me a link/ }).click();
  await expect(page.getByRole('status')).toHaveText(
    'If that email has an account, a link is on its way.',
  );
});

test('signing out returns to the login screen and stays there after a reload', async ({ page }) => {
  await signedIn(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  // Signing out starts the page afresh (App.tsx, report §4ay): wait for that load, or the
  // reload below can race it.
  const fresh = page.waitForEvent('load');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await fresh;
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

for (const type of ['invite', 'recovery'] as const) {
  test(`a ${type} email link asks for a new password, then opens the lobby`, async ({ page }) => {
    const updates: unknown[] = [];
    await fakeSupabase(page, updates);
    await page.goto(`/${emailLinkFragment(type)}`);
    await expect(page.getByRole('heading', { name: 'Choose a password' })).toBeVisible();
    await page.getByLabel('New password').fill('short');
    await page.getByRole('button', { name: 'Save and enter' }).click();
    await expect(page.getByRole('heading', { name: 'Choose a password' })).toBeVisible();
    expect(updates).toEqual([]);
    await page.getByLabel('New password').fill('a long new password');
    await page.getByRole('button', { name: 'Save and enter' }).click();
    await expect(page.getByRole('heading', { name: 'Signal Tower' })).toBeVisible();
    expect(updates).toEqual([expect.objectContaining({ password: 'a long new password' })]);
  });
}

test('a slow sign-in check says so instead of showing an empty screen', async ({ page }) => {
  await signedIn(page);
  // The kept session has run out, so the app must renew it before it knows who you are.
  await page.addInitScript(() => {
    const key = 'sb-127-auth-token';
    const kept = JSON.parse(localStorage.getItem(key) ?? '{}') as { expires_at?: number };
    localStorage.setItem(key, JSON.stringify({ ...kept, expires_at: 1 }));
  });
  let renew!: () => void;
  const renewed = new Promise<void>((done) => (renew = done));
  await page.route(`${FAKE_SUPABASE_URL}/auth/v1/token**`, async (route) => {
    await renewed;
    await route.fulfill({ json: fakeSession() });
  });
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'Opening the gates…' })).toBeVisible();
  renew();
  await expect(page.getByRole('heading', { name: 'Signal Tower' })).toBeVisible();
  await expect(page.getByText('Opening the gates…')).toHaveCount(0);
});
