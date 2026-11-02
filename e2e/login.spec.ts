import { expect, test } from '@playwright/test';
import { emailLinkFragment, fakeSupabase, PASSWORD, signedIn } from './fake-supabase.ts';

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
  await expect(page.getByRole('status')).toHaveText("That email and password don't match.");
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
  await page.getByRole('button', { name: 'Sign out' }).click();
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
