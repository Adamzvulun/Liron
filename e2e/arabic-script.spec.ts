import { expect, test, type Page } from '@playwright/test';
import { GREETINGS, lessonWord, signedIn, type SubjectCall } from './fake-supabase.ts';

// Everyday words made of lesson 1's letters (ا ب ت ن ي), shaped like the deck's rows.
const WORDS = [
  lessonWord(1, 'بيت', 'house'),
  lessonWord(2, 'تين', 'figs'),
  lessonWord(3, 'أنا', 'I'),
  lessonWord(4, 'بنت', 'girl'),
  lessonWord(5, 'نبي', 'prophet'),
  lessonWord(6, 'يابا', 'dad'),
  lessonWord(7, 'بنّ', 'coffee beans'),
  lessonWord(8, 'تبن', 'hay'),
  lessonWord(9, 'باب', 'door'),
  lessonWord(10, 'بابا', 'pope'),
];

/** Answers a Read question with its first choice: a recording (play, then "This one") or a word. */
async function answerFirst(page: Page) {
  const sounds = page.getByRole('group', { name: 'Recordings' });
  if (await sounds.isVisible()) {
    await sounds.getByRole('button').first().click();
    await page.getByRole('button', { name: /^This one/ }).click();
  } else {
    await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
  }
}

test.describe('Arabic script lessons (#38–#41)', () => {
  test('meet the first letters, practice, and the session is saved', async ({ page }) => {
    const calls: SubjectCall[] = [];
    await signedIn(page, [], calls, null, WORDS);
    await page.goto('/caravanserai');
    await page.getByRole('button', { name: /The scribe’s table/ }).click();

    // Meet: each of lesson 1's five letters, with its Hebrew bridge and four shapes.
    await expect(page.getByText('Meet a letter · 1 of 8')).toBeVisible();
    await expect(page.getByText('Like א', { exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Its shapes' }).getByRole('listitem')).toHaveCount(
      4,
    );
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Like י', { exact: true })).toBeVisible();
    // Then lesson 1's vowel marks (#40): fatha, kasra, damma, each with its niqqud twin.
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Meet a vowel mark · 6 of 8')).toBeVisible();
    await expect(page.getByText(/fatḥa/)).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Start practice' }).click();

    // Practice: answer every question (the first choice), then see the result.
    await expect(page.getByText(/^Listen · 1 of /)).toBeVisible();
    for (let i = 0; i < 30; i++) {
      if (await page.getByText('Session done').isVisible()) break;
      await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(page.getByText('Session done')).toBeVisible();
    await expect(page.getByText(/^\d+%$/)).toBeVisible();

    // Saved: the lesson's letters met, reviews for letters, ratings for listen and read. Wait
    // for the save itself: XP (and so record_progress) depends on whether the random questions'
    // first choices were right, and a session of only wrong answers earns none.
    await expect.poll(() => calls.some((c) => c.rpc === 'save_subject_state')).toBe(true);
    const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
      p_state: { met: string[]; sessions: number };
    };
    expect(saved.p_state.met).toHaveLength(8);
    expect(saved.p_state.sessions).toBe(1);
    const reviewed = calls.filter((c) => c.rpc === 'record_review');
    expect(reviewed.length).toBeGreaterThan(0);
    const skills = new Set(
      calls
        .filter((c) => c.rpc === 'record_result')
        .map((c) => (c.args as { p_skill: string }).p_skill),
    );
    expect([...skills].sort()).toEqual(['listen', 'read']);
  });

  test('no plaque covers the questline scroll on desktop (UX review H3)', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'desktop',
      'the scroll only hangs in the wide courtyard',
    );
    for (const [width, height] of [
      [1280, 720],
      [1366, 768],
      [1920, 1080],
    ] as const) {
      await page.setViewportSize({ width, height });
      await signedIn(page, []);
      await page.goto('/caravanserai');
      const scroll = await page.getByRole('region', { name: 'Main questline' }).boundingBox();
      expect(scroll).not.toBeNull();
      for (const plaque of await page.locator('.khan__plaque').all()) {
        const p = await plaque.boundingBox();
        if (!p || !scroll) continue;
        const overlaps =
          p.x < scroll.x + scroll.width &&
          scroll.x < p.x + p.width &&
          p.y < scroll.y + scroll.height &&
          scroll.y < p.y + p.height;
        expect(overlaps, `${await plaque.textContent()} at ${width}×${height}`).toBe(false);
      }
    }
  });

  test('says so when the deck isn’t loaded', async ({ page }) => {
    await signedIn(page, [], [], null, []);
    await page.goto('/caravanserai?open=lesson');
    await expect(
      page.getByText('The deck’s words haven’t been loaded into Waymark yet.'),
    ).toBeVisible();
  });
});

