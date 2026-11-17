import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

// The speed budget (#137, #315; the numbers and how to read them are in docs/process/CI.md).
// Four things a player feels, each with a ceiling: how soon the square is drawn, how soon a
// place can be clicked, how fast the square comes back from a hall, and how much script the
// first visit downloads. Times are taken on a phone-sized window with the CPU slowed 4×, like
// the frame budget (city-speed.spec.ts), and compared with a fixed piece of work timed on the
// same page in the same minutes, because a shared runner can be slow for a whole test.

/**
 * The ceilings (CI.md has the table):
 * - The startup script: 172.9 kB gzipped on 2026-11-16 (1 kB = 1000 bytes), plus 15%.
 * - Drawn and clickable, as multiples of the page's own yardstick (`yardstick()` below):
 *   1.9-2.2× over four runs on 2026-11-17 (best rounds 694-752 ms against 348-366 ms). Places
 *   are links, so the square can be clicked the moment it is drawn; both are still measured.
 * - Back from a hall: 1.6-1.9× (606-637 ms).
 * A timed figure still moves by about a sixth from run to run on the same code, so "plus 15%"
 * would fail at random. The time ceilings are about a third above the slowest reading: they
 * catch a real slowdown (half as slow again as usual) and not the weather.
 */
const STARTUP_KB = 199;
const DRAWN = 3;
const CLICKABLE = 3;
const RETURN = 2.6;

/** Marks, in the page's own clock, the moment the square is drawn and a place can be clicked. */
async function watchSquare(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { square: { drawn?: number; clickable?: number } };
    w.square = {};
    const look = () => {
      if (w.square.drawn === undefined && document.querySelector('.city__stage svg')) {
        w.square.drawn = performance.now();
      }
      if (w.square.clickable === undefined && document.querySelector('a.city__place')) {
        w.square.clickable = performance.now();
      }
    };
    new MutationObserver(look).observe(document, { childList: true, subtree: true });
  });
}

/**
 * A fixed piece of work (sorting and joining), timed on this page: best of five, in ms. It is
 * long (about 350 ms slowed) because Chrome slows the CPU in time slices: a 70 ms task caught
 * them unevenly and swung by a third between rounds (2026-11-17).
 */
const yardstick = (page: Page) =>
  page.evaluate(() => {
    let best = Infinity;
    for (let round = 0; round < 5; round++) {
      const start = performance.now();
      let seed = 7;
      const numbers = Array.from({ length: 200_000 }, () => (seed = (seed * 16807) % 2147483647));
      numbers.sort((a, b) => a - b);
      if (numbers.join(',').length === 0) throw new Error('no work done');
      best = Math.min(best, performance.now() - start);
    }
    return best;
  });

test('the first visit downloads no more script than the budget', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  const src = /<script type="module"[^>]* src="([^"]+)"/.exec(html)?.[1];
  if (!src) throw new Error('no startup script in dist/index.html');
  const kb = gzipSync(readFileSync(`dist${src}`)).length / 1000;
  console.log(`startup script ${kb.toFixed(1)} kB gzipped`);
  expect(kb).toBeLessThanOrEqual(STARTUP_KB);
});

test('the square is drawn, clickable and back from a hall within the budget', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'the budget is for a phone; one viewport is enough');
  // Tests running beside it slow the page far more than the yardstick (17× against 9× alone,
  // 2026-11-17), so the timings are taken only on one worker, as CI runs.
  test.skip(
    info.config.workers > 1,
    'timings need a quiet machine: run with --workers 1 (CI does)',
  );
  test.setTimeout(180_000);
  await watchSquare(page);
  await signedIn(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  // Noise only ever adds time, so each figure is the best of four rounds, and so is the
  // yardstick: the fastest each could go on this machine in these minutes.
  const best = { drawn: Infinity, clickable: Infinity, back: Infinity, unit: Infinity };
  const raw: string[] = [];
  for (let round = 0; round < 4; round++) {
    await page.goto('/');
    await page.locator('a.city__place').first().waitFor();
    const unit = await yardstick(page);
    const marks = await page.evaluate(
      () => (window as unknown as { square: { drawn: number; clickable: number } }).square,
    );

    await page.goto('/signal-tower');
    const back = page.getByRole('link', { name: 'Back to the square' });
    await back.waitFor();
    await page.waitForLoadState('networkidle');
    const returned = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const link = [...document.querySelectorAll('a')].find((a) =>
            a.textContent.includes('Back to the square'),
          );
          if (!link) throw new Error('no way back');
          const start = performance.now();
          new MutationObserver((_, o) => {
            if (!document.querySelector('a.city__place')) return;
            o.disconnect();
            // Counted when the square has been painted, not only built.
            requestAnimationFrame(() => setTimeout(() => resolve(performance.now() - start)));
          }).observe(document, { childList: true, subtree: true });
          link.click();
        }),
    );
    raw.push(
      `drawn ${Math.round(marks.drawn)} ms, clickable ${Math.round(marks.clickable)} ms, back ${Math.round(returned)} ms, yardstick ${unit.toFixed(1)} ms`,
    );
    best.drawn = Math.min(best.drawn, marks.drawn);
    best.clickable = Math.min(best.clickable, marks.clickable);
    best.back = Math.min(best.back, returned);
    best.unit = Math.min(best.unit, unit);
  }
  const drawn = best.drawn / best.unit;
  const clickable = best.clickable / best.unit;
  const back = best.back / best.unit;
  console.log(
    `load budget: ${raw.join(' | ')} => drawn ${drawn.toFixed(1)}×, clickable ${clickable.toFixed(1)}×, back ${back.toFixed(1)}×`,
  );
  expect(drawn).toBeLessThanOrEqual(DRAWN);
  expect(clickable).toBeLessThanOrEqual(CLICKABLE);
  expect(back).toBeLessThanOrEqual(RETURN);
});
