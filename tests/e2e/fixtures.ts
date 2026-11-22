import { test as base, expect, type Page } from '@playwright/test';

/**
 * Every spec imports `test` from here, so a page that crashes fails its test even when the
 * screen still looks right: an uncaught error, or a screen or place an error boundary had to
 * catch (src/core/ErrorBoundary.tsx). Before this, a crash on a path no assertion looked at
 * went unseen (review, 2026-11-19).
 *
 * `fakeSupabase` watches each page it sets up, the extra pages of two-player tests included.
 * A test that breaks something on purpose says so with `expectCrash()`.
 */
const CAUGHT = /^Waymark (screen failed|place failed|extra failed|: showing an award failed)/;

let crashes: string[] = [];
let expected = false;

export function watchForCrashes(page: Page) {
  page.on('pageerror', (e) => crashes.push(`uncaught: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && CAUGHT.test(m.text())) crashes.push(m.text());
  });
}

/** This test makes the page crash on purpose; don't fail it for that. */
export function expectCrash() {
  expected = true;
}

export const test = base.extend<{ noCrashes: undefined }>({
  noCrashes: [
    // eslint-disable-next-line no-empty-pattern -- Playwright reads the fixtures from this.
    async ({}, use) => {
      crashes = [];
      expected = false;
      await use(undefined);
      if (!expected) expect(crashes, 'the page crashed').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
