import type { Page } from '@playwright/test';
import { ROOF_STARTER, STARTER } from '../../src/core/home/layout.ts';
import { cellFeet } from '../../src/core/home/projection.ts';
import { expect, test } from './fixtures.ts';
import { friendCard, signedIn } from './fake-supabase.ts';

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
  // The room or the roof: whichever is shown, never the placeholder while it loads (after a
  // reload it matched that, and was gone by the time it was scrolled).
  const shown = page.locator('.room:not(.room--loading)');
  await shown.scrollIntoViewIfNeeded();
  await shown.evaluate(
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
    // A new room has nothing of its own yet (#470).
    await expect(page.locator('.room-cozy__line')).toHaveText(
      'Coziness: Just moved in · 1 more new thing to set out for Settling in',
    );
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
    const still = () => expect(at(page)).not.toHaveAttribute('data-walking');
    await page.keyboard.press('ArrowRight');
    await expect(at(page)).toHaveAttribute('data-at', '1,4');
    await still();
    await page.keyboard.press('d');
    await expect(at(page)).toHaveAttribute('data-at', '2,4');
    await still();
    // The bed is right behind: the press does nothing.
    await page.keyboard.press('ArrowUp');
    await still();
    await expect(at(page)).toHaveAttribute('data-at', '2,4');
    // Pressed quickly, mid-step, both presses count.
    await page.keyboard.press('d');
    await page.keyboard.press('w');
    await expect(at(page)).toHaveAttribute('data-at', '3,3');
    await still();
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

test.describe('the pieces that open something (#441)', () => {
  const PANELS = [
    ['Cupboard: open the wardrobe', 'Wardrobe', 'Save my look'],
    ['Shelf: see your trophies', 'Trophies', 'Achievements'],
    ['Desk: read your ledger', 'Ledger', 'Ledger'],
    ['Letterbox: open the Fellowship', 'Fellowship', 'Fellowship'],
  ] as const;

  test('the list "In this room" opens each, and closing gives focus back', async ({ page }) => {
    await openRoom(page);
    const list = page.getByRole('navigation', { name: 'In this room' });
    for (const [button, dialog, inside] of PANELS) {
      await list.getByRole('button', { name: button }).click();
      const panel = page.getByRole('dialog', { name: dialog });
      await expect(panel.getByText(inside, { exact: true }).first()).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Back to the room' })).toBeFocused();
      await panel.getByRole('button', { name: 'Back to the room' }).click();
      await expect(panel).toHaveCount(0);
      await expect(list.getByRole('button', { name: button })).toBeFocused();
    }
  });

  test('tapping the cupboard walks there, then opens the wardrobe; Escape closes it', async ({
    page,
  }) => {
    await openRoom(page);
    await tapCell(page, 11, 1);
    const panel = page.getByRole('dialog', { name: 'Wardrobe' });
    await expect(panel).toBeVisible();
    // By the cupboard: the cell in front of it.
    await expect(at(page)).toHaveAttribute('data-at', '11,2');
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(room(page)).toBeFocused();
  });

  test('Enter uses the piece you face', async ({ page }, info) => {
    test.skip(info.project.name === 'phone', 'no keyboard on the phone');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openRoom(page);
    await room(page).focus();
    for (const k of ['d', 'd', 'd', 'd', 'd', 'd', 'd', 'w', 'w', 'w', 'd', 'w'])
      await page.keyboard.press(k);
    // At the front of the desk, facing it.
    await expect(at(page)).toHaveAttribute('data-at', '8,1');
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: 'Ledger' });
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(room(page)).toBeFocused();
  });

  test('a piece that opens nothing says its line', async ({ page }) => {
    await openRoom(page);
    await tapCell(page, 9, 4);
    await expect(page.getByRole('status').filter({ hasText: 'Packed for the road' })).toBeVisible();
  });

  test('/house#fellowship opens the room with the Fellowship open', async ({ page }) => {
    await signedIn(page);
    await page.goto('/house#fellowship');
    await expect(page.getByRole('dialog', { name: 'Fellowship' })).toBeVisible();
  });

  test('the lantern puts its glow out, and lights it again', async ({ page }) => {
    await openRoom(page);
    const glow = page.locator('img[data-glow]');
    await expect(glow).toHaveAttribute('data-glow', 'on');
    const lantern = page.getByRole('button', { name: 'Lantern: light or put out' });
    await lantern.click();
    await expect(glow).toHaveAttribute('data-glow', 'off');
    await expect(glow).toHaveCSS('opacity', '0');
    await lantern.click();
    await expect(glow).toHaveAttribute('data-glow', 'on');
  });

  test('the bed seats you, and a step stands you up', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openRoom(page);
    await page.getByRole('button', { name: 'Bed: sit down' }).click();
    await expect(at(page)).toHaveAttribute('data-seated', 'true');
    await room(page).focus();
    await page.keyboard.press('ArrowRight');
    await expect(at(page)).not.toHaveAttribute('data-seated');
  });
});

