import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { signedIn } from './fake-supabase.ts';

// The square's frame budget (#123, ADR 0025 amended). The square was slow because small
// animations ran under full-stage blend modes and hovering re-filtered a whole building.
// The first test checks the rules that keep it fast. The second times it against a reference
// scene drawn on the same machine in the same minutes, because a shared CI runner can be slow
// for a whole test, and only a comparison tells the square's cost from the machine's.

async function openSquare(page: Page) {
  await signedIn(page);
  await page.goto('/');
  await page.getByRole('heading', { name: 'Signal Tower' }).waitFor();
}

type Measured = { p95: number; compositor: number; raster: number };

/**
 * How many times the reference's compositor work the square may cost, still and while hovered.
 * Best of three, 4x CPU, reference 99-164 ms/s:
 * - The square: idle 3.5x locally, 2.5-2.8x on CI; hover 5.2x locally, 3.3-4.0x on CI.
 * - The square before #123: idle 7.2x, hover 8.9x (and hover frame p95 50 ms, raster 76 ms/s).
 * Hover's frame gaps are not compared: CI composites in software, so with the mouse moving they
 * show the runner's compositing speed (33-67 ms for the same square), not the square's.
 */
const IDLE_RATIO = 5;
const HOVER_RATIO = 7;
/**
 * The rasteriser's work while hovering, also against the reference's compositor work, because
 * it too slows with the runner. Since #137 the hover pass points at each place in turn and
 * pauses, as a person does, instead of sweeping across the square. Measured that way, locally:
 * - The square: 0.33-0.41 (50-54 ms/s), nearly all of it the gold glow blurred as it appears.
 * - The square before #137: 0.57-0.67 (91-98 ms/s): each hover made the building a layer of its
 *   own and drew it again. (The old sweep read 0.22-0.25 and missed that; the square before
 *   #123 read 0.72 on the sweep.)
 */
const HOVER_RASTER_RATIO = 0.5;

