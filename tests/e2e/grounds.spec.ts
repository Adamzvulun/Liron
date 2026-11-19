import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { fakeSupabase, signedIn } from './fake-supabase.ts';

// No blue backgrounds (#313, docs/design/grounds.md): every screen stands on wood, stone, earth
// or cobbles, never on a plain blue. Each screen is photographed and its ground is sampled on a
// grid; a sample fails if blue leads it. Only points where the ground itself is on top are
// sampled, so paintings (whose skies may be any hour) and the guilds' teal are left alone.

const ROUTES = [
  '/',
  '/nowhere',
  '/signal-tower',
  '/signal-tower?open=koch',
  '/signal-tower?open=recognition',
  '/signal-tower?open=sending',
  '/signal-tower?open=words',
  '/signal-tower?open=radio',
  '/caravanserai',
  '/caravanserai?open=lesson',
  '/caravanserai?open=write',
  '/caravanserai?open=echo',
  '/caravanserai?open=words',
  '/caravanserai?open=chat',
  '/market',
  '/house',
  '/notice-board',
];

/** What counts as the ground being on top at a point: the page or a screen's own frame. */
const GROUND = 'html, body, #root, main, .city, .tower, .khan, .hall, .lesson, .scene, .scene *';

/** Set `GROUNDS_SHOTS` to a folder to keep the pictures, for looking at them. */
const SHOTS = process.env.GROUNDS_SHOTS;

async function blueSamples(page: Page, reader: Page, name: string) {
  const { width, height } = page.viewportSize() ?? { width: 0, height: 0 };
  const points = await page.evaluate(
    ([w, h, ground]) => {
      const out: [number, number][] = [];
      for (let y = 6; y < h; y += 14) {
        for (let x = 6; x < w; x += 14) {
          if (document.elementFromPoint(x, y)?.matches(ground)) out.push([x, y]);
        }
      }
      return out;
    },
    [width, height, GROUND] as const,
  );
  // Still: the lamps' flicker and a screen's entrance would otherwise be caught halfway.
  const shot = await page.screenshot({
    animations: 'disabled',
    ...(SHOTS ? { path: `${SHOTS}/${name}.png` } : {}),
  });
  const blue = await reader.evaluate(
    async ([png, pts, w]) => {
      const bitmap = await createImageBitmap(await (await fetch(png)).blob());
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no canvas');
      ctx.drawImage(bitmap, 0, 0);
      const k = bitmap.width / w;
      return pts
        .map(([x, y]) => {
          const [r = 0, g = 0, b = 0] = ctx.getImageData(
            Math.round(x * k),
            Math.round(y * k),
            1,
            1,
          ).data;
          return { x, y, r, g, b };
        })
        .filter(({ r, g, b }) => b > r + 12 && b > g + 12);
    },
    [`data:image/png;base64,${shot.toString('base64')}`, points, width] as const,
  );
  return { sampled: points.length, blue };
}

async function check(page: Page, reader: Page, name: string, least = 20) {
  const { sampled, blue } = await blueSamples(page, reader, name);
  expect(sampled, `${name}: ground samples`).toBeGreaterThanOrEqual(least);
  expect(blue.slice(0, 5), `${name}: blue-led ground`).toEqual([]);
}

test('no screen stands on a blue background', async ({ page, context }) => {
  test.setTimeout(180_000);
  const project = test.info().project.name;
  const reader = await context.newPage();
  await reader.goto('about:blank');
  // The phone project is 412 wide; the desktop project covers a wide window and the narrowest phone.
  const widths = project === 'phone' ? [412] : [1280, 320];
  await signedIn(page);
  for (const width of widths) {
    if (project !== 'phone')
      await page.setViewportSize({ width, height: width === 320 ? 640 : 720 });
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator('main, .city').first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      // The square and the two halls can be all painting: no ground need be on top there.
      const painted = ['/', '/signal-tower', '/caravanserai'].includes(route);
      await check(page, reader, `${project}-${width}-${ROUTES.indexOf(route)}`, painted ? 0 : 20);
    }
  }
});

test('the gate stands behind sign-in, and no blue', async ({ page, context }) => {
  const reader = await context.newPage();
  await reader.goto('about:blank');
  await fakeSupabase(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.locator('.scene--gate')).toBeVisible();
  await check(page, reader, `${test.info().project.name}-signin`);
});
