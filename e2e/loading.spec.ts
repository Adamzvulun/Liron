import { expect, test } from '@playwright/test';
import { deckWord, signedIn } from './fake-supabase.ts';

// Faster loading (#124): a hall's code loads when you enter it, a session's recordings are
// signed in one request, and the deck downloads once, then comes from the browser.

// Lesson-1 words under deck ids the reviewed lesson-1 list uses (content/arabic/lesson-words.json).
const WORDS = [
  deckWord(83, 'يابا', 'dad'),
  deckWord(1052, 'بنّ', 'coffee beans'),
  deckWord(1156, 'تين', 'figs'),
  deckWord(2981, 'تبن', 'hay'),
  deckWord(3258, 'بابا', 'dad'),
  deckWord(1771, 'نت', 'internet'),
  deckWord(4267, 'أنا', 'I'),
];
const MET = [
  'letter:alef',
  'letter:beh',
  'letter:teh',
  'letter:noon',
  'letter:yeh',
  'mark:fatha',
  'mark:kasra',
  'mark:damma',
];
const START = { lesson: 1, streak: 0, met: MET, done: false, sessions: 1 };

test('the square loads without the halls, and a hall loads when you enter it', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => r.resourceType() === 'script' && scripts.push(r.url()));
  await signedIn(page, [], [], START, WORDS);
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Caravanserai/ }).first()).toBeVisible();
  expect(scripts.some((s) => /Caravanserai|TowerHall/.test(s))).toBe(false);
  await page.goto('/caravanserai');
  await expect(page.getByRole('button', { name: /The scribe’s table/ })).toBeVisible();
  expect(scripts.some((s) => /Caravanserai/.test(s))).toBe(true);
  expect(scripts.some((s) => /TowerHall/.test(s))).toBe(false);
});

test('a session signs its recordings in one request; the deck downloads once', async ({ page }) => {
  const signs: string[] = [];
  const deckLoads: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (r.method() === 'POST' && url.pathname.startsWith('/storage/v1/object/sign/'))
      signs.push(url.pathname);
    if (
      url.pathname === '/rest/v1/content_items' &&
      url.searchParams.get('select') !== 'updated_at'
    )
      deckLoads.push(url.search);
  });
  await signedIn(page, [], [], START, WORDS);
  await page.goto('/caravanserai');
  await page.getByRole('button', { name: /The scribe’s table/ }).click();
  await page.getByRole('button', { name: /^Practi[sc]e$/ }).click();
  await expect(page.getByText(/^Listen · 1 of /)).toBeVisible();
  // Answer a few questions: each plays a recording, and none asks for its own link.
  for (let i = 0; i < 4; i++) {
    await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  expect(signs).toEqual(['/storage/v1/object/sign/private-media']);
  expect(deckLoads).toHaveLength(1);

  // A new visit: the deck comes from the browser, after a version check.
  await page.reload();
  await page.getByRole('button', { name: /The scribe’s table/ }).click();
  await expect(page.getByRole('button', { name: /^Practi[sc]e$/ })).toBeVisible();
  expect(deckLoads).toHaveLength(1);
});

test('signing out wipes the deck kept in the browser (ADR 0011)', async ({ page }) => {
  const keptPacks = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const req = indexedDB.open('waymark-content', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('packs');
          req.onsuccess = () => {
            const db = req.result;
            const count = db.transaction('packs').objectStore('packs').count();
            count.onsuccess = () => {
              db.close();
              resolve(count.result);
            };
          };
        }),
    );
  await signedIn(page, [], [], START, WORDS);
  await page.goto('/caravanserai');
  await page.getByRole('button', { name: /The scribe’s table/ }).click();
  await expect(page.getByRole('button', { name: /^Practi[sc]e$/ })).toBeVisible();
  await expect.poll(keptPacks).toBeGreaterThan(0);

  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect.poll(keptPacks).toBe(0);
});
