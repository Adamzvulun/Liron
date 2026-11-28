import { expect, expectCrash, test } from './fixtures.ts';
import { signedIn } from './fake-supabase.ts';

// Our own error log (task 10.1, #499; ADR 0058): an uncaught error sends one report_error call.
test('an uncaught error is reported, with the route and no query', async ({ page }) => {
  expectCrash();
  await signedIn(page);
  const calls: Record<string, string>[] = [];
  // Registered after the fake database's, so it answers first.
  await page.route('**/rest/v1/rpc/report_error', (route) => {
    calls.push(route.request().postDataJSON() as Record<string, string>);
    return route.fulfill({ json: null });
  });
  await page.goto('/?private=typed');
  await expect(page.getByText('Lv 3')).toBeVisible();
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error('thrown on purpose');
    });
  });
  await expect.poll(() => calls.length).toBe(1);
  expect(calls[0]).toMatchObject({ p_message: 'thrown on purpose', p_route: '/' });
  expect(JSON.stringify(calls[0])).not.toContain('typed');
});
