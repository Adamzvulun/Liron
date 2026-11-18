import { expect, type Page, test } from '@playwright/test';
import { signedIn, type SaveSessionArgs } from './fake-supabase.ts';

// The Radio Room on the air (E16): after the Far Station, operators call CQ each day. Keying a
// whole contact right is too slow for a test, so this checks the door, setting up your station,
// who's calling, QRS, the operator's own AGN, and a contact that misses the log.
const KOCH = 'KMURESNAPTLWI.JZ=FOY,VG5/Q92H38B?47C1D60X';
const keyer = {
  unlocked: 41,
  met: [...KOCH],
  trials: [1, 2, 3, 4, 5],
  sending: { drills: 20, ditMs: 80 },
  rankTrials: ['lamp-signal'],
  ranks: ['listener', 'keyer'],
};
const operator = {
  ...keyer,
  rankTrials: ['lamp-signal', 'far-station'],
  ranks: ['listener', 'keyer', 'operator'],
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

/** Three long presses, a letter gap apart, then Done: three letters for the free turn. */
async function keyThree(page: Page) {
  const pad = page.getByRole('button', { name: /Morse key/ });
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  if (!box) throw new Error('no key');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 3; i++) {
    await page.mouse.down();
    await page.waitForTimeout(240);
    await page.mouse.up();
    await page.waitForTimeout(330);
  }
  await page.getByRole('button', { name: 'Done' }).click();
}

