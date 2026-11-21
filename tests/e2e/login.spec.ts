import { expect, test } from './fixtures.ts';
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
  await page.getByLabel('Password', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('status')).toHaveText('Incorrect email or password.');
});

test("a sign-in that can't reach the server doesn't blame the password (review, 2026-11-15)", async ({
  page,
}) => {
  await fakeSupabase(page);
  await page.route('**/auth/v1/token**', (route) => route.abort());
  await page.goto('/');
  await page.getByLabel('Email').fill('adam@example.com');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('status')).toHaveText(/Couldn’t reach Waymark just now/);
});

test('the right password opens the lobby, and the session survives a reload', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/');
  await page.getByLabel('Email').fill('adam@example.com');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Signal Tower' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Signal Tower' })).toBeVisible();
});

test('"forgot your password?" opens its own step, which confirms without saying whether the account exists', async ({
  page,
}) => {
  await fakeSupabase(page);
  await page.goto('/');
  // Invite-only (ADR 0016, 0052): no sign-up, and the hint says how a friend gets in.
  await expect(
    page.getByText(
      'New here? Waymark is invite-only. Open the invite link you were sent, or sign in with the email and password you were given.',
    ),
  ).toBeVisible();
  // The email already typed comes along (Adam, 2026-11-19: the reset was easy to miss).
  await page.getByLabel('Email').fill('someone@example.com');
  await page.getByRole('button', { name: 'Forgot your password?' }).click();
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue('someone@example.com');
  await page.getByRole('button', { name: 'Send reset email' }).click();
  // Supabase's own mail reaches only the projects' owner, so friends are told who can help (#324).
  await expect(page.getByRole('status')).toHaveText(
    'If an account exists for that email, we’ve sent a password reset link. Didn’t get it within a few minutes? Ask whoever invited you to reset your password.',
  );
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue('someone@example.com');
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('the reset step asks for an email before sending (2026-11-19)', async ({ page }) => {
  const asked: string[] = [];
  await fakeSupabase(page);
  page.on('request', (r) => {
    if (r.url().includes('/auth/v1/recover')) asked.push(r.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Forgot your password?' }).click();
  await page.getByRole('button', { name: 'Send reset email' }).click();
  await expect(page.getByLabel('Email')).toBeFocused();
  expect(asked).toEqual([]);
});

test('a password can be shown while typed, and Caps Lock is pointed out (2026-11-19)', async ({
  page,
}) => {
  await fakeSupabase(page);
  await page.goto('/');
  const password = page.getByLabel('Password', { exact: true });
  await password.fill('secret words');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'Hide password' })).not.toHaveAttribute(
    'aria-pressed',
  );
  await page.getByRole('button', { name: 'Hide password' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  // Headless Chromium doesn't lock Caps from a key press: the key events carry the state.
  await password.focus();
  await password.dispatchEvent('keydown', { key: 'A', modifierCapsLock: true });
  await expect(page.getByText('Caps Lock is on.')).toBeVisible();
  await expect(password).toHaveAccessibleDescription('Caps Lock is on.');
  await password.dispatchEvent('keydown', { key: 'b', modifierCapsLock: false });
  await expect(page.getByText('Caps Lock is on.')).toHaveCount(0);
});

test('a player changes their password in Settings (#324)', async ({ page }) => {
  const updates: unknown[] = [];
  await fakeSupabase(page, updates);
  await page.addInitScript(() => localStorage.setItem('waymark:first-page-closed', '1'));
  await page.goto('/');
  await page.getByLabel('Email').fill('friend@example.com');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Change password' }).click();
  const fresh = page.getByLabel('New password', { exact: true });
  await expect(fresh).toHaveAccessibleDescription('At least 8 characters.');
  await fresh.fill('a long new password');
  // Typing stops short of the Show button: Settings' own padding doesn't undo its room.
  const room = await fresh.evaluate((e) => parseFloat(getComputedStyle(e).paddingRight));
  const button = await page.getByRole('button', { name: 'Show new password' }).boundingBox();
  expect(room).toBeGreaterThanOrEqual(button?.width ?? Infinity);
  await page.getByLabel('Confirm password', { exact: true }).fill('a long new passwort');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByText('Passwords do not match.')).toBeVisible();
  expect(updates).toEqual([]);
  await page.getByLabel('Confirm password', { exact: true }).fill('a long new password');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByText('Password changed. Use it next time you sign in.')).toBeVisible();
  expect(updates).toEqual([expect.objectContaining({ password: 'a long new password' })]);
  await expect(page.getByLabel('New password', { exact: true })).toHaveCount(0);
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
  test(`a ${type} email link asks for a new password twice, then opens the lobby`, async ({
    page,
  }) => {
    const updates: unknown[] = [];
    await fakeSupabase(page, updates);
    await page.goto(`/${emailLinkFragment(type)}`);
    await expect(page.getByRole('heading', { name: 'Set your password' })).toBeVisible();
    // Which account it's for, also for the browser's password manager.
    await expect(page.getByText('Enter a new password for adam@example.com.')).toBeVisible();
    await expect(page.locator('input[autocomplete="username"]')).toHaveValue('adam@example.com');
    // The rule is said up front, not only by the browser after a try.
    const fresh = page.getByLabel('New password', { exact: true });
    const again = page.getByLabel('Confirm password', { exact: true });
    await expect(fresh).toHaveAccessibleDescription('At least 8 characters.');
    await fresh.fill('short');
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(page.getByRole('heading', { name: 'Set your password' })).toBeVisible();
    expect(updates).toEqual([]);
    // Two that differ are caught before anything is saved (Adam, 2026-11-19).
    await fresh.fill('a long new password');
    await again.fill('a long new passwort');
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(page.getByText('Passwords do not match.')).toBeVisible();
    expect(updates).toEqual([]);
    await again.fill('a long new password');
    await page.getByRole('button', { name: 'Save new password' }).click();
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
