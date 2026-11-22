import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * The specs that check how things look or work on a phone: each has phone-only steps or
 * measures the screen. On a pull request into `dev`, CI runs only these on the phone, and every
 * spec on the desktop; a release PR into `main` (PHONE_ALL=1), and every local run, runs every
 * spec on both (ADR 0005). `tests/phone-specs.test.ts` keeps this list honest.
 */
export const PHONE_SPECS = [
  'arabic-script',
  'arabic-words',
  'city-speed',
  'city',
  'fellowship',
  'grounds',
  'guide',
  'hud',
  'inn-chat',
  'ledger',
  'load-budget',
  'morse-hall',
  'morse-send',
  'no-deck',
  'places',
  'smoke',
  'sound',
  'wire',
];
const phoneAll = !process.env.CI || process.env.PHONE_ALL === '1';

export default defineConfig({
  testDir: './tests/e2e',
  // Every test on its own, so CI's shards get equal shares of the work (ci.yml).
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // CI's runner has 2 CPUs: two workers took about 40% less time than one; three starved the
  // tests that wait in real time (2026-11-18). The @timing tests run alone (ci.yml).
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}` },
  // Phone and desktop count equally (ADR 0005). Both run on Chromium: the cloud session has a
  // pre-installed Chromium only, so never run `playwright install` there.
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'] },
      ...(!phoneAll && { testMatch: PHONE_SPECS.map((name) => `${name}.spec.ts`) }),
    },
  ],
  // Tests run against the production build, like the deployed site.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // A fake Supabase address: tests answer its requests themselves (tests/e2e/fake-supabase.ts).
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_e2e',
    },
  },
});