test.describe('the city square stays fast (#123)', () => {
  test('only small sprite layers animate, and nothing blends or filters on hover', async ({
    page,
  }) => {
    await openSquare(page);
    const report = await page.evaluate(() => {
      const city = document.querySelector('.city');
      const stage = document.querySelector('.city__stage');
      if (!city || !stage) throw new Error('no city square');
      // Ambient motion only: one-off transitions (the HUD's XP bar filling in) don't count.
      const ambient = stage
        .getAnimations({ subtree: true })
        .filter((a) => a instanceof CSSAnimation);
      const animations = ambient.map((a) => {
        const effect = a.effect as KeyframeEffect;
        const el = effect.target as Element;
        const props = new Set(
          effect
            .getKeyframes()
            .flatMap((k) =>
              Object.keys(k).filter(
                (p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p),
              ),
            ),
        );
        return {
          sprite: el.classList.contains('city__sprite'),
          insideSvg: !!el.closest('svg'),
          props: [...props],
        };
      });
      const blended = [...city.querySelectorAll('*')].filter(
        (el) => getComputedStyle(el).mixBlendMode !== 'normal',
      ).length;
      return { animations, blended };
    });
    expect(report.animations.length).toBeGreaterThan(5);
    for (const a of report.animations) {
      expect(a.sprite).toBe(true);
      expect(a.insideSvg).toBe(false);
      for (const p of a.props) expect(['transform', 'opacity']).toContain(p);
    }
    expect(report.blended).toBe(0);

    const place = page.locator('.city__place--caravanserai');
    await place.hover();
    await expect(place.locator('.city__glow')).toHaveCSS('opacity', '1');
    // A layer of its own before the hover, so lifting it never draws the building again (#137).
    expect(await place.evaluate((el) => getComputedStyle(el).willChange)).toBe('transform');
    expect(await place.evaluate((el) => getComputedStyle(el).filter)).toBe('none');
  });

  test(
    'frame budget: idle and hovering, with the CPU slowed 4×',
    { tag: '@timing' },
    async ({ page, browser }, info) => {
      test.skip(info.project.name !== 'desktop', 'hovering needs a mouse; one viewport is enough');
      test.setTimeout(120_000);
      await openSquare(page);
      await page.waitForTimeout(500);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

      /** The middle of each place's plaque, where the hover pass points. */
      const spots: { x: number; y: number }[] = [];
      for (const plaque of await page.locator('.city__plaque').all()) {
        const box = await plaque.boundingBox();
        if (box) spots.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
      }
      expect(spots.length).toBeGreaterThan(3);

      /** Frame gaps (rAF) and, from a Chrome trace, the compositor's and the rasteriser's work. */
      async function measure(ms: number, hover: boolean): Promise<Measured> {
        await page.evaluate(() => {
          const w = window as unknown as { gaps: number[]; stop: boolean };
          w.gaps = [];
          w.stop = false;
          let last = performance.now();
          const tick = (t: number) => {
            w.gaps.push(t - last);
            last = t;
            if (!w.stop) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        await browser.startTracing(page, {
          categories: ['disabled-by-default-devtools.timeline', 'viz'],
        });
        const start = Date.now();
        // Hovering as a person does (#137): onto a place, a pause while it lights up, off again.
        for (let i = 0; Date.now() - start < ms; i++) {
          const spot = spots[i % spots.length];
          if (hover && spot) {
            await page.mouse.move(spot.x, spot.y, { steps: 3 });
            await page.waitForTimeout(150);
            await page.mouse.move(spot.x, 4, { steps: 3 }); // the sky above it
            await page.waitForTimeout(100);
          } else await page.waitForTimeout(100);
        }
        const wall = Date.now() - start;
        const events = JSON.parse((await browser.stopTracing()).toString()).traceEvents as {
          name: string;
          ph: string;
          dur?: number;
        }[];
        const busy = (name: string) =>
          events
            .filter((e) => e.ph === 'X' && e.name === name)
            .reduce((t, e) => t + (e.dur ?? 0), 0) / wall; // µs per ms of wall time = ms of work per second
        const gaps = await page.evaluate(() => {
          const w = window as unknown as { gaps: number[]; stop: boolean };
          w.stop = true;
          return w.gaps.slice(1).sort((a, b) => a - b);
        });
        const p95 = gaps[Math.floor(gaps.length * 0.95)];
        return { p95, compositor: busy('Display::DrawAndSwap'), raster: busy('RasterTask') };
      }

      /**
       * A reference scene drawn on the same machine, in the same minutes: a full-window still
       * picture with 16 small layers moving by transform and opacity. That is what the square should
       * cost the compositor, so it measures how fast this machine composites right now. A busy
       * runner slows both alike; the old square's blend modes cost far more than it.
       * (Built with the DOM and Web Animations, which the strict CSP allows.)
       */
      const reference = (on: boolean) =>
        page.evaluate((on) => {
          const city = document.querySelector<HTMLElement>('.city');
          if (city) city.style.display = on ? 'none' : '';
          document.getElementById('frame-reference')?.remove();
          if (!on) return;
          const ref = document.createElement('div');
          ref.id = 'frame-reference';
          Object.assign(ref.style, {
            position: 'fixed',
            inset: '0',
            background: 'linear-gradient(160deg, #3b2a1a, #b98b4e 40%, #6d4c2c 70%, #1f150c)',
          });
          for (let i = 0; i < 16; i++) {
            const dot = document.createElement('div');
            Object.assign(dot.style, {
              position: 'absolute',
              left: `${(i * 6 + 3) % 96}%`,
              top: `${(i * 23 + 10) % 85}%`,
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'radial-gradient(#ffd98a, transparent 70%)',
            });
            dot.animate(
              [
                { transform: 'translateY(0)', opacity: 0.6 },
                { transform: 'translateY(-12px)', opacity: 1 },
              ],
              { duration: 1200 + i * 90, iterations: Infinity, direction: 'alternate' },
            );
            ref.append(dot);
          }
          document.body.append(ref);
        }, on);

      // Noise on a shared runner only ever adds time, so each figure is the best of five rounds,
      // and the reference is measured in the same rounds, right before the square. (Best of three
      // read the hover raster at 0.38-0.52 of the reference, so it failed now and then against 0.5;
      // best of five reads 0.38-0.43. The square before #123 read 0.57-0.67.)
      const runs = { ref: [] as Measured[], idle: [] as Measured[], hover: [] as Measured[] };
      for (let i = 0; i < 5; i++) {
        await reference(true);
        await page.waitForTimeout(500);
        runs.ref.push(await measure(2000, false));
        await reference(false);
        await page.waitForTimeout(1500); // the square repaints once when it comes back
        runs.idle.push(await measure(2000, false));
        runs.hover.push(await measure(2000, true));
      }
      const best = (rs: Measured[]) => {
        const min = (k: keyof Measured) => Math.min(...rs.map((r) => r[k] ?? Infinity));
        return { p95: min('p95'), compositor: min('compositor'), raster: min('raster') };
      };
      const [ref, idle, hover] = [best(runs.ref), best(runs.idle), best(runs.hover)];
      console.log(
        `reference ${JSON.stringify(ref)} square idle ${JSON.stringify(idle)} hover ${JSON.stringify(hover)}`,
      );
      // Frame times come in whole frames, but the browser rounds its clock to 0.1 ms, so two
      // frames can read 33.4 against a reference of 16.7 + one frame = 33.37. Half a millisecond
      // of slack absorbs the rounding without letting a second dropped frame through.
      const frame = 1000 / 60;
      expect(idle.p95).toBeLessThanOrEqual(ref.p95 + frame + 0.5);
      expect(idle.compositor).toBeLessThan(ref.compositor * IDLE_RATIO);
      expect(hover.compositor).toBeLessThan(ref.compositor * HOVER_RATIO);
      expect(hover.raster).toBeLessThan(ref.compositor * HOVER_RASTER_RATIO);
    },
  );
});
