import { expect, test, type Page } from '@playwright/test';
import { lessonWord, signedIn } from './fake-supabase.ts';

// Every account reads the deck (ADR 0050). This is the safety net for one that doesn't, say
// because its licence row was deleted by hand: task 2.1's "Done when". The deck's rows are
// there, but row-level security gives this account none of them.
const WORDS = [lessonWord(1, 'بيت', 'house'), lessonWord(2, 'باب', 'door')];
const LETTERS = [
  'letter:alef',
  'letter:beh',
  'letter:teh',
  'letter:theh',
  'letter:jeem',
  'letter:hah',
  'letter:khah',
  'letter:dal',
  'letter:thal',
  'letter:reh',
  'letter:zain',
  'letter:seen',
  'letter:sheen',
  'letter:sad',
  'letter:dad',
  'letter:tah',
  'letter:zah',
  'letter:ain',
  'letter:ghain',
  'letter:feh',
  'letter:qaf',
  'letter:kaf',
  'letter:lam',
  'letter:meem',
  'letter:noon',
  'letter:heh',
  'letter:waw',
  'letter:yeh',
  'letter:teh-marbuta',
  'letter:hamza',
  'letter:alef-maqsura',
  'letter:lam-alef',
];
const AT_SALIM = {
  lesson: 8,
  done: true,
  sessions: 1,
  guest: true,
  phraseSet: 4,
  met: LETTERS,
  written: LETTERS.filter((l) => l !== 'letter:lam-alef'),
  ranks: ['guest'],
  only: { listen: 1, read: 1 },
  words: { chapter: 1, sessions: 1 },
  echo: { heard: ['hah-heh', 'ain-hamza', 'khah-hah', 'ghain-khah'] },
};
const onPhone = () => test.info().project.name === 'phone';

/** The Caravanserai's compass line in the square, on either size. */
async function caravanseraiLine(page: Page) {
  if (onPhone()) {
    const compass = page.getByRole('navigation', { name: 'Next on your road' });
    // A guild that can offer a step leads; the Caravanserai waits behind the count.
    await expect(compass.getByRole('link').first()).toContainText('Signal Tower');
    await compass.getByRole('button', { name: 'Show the other lines' }).click();
    return compass.getByRole('link', { name: /Caravanserai/ });
  }
  const quests = page.getByRole('region', { name: 'Quests' });
  await expect(quests.getByRole('link').first()).toContainText('Signal Tower');
  return quests.getByRole('link', { name: /Caravanserai/ });
}

test.describe('an account without the deck (ADR 0050 §3)', () => {
  test('follows the compass through the Caravanserai with no dead end', async ({ page }) => {
    await signedIn(page, [], [], null, WORDS, { licensee: false });
    await page.goto('/');
    const line = await caravanseraiLine(page);
    await expect(line).toContainText('This account can’t read the deck yet');
    await line.click();

    // The courtyard says the same, and counts the whole road.
    await expect(page).toHaveURL(/\/caravanserai$/);
    await expect(page.getByText('This account can’t read the deck yet')).toBeVisible();
    await expect(page.getByText(/^Step 1 of 275/)).toBeVisible();

    // Every door that reads the deck says why it's empty, and the way back is beside it.
    // (The innkeeper's table first asks a new player to pass the Painted Sign, which is true.)
    for (const door of ['lesson', 'listen', 'read', 'trial', 'phrases', 'echo']) {
      await page.goto(`/caravanserai?open=${door}`);
      await expect(page.getByText(/come from a deck this account can’t read yet/)).toBeVisible();
      await expect(page.getByText(/haven’t been loaded/)).toHaveCount(0);
      await expect(page.getByRole('button', { name: '← Courtyard' })).toBeVisible();
    }
    await page.getByRole('button', { name: '← Courtyard' }).click();
    await expect(page.getByText('This account can’t read the deck yet')).toBeVisible();
  });

  test('a licensee still sees the deck’s words', async ({ page }) => {
    await signedIn(page, [], [], null, WORDS);
    await page.goto('/caravanserai');
    await expect(page.getByText(/can’t read the deck/)).toHaveCount(0);
    await page.getByRole('button', { name: /The scribe’s table/ }).click();
    await expect(page.getByText('Meet a letter · 1 of 8')).toBeVisible();
  });
});

test('a site without Sit and talk doesn’t send the compass to the table (v1 review, low 3)', async ({
  page,
}) => {
  // Every step before Sit and talk with Salim done (the road tests' own upTo).
  await page.route('**/api/services', (route) =>
    route.fulfill({ json: { say: false, talk: false, radio: false } }),
  );
  await signedIn(page, [], [], AT_SALIM);
  await page.goto('/caravanserai');
  await expect(page.getByText('Nobody is at the table on this site yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Next:/ })).not.toContainText('Sit and talk');
});
