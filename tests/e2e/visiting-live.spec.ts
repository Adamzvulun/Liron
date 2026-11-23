import type { Browser } from '@playwright/test';
import { ROOF_STARTER } from '../../src/core/home/layout.ts';
import { expect, test } from './fixtures.ts';
import { wireRelay } from './fake-realtime.ts';
import { friendCard, signedIn } from './fake-supabase.ts';

// Visiting together, live (task 9.1, #482; the-home.md §17). Two pages share one fake Realtime
// relay: Adam visits Basma's house, and Basma is at home. Who may join a `visit:` line is tested
// in the database (fellowship.test.ts, "the wire").

const ADAM = '00000000-0000-0000-0000-000000000001';
const BASMA = '00000000-0000-0000-0000-0000000000b2';

async function pair(browser: Browser) {
  const relay = wireRelay();
  const guest = await (await browser.newContext()).newPage();
  const host = await (await browser.newContext()).newPage();
  await relay.connect(guest);
  await relay.connect(host);
  await signedIn(guest, [], [], null, [], {
    fellowship: { friends: [friendCard(BASMA, 'Basma')], roofs: { [BASMA]: ROOF_STARTER } },
  });
  await signedIn(host, [], [], null, [], {
    me: { id: BASMA, name: 'Basma' },
    fellowship: { friends: [friendCard(ADAM, 'Adam')] },
    roof: ROOF_STARTER,
  });
  return { relay, guest, host };
}

test.describe('visiting together, live (#482)', () => {
  test('a guest and a host at home see each other walk', async ({ browser }) => {
    test.setTimeout(60_000);
    const { relay, guest, host } = await pair(browser);
    await host.goto('/house');
    await guest.goto(`/house/visit/${BASMA}`);
    const guestStage = guest.locator('.room__stage');
    const hostStage = host.locator('.room__stage');

    // Each comes in through their door; each sees the other there.
    await expect(guest.getByText('Basma is home.')).toBeVisible({ timeout: 10_000 });
    await expect(host.getByText('Adam is here.')).toBeVisible({ timeout: 10_000 });
    await expect(guestStage).toHaveAttribute('data-host', 'live:0,4');
    await expect(hostStage).toHaveAttribute('data-guests', 'Adam:0,4');

    // Adam walks a cell; Basma sees it. Basma walks too; Adam sees it.
    await guest.getByRole('group', { name: /^Basma’s room/ }).press('ArrowRight');
    await expect(hostStage).toHaveAttribute('data-guests', 'Adam:1,4');
    await host.getByRole('group', { name: /^Your room/ }).press('ArrowRight');
    await expect(guestStage).toHaveAttribute('data-host', 'live:1,4');

    // Only whose house, the room, the cell and a seat go over the line.
    const moves = relay.sent.filter((m) => m.topic.endsWith(`visit:${ADAM}:${BASMA}`));
    expect(moves.length).toBeGreaterThan(0);
    for (const m of moves) {
      expect(Object.keys(m.payload as object).sort()).toEqual(
        (m.payload as { s?: unknown }).s ? ['c', 'h', 'r', 's'] : ['c', 'h', 'r'],
      );
    }

    // Basma climbs to her roof: Adam is told, and she's no longer in his room.
    await host.getByRole('button', { name: 'Up to the roof' }).click();
    await expect(guest.getByText('Basma is home, up on the roof.')).toBeVisible();
    await expect(guestStage).not.toHaveAttribute('data-host', /.+/);
    await expect(host.getByText('Adam is down in your room.')).toBeVisible();
    // He follows her up.
    await guest.getByRole('button', { name: 'Up to their roof' }).click();
    await expect(guest.getByText('Basma is home.')).toBeVisible();
    await expect(host.getByText('Adam is here.')).toBeVisible();

    // Adam goes home: Basma sees him leave at once.
    await guest.getByRole('link', { name: '← Back to your house' }).click();
    await expect(host.getByText('Adam is here.')).toBeHidden();
    await expect(host.locator('.room__stage')).not.toHaveAttribute('data-guests', /.+/);
    await guest.context().close();
    await host.context().close();
  });

  test('a host who isn’t home stands by the window, as before', async ({ browser }) => {
    test.setTimeout(30_000);
    const { guest, host } = await pair(browser);
    await guest.goto(`/house/visit/${BASMA}`);
    await expect(guest.getByRole('group', { name: /^Basma’s room/ })).toBeVisible();
    await expect(guest.locator('.room__stage')).toHaveAttribute('data-host', /^still:/);
    await expect(guest.getByText('Basma is home.')).toBeHidden();
    await guest.context().close();
    await host.context().close();
  });
});
