import { expect, type Page, test } from '@playwright/test';
import own from '../../content/arabic/own-sentences.json' with { type: 'json' };
import { signedIn, type SaveSessionArgs } from './fake-supabase.ts';

// The Stranger at the Gate (tasks 4.2 and 4.3, #334, #335; ADR 0047): the Long Road In's finale.
// The partner function is mocked: the innkeeper's lines and the judge's verdict here are ours.
// With Math.random at 0 the stranger is the first in content: نور, Nūr.
const MEANING = new Map(own.items.map((i) => [i.data.arabic, i.data.english]));
const storyteller = {
  lesson: 8,
  done: true,
  guest: true,
  ranks: ['guest', 'traveler', 'neighbor', 'friend', 'local', 'storyteller'],
  words: {
    met: own.items.map((i) => i.data.word),
    chapter: 114,
    done: true,
    // Every regular's trial faced, chapters 2 to 114.
    trials: Array.from({ length: 113 }, (_, i) => i + 2),
  },
  chat: { name: 'Sami' },
};
const PASS = { understood: true, answered: true, keptGoing: true, why: 'A real story, told well.' };
const SHORT = { ...PASS, keptGoing: false, why: 'Single words: the story never got going.' };

const saves = (page: Page) => {
  const sent: SaveSessionArgs[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/rpc/save_session')) sent.push(r.postDataJSON() as SaveSessionArgs);
  });
  return sent;
};

interface Ask {
  kind: string;
  turns: { who: string; text: string }[];
}

/** The partner: the innkeeper asks, the judge gives `verdict`. */
async function table(page: Page, verdict: object) {
  const asked: Ask[] = [];
  await page.route('**/api/partner', async (route) => {
    const ask = route.request().postDataJSON() as Ask;
    asked.push(ask);
    const text = ask.kind === 'inn-judge' ? JSON.stringify(verdict) : 'حلو! وبعدين؟';
    await route.fulfill({ json: { text, left: 50 } });
  });
  return asked;
}

/** Reads every line of the guest book right. */
async function readBook(page: Page) {
  const lines = page.locator('fieldset');
  await expect(lines).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    const arabic = (await lines.nth(i).locator('legend').innerText()).trim();
    const english = MEANING.get(arabic);
    if (!english) throw new Error(`no meaning for ${arabic}`);
    await lines.nth(i).getByLabel(english, { exact: true }).check();
  }
  await page.getByRole('button', { name: 'Read it to them' }).click();
}

/** Writes `word` on the pad, cell by cell, from the glyph drawn in the page's own font. */
async function writeName(page: Page, word: string) {
  const pad = page.getByLabel('Write the letter here');
  await expect(pad).toBeVisible();
  const cells = await pad.evaluate(async (c: HTMLCanvasElement, w: string) => {
    const font = `700 ${Math.round(c.width * 0.78)}px "Noto Naskh Arabic"`;
    await document.fonts.load(font, w);
    const off = document.createElement('canvas');
    off.width = c.width;
    off.height = c.height;
    const g = off.getContext('2d');
    if (!g) return [];
    g.font = font;
    const wide = g.measureText(w).width;
    if (wide > c.width * 0.86)
      g.font = `700 ${Math.round((c.width * 0.78 * c.width * 0.86) / wide)}px "Noto Naskh Arabic"`;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    const m = g.measureText(w);
    const up = m.actualBoundingBoxAscent || c.width * 0.4;
    const down = m.actualBoundingBoxDescent || 0;
    g.fillText(w, c.width / 2, c.height / 2 + (up - down) / 2);
    const n = 32;
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const on = new Set<number>();
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++)
        if ((d[(y * c.width + x) * 4 + 3] ?? 0) > 0)
          on.add(Math.floor((y * n) / c.height) * n + Math.floor((x * n) / c.width));
    return [...on].map((j) => [((j % n) + 0.5) / n, (Math.floor(j / n) + 0.5) / n]);
  }, word);
  const box = await pad.boundingBox();
  if (!box) throw new Error('no pad');
  for (const [x, y] of cells) {
    const px = box.x + (x ?? 0) * box.width;
    const py = box.y + (y ?? 0) * box.height;
    await page.mouse.move(px, py);
    await page.mouse.down();
    await page.mouse.move(px + 1, py);
    await page.mouse.up();
  }
  await page.getByRole('button', { name: 'Check' }).click();
}

/** Tells `n` lines of your story. */
async function tell(page: Page, n: number) {
  const line = page.getByLabel('Your line, in Arabic');
  for (let i = 0; i < n; i++) {
    await expect(page.getByRole('button', { name: 'Say it' })).toBeVisible();
    await line.fill('أنا من حيفا وبحب البحر');
    await page.getByRole('button', { name: 'Say it' }).click();
    await expect(page.getByText(`${i + 1} of 8`, { exact: false })).toBeVisible();
  }
}

