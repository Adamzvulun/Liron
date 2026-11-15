import { expect, type Page, test } from '@playwright/test';
import { signedIn, type SaveSessionArgs } from './fake-supabase.ts';

// The Far Station (#178): the Operator's trial, a whole contact. Keying it right in a test is
// too slow, so this checks the door, the turns (copy, key, AGN?, report, thanks, SK) and a
// failed contact (saved with no trial event).
const KOCH = 'KMURESNAPTLWI.JZ=FOY,VG5/Q92H38B?47C1D60X';
const listener = { unlocked: 41, met: [...KOCH], trials: [1, 2, 3, 4, 5], ranks: ['listener'] };
const keyer = {
  ...listener,
  sending: { drills: 20, ditMs: 80 },
  rankTrials: ['lamp-signal'],
  ranks: ['listener', 'keyer'],
};

const saves = (page: Page) => {
  const sent: SaveSessionArgs[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/rpc/save_session')) sent.push(r.postDataJSON() as SaveSessionArgs);
  });
  return sent;
};

/** One short press on the brass key, then Done. */
async function keyOnce(page: Page) {
  const pad = page.getByRole('button', { name: /Morse key/ });
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  if (!box) throw new Error('no key');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Done' }).click();
}

test.describe('The Far Station (#178)', () => {
  test('stays shut until the Lamp Signal is passed', async ({ page }) => {
    await signedIn(page, [], [], listener);
    await page.goto('/signal-tower');
    await expect(
      page.getByText('Locked · pass the Lamp Signal').filter({ visible: true }).first(),
    ).toBeVisible();
    await page.goto('/signal-tower?open=far');
    await expect(page.getByRole('heading', { name: 'The Far Station' })).toBeVisible();
    await expect(page.getByText('Opens once you’ve passed the Lamp Signal.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tune in' })).toHaveCount(0);
  });

  test('a whole contact, turn by turn; a broken one is saved with no trial', async ({ page }) => {
    const sent = saves(page);
    await signedIn(page, [], [], keyer);
    await page.goto('/signal-tower');
    await page.getByRole('button', { name: /Radio Room.*Trial · The Far Station/ }).click();
    await page.getByRole('button', { name: 'Tune in' }).click();

    // 1. Their CQ: copy the call. Over stays shut until it's filled.
    await expect(page.getByText('Turn 1 of 5')).toBeVisible();
    const over = page.getByRole('button', { name: 'Over' });
    await expect(over).toBeDisabled();
    await page.getByLabel('Their call').fill('k1abc');
    await expect(page.getByLabel('Their call')).toHaveValue('K1ABC');
    await over.click();

    // 2. Answer with the key; a garbled answer gets one AGN?.
    await expect(page.getByText('Your turn: answer them with the key.')).toBeVisible();
    await keyOnce(page);
    await expect(page.getByText('AGN?')).toBeVisible();
    await keyOnce(page);

    // 3. Their report.
    await page.getByLabel('Signal report (RST)').fill('599');
    await page.getByLabel('Their name').fill('TOM');
    await page.getByLabel('Their town (QTH)').fill('OSLO');
    await over.click();

    // 4. Your thanks.
    await keyOnce(page);
    await keyOnce(page);

    // 5. Their sign-off: which prosign?
    await page.getByRole('radio', { name: 'SK' }).check();
    await over.click();

    await expect(
      page.getByRole('heading', { name: 'The contact didn’t make the log' }),
    ).toBeVisible();
    await expect(page.getByText('+10 XP')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]?.p_events).toEqual([]);
    expect((sent[0]?.p_state as { rankTrials: string[] }).rankTrials).toEqual(['lamp-signal']);
  });
});

test('leaving mid-turn closes the desk’s sound and opens no more (review, 2026-11-15)', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as { made: number; shut: number };
    w.made = 0;
    w.shut = 0;
    const Real = window.AudioContext;
    window.AudioContext = class extends Real {
      constructor(o?: AudioContextOptions) {
        super(o);
        w.made += 1;
      }
      close() {
        w.shut += 1;
        return super.close();
      }
    };
  });
  await signedIn(page, [], [], keyer);
  await page.goto('/signal-tower');
  await page.getByRole('button', { name: /Radio Room.*Trial · The Far Station/ }).click();
  await page.getByRole('button', { name: 'Tune in' }).click();
  await expect(page.getByText('Turn 1 of 5')).toBeVisible();
  await page.getByRole('button', { name: /Tower hall/ }).click();
  await expect(page.getByText('Turn 1 of 5')).toHaveCount(0);
  const counts = () =>
    page.evaluate(() => {
      const w = window as unknown as { made: number; shut: number };
      return [w.made, w.shut];
    });
  await expect
    .poll(async () => {
      const [made, shut] = await counts();
      return made - shut;
    })
    .toBe(0);
});