test.describe('decorating your room (#442)', () => {
  const decorate = async (page: Page, owned: string[] = []) => {
    await signedIn(page, [], [], null, [], { owned });
    await page.goto('/house');
    await page.getByRole('button', { name: 'Decorate' }).click();
    await expect(room(page)).toHaveAttribute('aria-label', /decorating/);
  };
  const say = (page: Page) => page.getByRole('region', { name: 'Decorate' }).getByRole('status');
  const saved = async (page: Page) => {
    const req = page.waitForRequest('**/rpc/save_home');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    const body = (await req).postDataJSON() as { p_layout: { pieces: unknown[] } };
    await expect(page.getByRole('button', { name: 'Decorate' })).toBeVisible();
    return body.p_layout.pieces;
  };

  test('tap a piece, then a cell, to move it; Done saves the room, kept after a reload', async ({
    page,
  }) => {
    await decorate(page);
    // The travel chest stands at columns 9 and 10 of rows 3 and 4.
    await tapCell(page, 9, 4);
    await expect(say(page)).toHaveText(/Holding the travel chest/);
    await tapCell(page, 6, 4);
    await expect(say(page)).toHaveText('Set down the travel chest.');
    expect(await saved(page)).toContainEqual({ id: 'home:chest', at: [6, 3], facing: 'left' });
    await page.reload();
    await tapCell(page, 6, 4);
    await expect(page.getByRole('status').filter({ hasText: 'Packed for the road' })).toBeVisible();
  });

  test('refuses a cell that is taken, with a reason, and keeps the piece held', async ({
    page,
  }) => {
    await decorate(page);
    await tapCell(page, 9, 4);
    await tapCell(page, 1, 3);
    await expect(say(page)).toHaveText('The travel chest would stand on the bed.');
    await expect(page.getByRole('button', { name: 'Store the travel chest' })).toBeVisible();
    // The cells it would cover light red.
    await expect(room(page).locator('.room__grid')).toBeAttached();
  });

  test('a piece from the tray, with the arrow keys and Enter', async ({ page }, info) => {
    test.skip(info.project.name === 'phone', 'no keyboard on the phone');
    await decorate(page, ['home-chair']);
    await page.getByRole('button', { name: 'Pick up the chair' }).click();
    await expect(room(page)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(say(page)).toHaveText('Set down the chair.');
    expect(await saved(page)).toContainEqual({ id: 'home-chair', at: [7, 2], facing: 'left' });
  });

  test('Turn turns a chair four ways, and the turn is saved (#471)', async ({ page }) => {
    await decorate(page, ['home-chair']);
    await page.getByRole('button', { name: 'Pick up the chair' }).click();
    await tapCell(page, 7, 2);
    await expect(say(page)).toHaveText('Set down the chair.');
    // Tap it to hold it again, then turn it: right, away, left, and back to the room.
    await tapCell(page, 7, 2);
    const turnIt = page.getByRole('button', { name: 'Turn the chair' });
    for (const way of ['facing right', 'facing the wall', 'facing left']) {
      await turnIt.click();
      await expect(say(page)).toHaveText(`The chair, ${way}.`);
    }
    // Moved, it keeps its turn.
    await tapCell(page, 6, 2);
    expect(await saved(page)).toContainEqual({ id: 'home-chair', at: [6, 2], facing: 'to-left' });
    // A piece that can't turn offers no Turn.
    await page.getByRole('button', { name: 'Decorate' }).click();
    await tapCell(page, 9, 4);
    await expect(say(page)).toHaveText(/Holding the travel chest/);
    await expect(page.getByRole('button', { name: /^Turn/ })).toHaveCount(0);
  });

  test('Store puts a piece in the tray, but never one with a panel', async ({ page }) => {
    await decorate(page);
    await tapCell(page, 9, 4);
    await page.getByRole('button', { name: 'Store the travel chest' }).click();
    await expect(page.getByRole('button', { name: 'Pick up the travel chest' })).toBeVisible();
    // The cupboard keeps the wardrobe: it moves, but stays in the room.
    await tapCell(page, 11, 1);
    await expect(say(page)).toHaveText(/Holding the cupboard/);
    await expect(page.getByRole('button', { name: /^Store/ })).toHaveCount(0);
    const pieces = await saved(page);
    expect(pieces).not.toContainEqual(expect.objectContaining({ id: 'home:chest' }));
    expect(pieces).toContainEqual(expect.objectContaining({ id: 'home:cupboard' }));
  });

  test('Cancel leaves the room as it was, and saves nothing', async ({ page }) => {
    await decorate(page);
    let saves = 0;
    page.on('request', (r) => {
      if (r.url().includes('/rpc/save_home')) saves++;
    });
    await tapCell(page, 9, 4);
    await tapCell(page, 6, 4);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(room(page)).toHaveAttribute('aria-label', /walk/);
    // The chest is where it was: tapping its old place walks to it.
    await tapCell(page, 9, 4);
    await expect(page.getByRole('status').filter({ hasText: 'Packed for the road' })).toBeVisible();
    expect(saves).toBe(0);
  });

  test('a wallpaper and floor you own can be chosen, and are saved (#443)', async ({ page }) => {
    await decorate(page, ['wallpaper-zellige', 'floor-dark-oak']);
    await page.getByLabel('Wallpaper').selectOption({ label: 'Zellige tiles' });
    await page.getByLabel('Floor').selectOption({ label: 'Dark oak floor' });
    const req = page.waitForRequest('**/rpc/save_home');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    const { p_layout } = (await req).postDataJSON() as { p_layout: object };
    expect(p_layout).toMatchObject({ wallpaper: 'zellige', floor: 'dark-oak' });
  });

  test('setting out something new makes the room cozier, for good (#470)', async ({ page }) => {
    await decorate(page, ['wallpaper-zellige', 'floor-dark-oak']);
    await page.getByLabel('Wallpaper').selectOption({ label: 'Zellige tiles' });
    await page.getByLabel('Floor').selectOption({ label: 'Dark oak floor' });
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.locator('.room-cozy__said')).toHaveText('Your room is cozier: Settling in.');
    await expect(page.locator('.room-cozy__line')).toHaveText(
      'Coziness: Settling in · 1 more new thing to set out for Lived in',
    );
    // Back to the room's own walls and floor: the coziness stays.
    await page.getByRole('button', { name: 'Decorate' }).click();
    await page.getByLabel('Wallpaper').selectOption({ index: 0 });
    await page.getByLabel('Floor').selectOption({ index: 0 });
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.reload();
    await expect(page.locator('.room-cozy__line')).toHaveText(/^Coziness: Settling in/);
  });

  test('without a style of your own, there is nothing to choose', async ({ page }) => {
    await decorate(page);
    await expect(page.getByLabel('Wallpaper')).toHaveCount(0);
  });

  test('a piece can be dragged too', async ({ page }, info) => {
    test.skip(info.project.name === 'phone', 'the mouse');
    await decorate(page);
    const box = await at(page).boundingBox();
    if (!box) throw new Error('no room');
    const s = box.width / 1920;
    const point = (c: number, r: number) => {
      const [x, y] = cellFeet(c, r);
      return [box.x + x * s, box.y + y * s] as const;
    };
    await page.mouse.move(...point(9, 4));
    await page.mouse.down();
    await page.mouse.move(...point(7, 4), { steps: 5 });
    await page.mouse.move(...point(6, 4), { steps: 5 });
    await page.mouse.up();
    await expect(say(page)).toHaveText('Set down the travel chest.');
    expect(await saved(page)).toContainEqual({ id: 'home:chest', at: [6, 3], facing: 'left' });
  });
});

