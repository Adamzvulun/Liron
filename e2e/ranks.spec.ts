import { expect, type Page, test } from '@playwright/test';
import { signedIn, type SaveSessionArgs } from './fake-supabase.ts';

// The rank-up card (#174, ADR 0035): a rank you've earned but not taken shows over the hall;
// taking it saves the rank in the subject state and sends rank-<id> with the same save.
const saves = (page: Page) => {
  const sent: SaveSessionArgs[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/rpc/save_session')) sent.push(r.postDataJSON() as SaveSessionArgs);
  });
  return sent;
};

test.describe('Guild ranks (#174)', () => {
  test('a new guest takes the rank in the courtyard, and it is saved once', async ({ page }) => {
    const sent = saves(page);
    await signedIn(page, [], [], { lesson: 8, done: true, guest: true });
    await page.goto('/caravanserai');
    const card = page.getByRole('dialog', { name: 'Guest' });
    await expect(card.getByText('House of the Crossing · a new rank')).toBeVisible();
    await expect(card.getByText(/Next: Traveler/)).toBeVisible();
    await card.getByRole('button', { name: 'Take the rank' }).click();
    await expect(card).toHaveCount(0);
    await expect.poll(() => sent.length).toBe(1);
    const save = sent[0];
    expect(save?.p_events).toEqual([{ kind: 'rank-guest', count: 1 }]);
    expect((save?.p_state as { ranks: string[] }).ranks).toEqual(['guest']);
    // Taken: the banner now points at the next rank.
    await expect(
      page
        .getByText(/Traveler(: 0 \/ 4| · 0 of 4)/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  });

  test('the Beacon’s Answer passed makes you a Listener', async ({ page }) => {
    const sent = saves(page);
    const koch = 'KMURESNAPTLWI.JZ=FOY,VG5/Q92H38B?47C1D60X';
    await signedIn(page, [], [], { unlocked: 41, met: [...koch], trials: [1, 2, 3, 4, 5] });
    await page.goto('/signal-tower');
    const card = page.getByRole('dialog', { name: 'Listener' });
    await expect(card.getByText('Learn all 41 Koch characters')).toBeVisible();
    await card.getByRole('button', { name: 'Take the rank' }).click();
    await expect(card).toHaveCount(0);
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]?.p_events).toEqual([{ kind: 'rank-listener', count: 1 }]);
  });

  test('a rank already taken shows no card', async ({ page }) => {
    await signedIn(page, [], [], { lesson: 8, done: true, guest: true, ranks: ['guest'] });
    await page.goto('/caravanserai');
    await expect(
      page
        .getByText(/Traveler(: 0 \/ 4| · 0 of 4)/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
