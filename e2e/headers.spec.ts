import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { FAKE_SUPABASE_URL, lessonWord, signedIn } from './fake-supabase.ts';

// The live site's security headers (vercel.json, security review M3). `vite preview` doesn't
// send them, so this test adds them to every page it loads and fails on any CSP violation.
// The fake database stands in for Supabase, so the policy's Supabase hosts point at it here.
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const HEADERS = Object.fromEntries(
  (vercel.headers[0]?.headers ?? []).map(({ key, value }) => [
    key,
    value
      .replaceAll('https://*.supabase.co', FAKE_SUPABASE_URL)
      .replaceAll('wss://*.supabase.co', FAKE_SUPABASE_URL.replace('http', 'ws')),
  ]),
);

async function withHeaders(page: Page): Promise<string[]> {
  const violations: string[] = [];
  await page.exposeFunction('reportViolation', (v: string) => violations.push(v));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { reportViolation: (v: string) => void }).reportViolation(
        `${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber} ${e.sample}`,
      ),
    );
  });
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...HEADERS } });
  });
  return violations;
}

test('the live site’s security headers are complete and break nothing', async ({ page }) => {
  expect(Object.keys(HEADERS)).toEqual(
    expect.arrayContaining([
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ]),
  );
  const csp = HEADERS['Content-Security-Policy'] ?? '';
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toContain('unsafe-inline');
  expect(csp).not.toContain('unsafe-eval');

  await signedIn(page, [], [], { lesson: 4, streak: 0, met: [], done: false, sessions: 4 }, [
    lessonWord(1, 'بيت', 'house'),
    lessonWord(2, 'تين', 'figs'),
    lessonWord(3, 'بنت', 'girl'),
    lessonWord(4, 'نبي', 'prophet'),
    lessonWord(5, 'باب', 'door'),
  ]);
  const violations = await withHeaders(page);

  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toBe(csp);
  await expect(page.getByRole('heading', { name: 'Caravanserai' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  await page.goto('/signal-tower');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.goto('/caravanserai');
  await page.getByRole('button', { name: /The storyteller/ }).click();
  await page.getByRole('button', { name: 'Begin' }).click();
  const sounds = page.getByRole('group', { name: 'Recordings' });
  if (await sounds.isVisible()) {
    await sounds.getByRole('button').first().click();
    await page.getByRole('button', { name: /^This one/ }).click();
  } else {
    await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
  }
  await expect(page.getByText(/^(Right!|Not quite\.)$/)).toBeVisible();

  expect(violations).toEqual([]);
});