test.describe('the roof (#472)', () => {
  const roof = (page: Page) => page.getByRole('group', { name: /^Your roof/ });
  const BASMA = '00000000-0000-0000-0000-0000000000b2';

  test('opens once for 15 gems; then the stairs go up and down', async ({ page }) => {
    await signedIn(page, [], [], null, [], { gems: 20 });
    await page.goto('/house');
    await page.getByRole('button', { name: 'The roof…' }).click();
    const ask = page.getByRole('group', { name: 'Open the roof' });
    await expect(ask).toContainText('It opens for 15 gems, once; you have 20.');
    const req = page.waitForRequest('**/rpc/open_roof');
    await ask.getByRole('button', { name: 'Open the roof for 15 gems' }).click();
    await req;
    await expect(roof(page)).toBeVisible();
    await expect(page.locator('.room-cozy__said')).toHaveText(
      'The roof is yours. Decorate it with anything you own.',
    );
    await page.getByRole('button', { name: 'Down to your room' }).click();
    await expect(room(page)).toBeVisible();
    await page.getByRole('button', { name: 'Up to the roof' }).click();
    await expect(roof(page)).toBeVisible();
    // Opened for good: after a reload the stairs are there, and nothing is offered again.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Up to the roof' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'The roof…' })).toHaveCount(0);
  });

  test('waits, with how many gems are missing, and Not now closes the offer', async ({ page }) => {
    await signedIn(page, [], [], null, [], { gems: 2 });
    await page.goto('/house');
    await page.getByRole('button', { name: 'The roof…' }).click();
    await expect(page.getByRole('button', { name: 'Open the roof for 15 gems' })).toBeDisabled();
    await expect(page.getByText('13 more gems to go.')).toBeVisible();
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(page.getByRole('group', { name: 'Open the roof' })).toHaveCount(0);
  });

  test('takes furniture only, each piece in one room; saved as the roof', async ({ page }) => {
    await signedIn(page, [], [], null, [], {
      owned: ['home-chair', 'home-plant'],
      home: {
        ...STARTER,
        pieces: [...STARTER.pieces, { id: 'home-chair', at: [6, 2], facing: 'left' }],
      },
      roof: ROOF_STARTER,
    });
    await page.goto('/house#roof');
    await expect(roof(page)).toBeVisible();
    await page.getByRole('button', { name: 'Decorate' }).click();
    const tray = page.getByRole('region', { name: 'Decorate' });
    await expect(tray.getByRole('button', { name: 'Pick up the plant' })).toBeVisible();
    // The chair is downstairs, and the starter pieces never come up.
    await expect(
      tray.getByRole('button', { name: /^Pick up the (chair|travel chest)$/ }),
    ).toHaveCount(0);
    await tray.getByRole('button', { name: 'Pick up the plant' }).click();
    await tapCell(page, 6, 2);
    await expect(tray.getByRole('status')).toHaveText('Set down the plant.');
    const req = page.waitForRequest('**/rpc/save_home');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    const body = (await req).postDataJSON() as { p_layout: { pieces: unknown[] }; p_room: string };
    expect(body.p_room).toBe('roof');
    expect(body.p_layout.pieces).toEqual([{ id: 'home-plant', at: [6, 2], facing: 'left' }]);
    await expect(roof(page)).toBeVisible();
  });

  test('a friend’s roof can be visited, when they have one', async ({ page }) => {
    await signedIn(page, [], [], null, [], {
      fellowship: {
        friends: [friendCard(BASMA, 'Basma')],
        roofs: {
          [BASMA]: { ...ROOF_STARTER, pieces: [{ id: 'home-chair', at: [6, 2], facing: 'away' }] },
        },
      },
    });
    await page.goto(`/house/visit/${BASMA}`);
    await expect(page.getByRole('group', { name: /^Basma’s room/ })).toBeVisible();
    await page.getByRole('button', { name: 'Up to their roof' }).click();
    await expect(page.getByRole('group', { name: /^Basma’s roof/ })).toBeVisible();
    await page.getByRole('button', { name: 'Down to their room' }).click();
    await expect(page.getByRole('group', { name: /^Basma’s room/ })).toBeVisible();
  });
});