test.describe('The Radio Room on the air (E16)', () => {
  test('stays shut until the Far Station is passed', async ({ page }) => {
    await signedIn(page, [], [], keyer);
    await page.goto('/signal-tower?open=radio');
    await expect(
      page.getByText(/come on the air once you’ve worked the Far Station/),
    ).toBeVisible();
    // Both stand in the Radio Room's own painted room (roadmap A5), not the tower hall.
    const room = page.locator('.hall-backdrop[data-hall="radio"]');
    await expect(room.locator('img')).toHaveJSProperty('complete', true);
    await page.getByRole('button', { name: 'The Far Station' }).click();
    await expect(page.getByRole('heading', { name: 'The Far Station' })).toBeVisible();
    await expect(room).toHaveCount(1);
    await page.getByRole('button', { name: '← Tower hall' }).click();
    // The lessons sit at the listening desk (A6); the trials face the tower hall.
    await page.goto('/signal-tower?open=koch');
    await expect(page.locator('.hall-backdrop[data-hall="desk"]')).toHaveCount(1);
    await page.goto('/signal-tower?open=trial');
    await expect(page.locator('.hall-backdrop[data-hall="tower"]')).toHaveCount(1);
  });

  test('set up your station, answer a CQ, ask for QRS, and log the try', async ({ page }) => {
    const sent = saves(page);
    await signedIn(page, [], [], operator);
    await page.goto('/signal-tower');
    await page.getByRole('button', { name: /Radio Room.*On the air · 3 calling/ }).click();

    // Your station: a name and a town, letters only, and a callsign to keep.
    const go = page.getByRole('button', { name: 'Get my callsign' });
    await expect(go).toBeDisabled();
    await page.getByLabel('Your name on the air').fill('Ad4m');
    await expect(page.getByLabel('Your name on the air')).toHaveValue('ADM');
    await page.getByLabel('Your town (QTH)').fill('Haifa');
    await go.click();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]?.p_xp).toBe(0);
    const radio = (sent[0]?.p_state as { radio: { call: string; name: string } }).radio;
    expect(radio).toMatchObject({ name: 'ADM', qth: 'HAIFA', contacts: 0 });
    expect(radio.call).toMatch(/^[A-Z0-9]+$/);

    // Who's calling: the three who are open at once.
    await expect(page.getByText(`your call ${radio.call}`)).toBeVisible();
    for (const who of ['Nils, a fellow newcomer', 'Marta, a schoolteacher', 'Captain Ivo']) {
      await expect(page.getByRole('heading', { name: new RegExp(who) })).toBeVisible();
    }
    await expect(
      page.getByText('Next on the air: Kai, on a mountaintop, after 3 more'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Answer MARTA' }).click();
    await expect(page.getByText(/Turn 1 of 8 · Marta, a schoolteacher · 15 wpm/)).toBeVisible();

    // QRS, even while she sends: 5 wpm slower, and no slower than 10.
    await page.getByRole('button', { name: /QRS/ }).click();
    await expect(page.getByText(/· 10 wpm ·/)).toBeVisible();
    await expect(page.getByRole('button', { name: /QRS/ })).toHaveCount(0);
    await page.getByLabel('Their call').fill('qm2rta');
    await page.getByRole('button', { name: 'Over' }).click();

    // Answer with the key; garbled keying gets her own PSE AGN.
    await keyOnce(page);
    await expect(page.getByText('PSE AGN')).toBeVisible();
    await keyOnce(page);

    // Her report.
    await page.getByLabel('Signal report (RST)').fill('579');
    await page.getByLabel('Their name').fill('MARTA');
    await page.getByLabel('Their town (QTH)').fill('PORTO');
    await page.getByRole('button', { name: 'Over' }).click();
    await keyOnce(page);
    await keyOnce(page);

    // Her chatter: the temperature.
    await page.getByLabel('Their temperature (°C)').fill('99');
    await page.getByRole('button', { name: 'Over' }).click();

    // Your own news (ADR 0037): free, not scored, and you can skip it.
    await expect(page.getByText(/Turn 6 of 8/)).toBeVisible();
    await expect(page.getByText(/key a few words of your own news for MARTA/)).toBeVisible();
    await page.getByRole('button', { name: 'Skip: no news today' }).click();
    await keyOnce(page);
    await keyOnce(page);

    // Her sign-off: nothing to copy.
    await expect(page.getByText('Turn 8 of 8')).toBeVisible();
    await page.getByRole('button', { name: 'Over' }).click();

    await expect(
      page.getByRole('heading', { name: 'The contact didn’t make the log' }),
    ).toBeVisible();
    await expect(page.getByText('+5 XP')).toBeVisible();
    await expect.poll(() => sent.length).toBe(2);
    expect(sent[1]?.p_xp).toBe(5);
    expect(sent[1]?.p_events).toEqual([{ kind: 'qso', count: 1 }]);
    const after = (sent[1]?.p_state as { radio: { contacts: number; log: unknown[] } }).radio;
    expect(after.contacts).toBe(0);
    expect(after.log).toEqual([{ op: 'marta', day: expect.any(String), ok: false }]);

    await page.getByRole('button', { name: 'The Radio Room' }).click();
    await expect(page.getByText('0 contacts logged')).toBeVisible();
    await expect(page.getByText('didn’t make the log')).toBeVisible();
  });

  test('an operator’s news is written live, they answer yours, and both are remembered (E15)', async ({
    page,
  }) => {
    const sent = saves(page);
    const asked: { kind: string; heard?: string }[] = [];
    await page.route('**/api/partner', async (route) => {
      const ask = route.request().postDataJSON() as { kind: string };
      asked.push(ask);
      const text = ask.kind === 'radio-reply' ? 'FB on ur news, GL 73' : 'Cat caught a mouse, 73!';
      await route.fulfill({ json: { text, left: 39 } });
    });
    await signedIn(page, [], [], {
      ...operator,
      radio: { call: 'MI2RK', name: 'ADAM', qth: 'HAIFA', contacts: 0, cleanFast: false, log: [] },
    });
    await page.goto('/signal-tower?open=radio');
    await expect(
      page.getByText(/Operators’ news, and their answer to yours, is written live by an AI/),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Answer MARTA' }).click();
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toMatchObject({
      kind: 'radio-news',
      operator: 'marta',
      learner: { name: 'ADAM', place: 'HAIFA', contacts: 0 },
      past: [],
      told: [],
    });

    // Through the turns, as fast as possible: nothing here needs to be right.
    for (let turn = 1; turn <= 8; turn++) {
      await expect(page.getByText(new RegExp(`Turn ${turn} of 8`))).toBeVisible();
      if (turn === 6) {
        // Your own news: they answer it live before they sign.
        await keyThree(page);
        await expect.poll(() => asked.length).toBe(2);
      } else if (turn === 7 || (turn % 2 === 0 && turn < 6)) {
        await keyOnce(page);
        await keyOnce(page);
      } else {
        for (const box of await page.getByRole('textbox').all()) await box.fill('1');
        await page.getByRole('button', { name: 'Over' }).click();
      }
    }
    await expect(page.getByText('MARTA’s news: CAT CAUGHT A MOUSE')).toBeVisible();
    expect(asked[1]).toMatchObject({ kind: 'radio-reply', news: 'CAT CAUGHT A MOUSE' });
    const heard = asked[1]?.heard ?? '';
    expect(heard.replace(/ /g, '')).toMatch(/^[A-Z0-9]{3,}$/);
    await expect(page.getByText('MARTA answered: FB ON UR NEWS, GL')).toBeVisible();
    await expect.poll(() => sent.length).toBe(1);
    const radio = (
      sent[0]?.p_state as {
        radio: { notes?: Record<string, string[]>; told?: Record<string, string[]> };
      }
    ).radio;
    expect(radio.notes).toEqual({ marta: ['CAT CAUGHT A MOUSE'] });
    expect(radio.told).toEqual({ marta: [heard] });
  });
});
