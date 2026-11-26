import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures.ts';
import { FAKE_SUPABASE_URL, PASSWORD, signedIn } from './fake-supabase.ts';

// Take your data and leave (task 10.2, #500).
const deleteCalls: string[] = [];

test.beforeEach(async ({ page }) => {
  deleteCalls.length = 0;
  await signedIn(page);
  // What the shared stub doesn't know: a player with nothing in those tables.
  await page.route(
    new RegExp(
      `${FAKE_SUPABASE_URL}/rest/v1/(rating_log|subject_events|daily_chests|daily_contracts|player_achievements|friend_codes|homes)`,
    ),
    (route) => route.fulfill({ json: [] }),
  );
  await page.route(`${FAKE_SUPABASE_URL}/rest/v1/rpc/delete_my_account`, (route) => {
    deleteCalls.push('delete_my_account');
    return route.fulfill({ json: null });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
});

test('Download my data saves one JSON file of the player’s own rows', async ({ page }) => {
  const saved = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download my data' }).click();
  const file = await saved;
  expect(file.suggestedFilename()).toMatch(/^waymark-my-data-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await file.path();
  const data = JSON.parse(await readFile(path, 'utf8'));
  expect(Object.keys(data)).toContain('wallets');
  expect(Object.keys(data)).toContain('my_notes');
  await expect(page.getByText('Saved to your downloads.')).toBeVisible();
});

test('deleting needs the password and the word, says it is final, then says goodbye', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Delete my account…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete your account?' });
  await expect(dialog).toContainText('your progress, your room, your notes and chats');
  await expect(dialog).toContainText('no undo');
  await expect(dialog.getByRole('button', { name: 'Download my data first' })).toBeFocused();
  const go = dialog.getByRole('button', { name: 'Delete my account for good' });
  await expect(go).toBeDisabled();
  await dialog.getByLabel('Your password', { exact: true }).fill('not the one');
  await dialog.getByLabel('Type DELETE to confirm').fill('delete');
  await expect(go).toBeDisabled();
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await go.click();
  // A wrong password: the account stays, nothing is asked of the database.
  await expect(dialog.getByRole('alert')).toHaveText('Incorrect email or password.');
  expect(deleteCalls).toEqual([]);
  await dialog.getByLabel('Your password', { exact: true }).fill(PASSWORD);
  await go.click();
  await expect(page.getByRole('heading', { name: 'Goodbye' })).toBeVisible();
  expect(deleteCalls).toEqual(['delete_my_account']);
  await page.getByRole('button', { name: 'Back to the gates' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('Keep my account closes the dialog and deletes nothing', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete my account…' }).click();
  await page.getByRole('button', { name: 'Keep my account' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(deleteCalls).toEqual([]);
});
