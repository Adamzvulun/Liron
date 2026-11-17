import { expect, test, type Page } from '@playwright/test';
import { signedIn, type SubjectCall } from './fake-supabase.ts';

/** Keys a code ("-.-") on the space bar at 10 wpm. */
async function key(page: Page, code: string) {
  for (const e of code) {
    await page.keyboard.down('Space');
    await page.waitForTimeout(e === '-' ? 360 : 120);
    await page.keyboard.up('Space');
    await page.waitForTimeout(120);
  }
}

test.describe('Sending at the telegraph table (#35, #36, #37)', () => {
  test('keying K with the space bar reads as K, and the drill is saved', async ({ page }, info) => {
    test.skip(info.project.name === 'phone', 'The space bar is the desktop key');
    const calls: SubjectCall[] = [];
    await signedIn(page, [], calls);
    await page.goto('/signal-tower');
    await page.getByRole('button', { name: /Sending/ }).click();
    await page.getByRole('button', { name: 'Sit at the key' }).click();
    await expect(page.getByText('Key this')).toBeVisible();

    await key(page, '-.-');
    await page.waitForTimeout(400);
    await expect(page.locator('.send__read-text')).toHaveText('K');

    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('heading', { name: 'Your fist' })).toBeVisible();
    await expect(page.getByText('Dah ÷ dit')).toBeVisible();
    await expect.poll(() => calls.some((c) => c.rpc === 'record_result')).toBe(true);
    for (const c of calls.filter((c) => c.rpc === 'record_result')) {
      expect(c.args).toMatchObject({ p_subject: 'morse', p_skill: 'send' });
    }
    expect(calls.find((c) => c.rpc === 'save_subject_state')?.args).toMatchObject({
      p_state: { sending: { drills: 1 } },
    });
  });

  test('the brass key works by touch', async ({ page }) => {
    await signedIn(page, []);
    await page.goto('/signal-tower?open=sending');
    await page.getByRole('button', { name: 'Sit at the key' }).click();
    const pad = page.getByRole('button', { name: /Morse key/ });
    const box = await pad.boundingBox();
    if (!box) throw new Error('no key');
    for (const ms of [360, 360]) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(ms);
      await page.mouse.up();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    await expect(page.locator('.send__read-text')).toHaveText('M');
  });

  test('with eight letters learned you can key whole words, and see how many were read', async ({
    page,
  }, info) => {
    test.skip(info.project.name === 'phone', 'The space bar is the desktop key');
    const eight = { unlocked: 8, met: [...'KMURESNA'], trials: [1], sending: { drills: 3 } };
    await signedIn(page, [], [], eight);
    await page.goto('/signal-tower?open=sending');
    await page.getByRole('button', { name: 'Key 5 words' }).click();
    const label = (await page.locator('.send__target').getAttribute('aria-label')) ?? '';
    expect(label.replace('Key: ', '').split(' ')).toHaveLength(5);
    await key(page, '-.-');
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByText(/^0 of 5 words · \d+ of \d+ letters read right/)).toBeVisible();
  });

  test('a beginner is not offered words yet', async ({ page }) => {
    await signedIn(page, [], [], { unlocked: 2, met: ['K', 'M'], trials: [] });
    await page.goto('/signal-tower?open=sending');
    await expect(page.getByRole('button', { name: 'Sit at the key' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Key \d words/ })).toHaveCount(0);
  });
});
