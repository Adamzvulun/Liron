import type { Page } from '@playwright/test';
import { STARTER } from '../../src/core/home/layout.ts';
import { cellFeet } from '../../src/core/home/projection.ts';
import { expect, test } from './fixtures.ts';
import { signedIn } from './fake-supabase.ts';

// Walking in your room (task 7.5, #440; docs/game/the-home.md §4, R1, R2, R4, R5, R10).

const room = (page: Page) => page.getByRole('group', { name: /^Your room/ });
const at = (page: Page) => page.locator('.room__stage');

async function openRoom(page: Page, home?: unknown) {
  await signedIn(page, [], [], null, [], home === undefined ? {} : { home });
  await page.goto('/house');
  await expect(at(page)).toHaveAttribute('data-at', '0,4');
}

/** Taps the middle of a floor cell, panning the room to it first if it is out of view. */
async function tapCell(page: Page, col: number, row: number) {
  const [x, y] = cellFeet(col, row);
  await room(page).scrollIntoViewIfNeeded();
  await room(page).evaluate(
    (el, [x]) => {
      const stage = el.querySelector('.room__stage') as HTMLElement;
      const scale = stage.getBoundingClientRect().width / 1920;
      const left = x * scale;
      if (left < el.scrollLeft + 40 || left > el.scrollLeft + el.clientWidth - 40)
        el.scrollTo({ left: left - el.clientWidth / 2 });
    },
    [x],
  );
  const box = await at(page).boundingBox();
  if (!box) throw new Error('no room');
  const scale = box.width / 1920;
  await page.mouse.click(box.x + x * scale, box.y + y * scale);
}

/** Every cell the avatar stands on while it walks. */
async function trace(page: Page) {
  await at(page).evaluate((el) => {
    const w = window as unknown as { visited: string[] };
    w.visited = [];
    new MutationObserver(() => w.visited.push(el.dataset.at ?? '')).observe(el, {
      attributes: true,
      attributeFilter: ['data-at'],
    });
  });
  return () => page.evaluate(() => (window as unknown as { visited: string[] }).visited);
}

test.describe('walking in your room (#440)', () => {
  test('a new player stands inside the door of the starter room, and walks where they tap', async ({
    page,
  }) => {
    await openRoom(page);
    // The room's painting is still pictures, each one drawn (R10).
    const pictures = room(page).locator('img.room__layer');
    expect(await pictures.count()).toBeGreaterThanOrEqual(4);
    for (const img of await pictures.all())
      expect(
        await img.evaluate((i: HTMLImageElement) => i.decode().then(() => i.naturalWidth)),
      ).toBeGreaterThan(0);
    await tapCell(page, 6, 3);
    await expect(at(page)).toHaveAttribute('data-at', '6,3');
  });

  test('walks around a piece, never through it', async ({ page }) => {
    await openRoom(page);
    const visited = await trace(page);
    // The bed fills columns 0 to 2 of rows 0 to 3, between the door and the back wall.
    await tapCell(page, 3, 0);
    await expect(at(page)).toHaveAttribute('data-at', '3,0');
    const cells = await visited();
    expect(cells.length).toBe(7);
    for (const c of cells) {
      const [x, y] = c.split(',').map(Number) as [number, number];
      expect(x <= 2 && y <= 3, c).toBe(false);
    }
  });

  test('says so when a cell can’t be reached, and stays put', async ({ page }) => {
    // A chair in front of the gap between the desk and the cupboard closes it in.
    await openRoom(page, {
      ...STARTER,
      pieces: [...STARTER.pieces, { id: 'home-chair', at: [10, 1], facing: 'left' }],
    });
    await tapCell(page, 10, 0);
    await expect(page.getByRole('status').filter({ hasText: 'Can’t get there.' })).toBeVisible();
    await expect(at(page)).toHaveAttribute('data-at', '0,4');
  });

  test('walks with the arrow keys and WASD, a cell a press, and not into a piece', async ({
    page,
  }) => {
    await openRoom(page);
    await room(page).focus();
    await page.keyboard.press('ArrowRight');
    await expect(at(page)).toHaveAttribute('data-at', '1,4');
    await page.waitForTimeout(300);
    await page.keyboard.press('d');
    await expect(at(page)).toHaveAttribute('data-at', '2,4');
    await page.waitForTimeout(300);
    // The bed is right behind.
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);
    await expect(at(page)).toHaveAttribute('data-at', '2,4');
    await page.keyboard.press('d');
    await page.waitForTimeout(300);
    await page.keyboard.press('w');
    await expect(at(page)).toHaveAttribute('data-at', '3,3');
  });

  test('with reduced motion, goes straight to the cell, without stepping', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openRoom(page);
    const visited = await trace(page);
    await tapCell(page, 8, 3);
    await expect(at(page)).toHaveAttribute('data-at', '8,3');
    expect(await visited()).toEqual(['8,3']);
    await expect(page.locator('.room__avatar')).not.toHaveClass(/room__figure--moving/);
  });

  test('draws a saved room, and the starter room for one it can’t read', async ({ page }) => {
    await openRoom(page, { v: 9, nonsense: true });
    await expect(at(page)).toHaveAttribute('data-at', '0,4');
    await tapCell(page, 4, 4);
    await expect(at(page)).toHaveAttribute('data-at', '4,4');
  });

  test('only moves by transform, with no filters or blend modes', async ({ page }) => {
    await openRoom(page);
    await tapCell(page, 9, 4);
    await expect(at(page)).toHaveAttribute('data-walking', 'true');
    const report = await room(page).evaluate((el) => ({
      moving: el
        .getAnimations({ subtree: true })
        .map((a) => (a as CSSTransition).transitionProperty ?? 'animation'),
      filtered: [...el.querySelectorAll('[filter]')].filter((f) => !f.closest('defs')).length,
      styled: [...el.querySelectorAll('*')].filter((e) => {
        const s = getComputedStyle(e);
        return s.filter !== 'none' || s.mixBlendMode !== 'normal';
      }).length,
    }));
    expect(report.moving.length).toBeGreaterThan(0);
    for (const p of report.moving) expect(['transform', 'opacity']).toContain(p);
    expect(report.filtered).toBe(0);
    expect(report.styled).toBe(0);
  });

  test('on a phone, the room pans and follows you', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'a touch screen only');
    await openRoom(page);
    const view = () =>
      room(page).evaluate((el) => ({
        wide: el.scrollWidth > el.clientWidth + 100,
        left: el.scrollLeft,
      }));
    expect(await view()).toEqual({ wide: true, left: 0 });
    // In view from where the room starts, so the tap itself doesn't pan.
    await tapCell(page, 3, 4);
    await expect(at(page)).toHaveAttribute('data-at', '3,4');
    await expect.poll(async () => (await view()).left).toBeGreaterThan(50);
  });
});
