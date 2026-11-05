import { expect, test, type Page } from '@playwright/test';
import { signedIn } from './fake-supabase.ts';

// The square's frame budget (#123, ADR 0025 amended). The square was slow because small
// animations ran under full-stage blend modes and hovering re-filtered a whole building.
// The first test checks the rules that keep it fast; the second times it, with margins wide
// enough for a slow CI machine (the numbers it would have failed on are in the comments).

async function openSquare(page: Page) {
  await signedIn(page);
  await page.goto('/');
  await page.getByRole('heading', { name: 'Signal Tower' }).waitFor();
}

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
    expect(await place.evaluate((el) => getComputedStyle(el).filter)).toBe('none');
  });

  test('frame budget: idle and hovering, with the CPU slowed 4×', async ({
    page,
    browser,
  }, info) => {
    test.skip(info.project.name !== 'desktop', 'hovering needs a mouse; one viewport is enough');
    test.setTimeout(60_000);
    await openSquare(page);
    await page.waitForTimeout(500);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    /** Frame gaps (rAF) and, from a Chrome trace, the compositor's and the rasteriser's work. */
    async function measure(ms: number, hover: boolean) {
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
      const { width, height } = page.viewportSize() ?? { width: 1280, height: 720 };
      for (let i = 0; Date.now() - start < ms; i++) {
        if (hover) await page.mouse.move((i * 37) % width, height * 0.45 + ((i * 13) % 80));
        else await page.waitForTimeout(100);
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

    const idle = await measure(3000, false);
    const hover = await measure(2000, true);
    console.log(`square idle ${JSON.stringify(idle)} hover ${JSON.stringify(hover)}`);
    // Before #123 (same method): idle compositor 750–830 ms/s; hover p95 50 ms, raster ~105 ms/s.
    // After: idle compositor ~370, hover p95 17 ms, raster ~45.
    expect(idle.p95).toBeLessThanOrEqual(34);
    expect(hover.p95).toBeLessThanOrEqual(34);
    expect(idle.compositor).toBeLessThan(650);
    expect(hover.raster).toBeLessThan(90);
  });
});