test.describe('The Stranger at the Gate, the Long Road In’s finale', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
  });

  test('stays shut until you are a Storyteller', async ({ page }) => {
    await signedIn(page, [], [], { ...storyteller, ranks: ['guest'] });
    await page.goto('/caravanserai?open=gate');
    await expect(page.getByRole('heading', { name: 'The Stranger at the Gate' })).toBeVisible();
    await expect(page.getByText('Opens once you are a Storyteller.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to the gate' })).toHaveCount(0);
  });

  test('the courtyard’s gate leads a Storyteller to the finale', async ({ page }) => {
    await signedIn(page, [], [], storyteller);
    await page.goto('/caravanserai');
    await page
      .getByRole('button', { name: /The Stranger at the Gate/ })
      .first()
      .click();
    await expect(page.getByRole('button', { name: 'Go to the gate' })).toBeVisible();
  });

  test('read, write, tell: the finale, saved with its event', async ({ page }) => {
    test.setTimeout(90_000);
    const sent = saves(page);
    const asked = await table(page, PASS);
    await signedIn(page, [], [], storyteller);
    await page.goto('/caravanserai?open=gate');
    await expect(page.getByText(/the judge are an AI \(Groq\)/)).toBeVisible();
    await page.getByRole('button', { name: 'Go to the gate' }).click();
    await readBook(page);

    await expect(page.getByText('My name is Nūr', { exact: false })).toBeVisible();
    await writeName(page, 'نور');
    await page.getByRole('button', { name: 'Write it in the book' }).click();

    await expect(page.getByText('حلو! وبعدين؟')).toBeVisible();
    expect(asked[0]).toMatchObject({ kind: 'inn-story', learner: { name: 'Sami' }, turns: [] });
    await tell(page, 6);
    await page.getByRole('button', { name: 'That’s my story' }).click();

    await expect(page.getByRole('img', { name: /The full table at night/ })).toBeVisible();
    await expect(page.getByText('You are Keeper of the Table.', { exact: false })).toBeVisible();
    const judged = asked.find((a) => a.kind === 'inn-judge');
    expect(judged?.turns.filter((t) => t.who === 'you')).toHaveLength(6);
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]?.p_events).toEqual([{ kind: 'trial-stranger-at-the-gate', count: 1 }]);
    expect((sent[0]?.p_state as { finale: boolean }).finale).toBe(true);
    await page.getByRole('button', { name: 'The table is never empty: sit and talk' }).click();
    await expect(page.getByRole('heading', { name: 'Who will you sit with?' })).toBeVisible();
  });

  test('a story that never got going: not tonight, with the judge’s reasons, and no event', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const sent = saves(page);
    await table(page, SHORT);
    await signedIn(page, [], [], storyteller);
    await page.goto('/caravanserai?open=gate');
    await page.getByRole('button', { name: 'Go to the gate' }).click();
    await readBook(page);
    await writeName(page, 'نور');
    await page.getByRole('button', { name: 'Write it in the book' }).click();
    await tell(page, 6);
    await page.getByRole('button', { name: 'That’s my story' }).click();

    await expect(page.getByRole('heading', { name: 'Not tonight' })).toBeVisible();
    await expect(page.getByText(SHORT.why)).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'You kept it going' })).toContainText(
      'Not yet',
    );
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]?.p_events).toEqual([]);
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('a wrong scribble for the name: the stranger tilts their head, and you try again', async ({
    page,
  }) => {
    await table(page, PASS);
    await signedIn(page, [], [], storyteller);
    await page.goto('/caravanserai?open=gate');
    await page.getByRole('button', { name: 'Go to the gate' }).click();
    await readBook(page);
    const pad = page.getByLabel('Write the letter here');
    const box = await pad.boundingBox();
    if (!box) throw new Error('no pad');
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 40, box.y + 30, { steps: 4 });
    await page.mouse.up();
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText('That isn’t quite their name.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText('Try 2 of 3', { exact: false })).toBeVisible();
  });

  test('when today’s lines run out mid-story, it says so, and saves nothing', async ({ page }) => {
    test.setTimeout(90_000);
    const sent = saves(page);
    let told = 0;
    await page.route('**/api/partner', async (route) => {
      told += 1;
      // The innkeeper's opening, then one reply, then the player's lines for today are spent.
      if (told <= 2) await route.fulfill({ json: { text: 'حلو! وبعدين؟', left: 1 } });
      else await route.fulfill({ status: 429, json: { error: 'daily-limit' } });
    });
    await signedIn(page, [], [], storyteller);
    await page.goto('/caravanserai?open=gate');
    await page.getByRole('button', { name: 'Go to the gate' }).click();
    await readBook(page);
    await writeName(page, 'نور');
    await page.getByRole('button', { name: 'Write it in the book' }).click();
    await tell(page, 1);
    await page.getByLabel('Your line, in Arabic').fill('وبعدين رحت على السوق');
    await page.getByRole('button', { name: 'Say it' }).click();
    await expect(
      page.getByText(
        'You’ve used today’s lines at the inn. The table will hear your story tomorrow.',
      ),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Back to the gate' }).click();
    await expect(page.getByRole('button', { name: 'Go to the gate' })).toBeVisible();
    expect(sent).toHaveLength(0);
  });
});