test.describe('the Caravanserai courtyard (#42, #43)', () => {
  test('the road’s milestones show your lessons, and the Painted Sign makes you a guest', async ({
    page,
  }) => {
    const calls: SubjectCall[] = [];
    const done = { lesson: 8, streak: 0, met: [], done: true, sessions: 20 };
    await signedIn(page, [], calls, done, WORDS);
    await page.goto('/caravanserai');
    await expect(page.getByRole('img', { name: '8 of 8 milestones lit' })).toBeAttached();
    await expect(page.getByLabel('Your standing in the house')).toContainText('Stranger');

    await page.getByRole('button', { name: /Read The Painted Sign/ }).click();
    await page.getByRole('button', { name: 'Read the sign' }).click();
    await expect(page.getByText(/^Read · 1 of /)).toBeVisible();
    for (let i = 0; i < 40; i++) {
      if (await page.getByText(/^\d+%$/).isVisible()) break;
      await answerFirst(page);
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(page.getByText(/^\d+%$/)).toBeVisible();
    await expect.poll(() => calls.some((c) => c.rpc === 'save_subject_state')).toBe(true);
    const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
      p_state: { guest: boolean; sessions: number };
    };
    expect(saved.p_state.sessions).toBe(21);
    expect(typeof saved.p_state.guest).toBe('boolean');
  });

  test('words you know well are read by picking their recording, or Latin if you choose', async ({
    page,
  }) => {
    const calls: SubjectCall[] = [];
    const state = { lesson: 4, streak: 0, met: [], done: false, sessions: 4 };
    await signedIn(page, [], calls, state, WORDS);
    await page.goto('/caravanserai');
    await page.getByRole('button', { name: /The storyteller/ }).click();
    const latin = page.getByLabel(/show Latin letters instead of recordings/);
    await expect(latin).not.toBeChecked();
    await page.getByRole('button', { name: 'Begin' }).click();

    // Every word here uses lesson 1's letters, taught two lessons ago: all by recording.
    await expect(page.getByRole('heading', { name: 'Which recording says it?' })).toBeVisible();
    const sounds = page.getByRole('group', { name: 'Recordings' });
    await expect(sounds.getByRole('button')).toHaveCount(4);
    const confirm = page.getByRole('button', { name: /^(Play the recordings|This one)/ });
    await expect(confirm).toBeDisabled();
    await sounds.getByRole('button', { name: '▶ 2' }).click();
    await expect(sounds.getByRole('button', { name: '▶ 2' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'This one: 2' }).click();
    await expect(page.getByText(/^(Right!|Not quite\.)$/)).toBeVisible();
    await expect(sounds.getByRole('button', { name: /✓/ })).toHaveCount(1);

    // Back at the start, choose Latin: it's saved with your progress.
    await page.goto('/caravanserai');
    await page.getByRole('button', { name: /The storyteller/ }).click();
    await page.getByLabel(/show Latin letters instead of recordings/).check();
    await expect
      .poll(() =>
        calls.some(
          (c) =>
            c.rpc === 'save_subject_state' &&
            (c.args as { p_state: { knownChoices?: string } }).p_state.knownChoices === 'latin',
        ),
      )
      .toBe(true);
  });

  test('the fountain is listening practice that doesn’t pass a lesson', async ({ page }) => {
    const calls: SubjectCall[] = [];
    const met = ['letter:alef', 'letter:beh', 'letter:teh', 'letter:noon', 'letter:yeh'];
    await signedIn(page, [], calls, { lesson: 1, streak: 1, met, done: false, sessions: 1 }, WORDS);
    await page.goto('/caravanserai');
    await page.getByRole('button', { name: /The fountain/ }).click();
    await page.getByRole('button', { name: 'Begin' }).click();
    for (let i = 0; i < 20; i++) {
      if (await page.getByText('Session done').isVisible()) break;
      await expect(page.getByText(/^Listen · \d+ of /)).toBeVisible();
      await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(page.getByText('Session done')).toBeVisible();
    await expect.poll(() => calls.some((c) => c.rpc === 'save_subject_state')).toBe(true);
    const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
      p_state: { lesson: number; streak: number };
    };
    expect(saved.p_state).toMatchObject({ lesson: 1, streak: 1 });
  });

  test('a new learner is sent to meet letters before the fountain or the storyteller (review, 2026-11-15)', async ({
    page,
  }) => {
    const calls: SubjectCall[] = [];
    await signedIn(
      page,
      [],
      calls,
      { lesson: 1, streak: 0, met: [], done: false, sessions: 0 },
      WORDS,
    );
    for (const station of ['The fountain', 'The storyteller']) {
      await page.goto('/caravanserai');
      await page.getByRole('button', { name: new RegExp(station) }).click();
      await expect(page.getByText(`${station} waits for letters you’ve met.`)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
    }
    expect(calls.some((c) => c.rpc === 'record_review')).toBe(false);
  });

  test('with no readable words, practice says so instead of crashing', async ({ page }) => {
    const met = ['letter:alef', 'letter:beh', 'letter:teh', 'letter:noon', 'letter:yeh'];
    const state = { lesson: 1, streak: 1, met, done: false, sessions: 1 };
    // A lesson-4 word (ش), under a reviewed lesson-4 id: in the deck, but not readable yet.
    await signedIn(page, [], [], state, [lessonWord(1, 'شمس', 'sun', 4)]);
    await page.goto('/caravanserai');
    await page.getByRole('button', { name: /The fountain/ }).click();
    await page.getByRole('button', { name: 'Begin' }).click();
    await expect(page.getByText(/No words are ready for this yet/)).toBeVisible();
  });
});

test.describe('the slate (#41)', () => {
  test('trace and write the letters you’ve met, and the writing is rated', async ({ page }) => {
    const calls: SubjectCall[] = [];
    const met = ['letter:alef', 'letter:beh', 'letter:teh', 'letter:noon', 'letter:yeh'];
    await signedIn(page, [], calls, { lesson: 1, streak: 0, met, done: false, sessions: 1 }, WORDS);
    await page.goto('/caravanserai');
    await page.getByRole('button', { name: /The slate/ }).click();
    for (let i = 0; i < 10; i++) {
      const pad = page.getByLabel(/(Trace|Write) the letter here/);
      const box = await pad.boundingBox();
      if (!box) throw new Error('no pad');
      // A stroke down the middle (an alif would pass; others are a near miss).
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.25);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.66, { steps: 8 });
      await page.mouse.up();
      await page.getByRole('button', { name: 'Check' }).click();
      await expect(page.getByText(/Good shape!|missing|outside|dots/)).toBeVisible();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(page.getByText('The slate · done')).toBeVisible();
    await expect.poll(() => calls.some((c) => c.rpc === 'record_progress')).toBe(true);
    const rated = calls.filter((c) => c.rpc === 'record_result');
    expect(rated).toHaveLength(5);
    expect(rated.every((c) => (c.args as { p_skill: string }).p_skill === 'write')).toBe(true);
  });

  test('a letter written without its dots isn’t passed (review concern 4)', async ({ page }) => {
    await signedIn(
      page,
      [],
      [],
      { lesson: 1, streak: 0, met: ['letter:beh'], done: false, sessions: 1 },
      WORDS,
    );
    await page.goto('/caravanserai');
    await page.getByRole('button', { name: /The slate/ }).click();
    const pad = page.getByLabel('Trace the letter here');
    await expect(pad).toBeVisible();
    await page.waitForTimeout(500); // the guide is painted once the font has loaded
    // Read the faint guide off the pad: its cells on a 32-cell grid, split into the body (the
    // largest part) and the rest (the dot).
    const shape = await pad.evaluate((c: HTMLCanvasElement) => {
      const n = 32;
      const d = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data ?? [];
      const on = new Set<number>();
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++)
          if ((d[(y * c.width + x) * 4 + 3] ?? 0) > 0)
            on.add(Math.floor((y * n) / c.height) * n + Math.floor((x * n) / c.width));
      const groups: number[][] = [];
      const seen = new Set<number>();
      for (const start of on) {
        if (seen.has(start)) continue;
        const group: number[] = [];
        const stack = [start];
        seen.add(start);
        while (stack.length) {
          const j = stack.pop() as number;
          group.push(j);
          for (const k of [j - 1, j + 1, j - n, j + n, j - n - 1, j - n + 1, j + n - 1, j + n + 1])
            if (on.has(k) && !seen.has(k)) {
              seen.add(k);
              stack.push(k);
            }
        }
        groups.push(group);
      }
      groups.sort((a, b) => b.length - a.length);
      const xy = (g: number[]) =>
        g.map((j) => [((j % n) + 0.5) / n, (Math.floor(j / n) + 0.5) / n]);
      return { body: xy(groups[0] ?? []), dots: groups.slice(1).map(xy) };
    });
    expect(shape.dots.length).toBe(1);
    const ink = async (cells: number[][]) => {
      const box = await page.getByLabel(/(Trace|Write) the letter here/).boundingBox();
      if (!box) throw new Error('no pad');
      for (const [x, y] of cells) {
        const px = box.x + (x ?? 0) * box.width;
        const py = box.y + (y ?? 0) * box.height;
        await page.mouse.move(px, py);
        await page.mouse.down();
        await page.mouse.move(px + 1, py);
        await page.mouse.up();
      }
    };
    // Tracing: the body only.
    await ink(shape.body);
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText('Don’t forget the dots.')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    // From memory: the body and the dot.
    await expect(page.getByLabel('Write the letter here')).toBeVisible();
    await expect(page.getByText('Don’t forget the dots.')).toBeHidden();
    await ink([...shape.body, ...shape.dots.flat()]);
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText('Good shape!')).toBeVisible();
  });
});

test.describe('the coffee corner (#45)', () => {
  test('meet a set, understand it by ear, say it, and it is saved', async ({ page }) => {
    const calls: SubjectCall[] = [];
    await signedIn(page, [], calls, null, GREETINGS);
    await page.goto('/caravanserai');
    await page.getByRole('button', { name: /Coffee corner/ }).click();
    await expect(page.getByRole('heading', { name: 'At the door' })).toBeVisible();
    await page.getByRole('button', { name: 'Meet the phrases' }).click();
    await expect(page.getByText('Meet a phrase · 1 of 10')).toBeVisible();
    await expect(page.getByText('מַרחַבַּא'.normalize('NFC'))).toBeVisible();
    for (let i = 0; i < 9; i++) await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Start practice' }).click();

    for (let i = 0; i < 10; i++) {
      await expect(page.getByText(`Understand · ${i + 1} of 10`)).toBeVisible();
      await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    for (let i = 0; i < 10; i++) {
      await expect(page.getByText(`Say it · ${i + 1} of 10`)).toBeVisible();
      await page.getByRole('button', { name: 'Close enough' }).click();
    }
    await expect(page.getByText('Coffee corner · done')).toBeVisible();
    await expect.poll(() => calls.some((c) => c.rpc === 'record_progress')).toBe(true);
    const saved = calls.find((c) => c.rpc === 'save_subject_state')?.args as {
      p_state: { phrasesMet: string[] };
    };
    expect(saved.p_state.phrasesMet).toHaveLength(10);
    expect(calls.filter((c) => c.rpc === 'record_review')).toHaveLength(10);
  });
});
