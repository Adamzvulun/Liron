import type { Page } from '@playwright/test';

// The e2e build points at this address (playwright.config.ts). Nothing listens there:
// every request is answered by page.route below, so tests never touch a real project.
export const FAKE_SUPABASE_URL = 'http://127.0.0.1:54321';
const STORAGE_KEY = 'sb-127-auth-token'; // supabase-js: `sb-${first part of the host}-auth-token`

export const PASSWORD = 'correct horse';

function fakeSession() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'e2e-access-token',
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'adam@example.com',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}

/** The wallet the fake database returns. */
export const WALLET = { xp: 65, gold: 31, gems: 2 };
/** The player's profile row. */
export const PROFILE = { display_name: 'Adam' };

/** Today: 6 of 15 minutes, a 2-day streak alive from yesterday. */
export const TODAY = {
  day: '2026-11-02',
  minutes: 6,
  goal_minutes: 15,
  goal_reached: false,
  streak: 2,
};

/**
 * Answers Supabase Auth calls (password login: only PASSWORD works; logout; reset email) and
 * the wallet read.
 */
export async function fakeSupabase(
  page: Page,
  passwordUpdates: unknown[] = [],
  profileUpdates: unknown[] = [],
) {
  await page.route(`${FAKE_SUPABASE_URL}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const body = route.request().postDataJSON() as { password?: string };
      if (body.password === PASSWORD) return route.fulfill({ json: fakeSession() });
      return route.fulfill({
        status: 400,
        json: { code: 'invalid_credentials', message: 'Invalid login credentials' },
      });
    }
    if (url.pathname === '/auth/v1/user') {
      // GET: supabase-js checks the token from an emailed link. PUT: the new password is saved.
      if (route.request().method() === 'PUT') passwordUpdates.push(route.request().postDataJSON());
      return route.fulfill({ json: fakeSession().user });
    }
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (url.pathname === '/auth/v1/recover') return route.fulfill({ json: {} });
    if (url.pathname === '/rest/v1/rpc/set_time_zone') return route.fulfill({ json: null });
    if (url.pathname === '/rest/v1/rpc/today_status') return route.fulfill({ json: TODAY });
    if (url.pathname === '/rest/v1/rpc/set_daily_goal') {
      // Like the database: a goal at or below today's minutes reaches it and pays the chest.
      const { p_minutes } = route.request().postDataJSON() as { p_minutes: number };
      const reached = TODAY.minutes >= p_minutes;
      return route.fulfill({
        json: {
          ...TODAY,
          goal_minutes: p_minutes,
          goal_reached: reached,
          goal_reached_now: reached,
          streak: reached ? TODAY.streak + 1 : TODAY.streak,
          chest_gold: reached ? 20 : 0,
          chest_gems: 0,
          wallet: { ...WALLET, gold: WALLET.gold + (reached ? 20 : 0) },
        },
      });
    }
    if (url.pathname === '/rest/v1/profiles') {
      if (route.request().method() === 'PATCH') {
        profileUpdates.push(route.request().postDataJSON());
        return route.fulfill({ status: 204 });
      }
      const single = route.request().headers()['accept']?.includes('vnd.pgrst.object');
      return route.fulfill({ json: single ? PROFILE : [PROFILE] });
    }
    if (url.pathname === '/rest/v1/wallets') {
      // supabase-js asks for a single object with this Accept header (maybeSingle).
      const single = route.request().headers()['accept']?.includes('vnd.pgrst.object');
      return route.fulfill({ json: single ? WALLET : [WALLET] });
    }
    return route.fulfill({ status: 404, json: {} });
  });
}

/** Starts the page already logged in, the way a returning visitor would be. */
export async function signedIn(page: Page, profileUpdates: unknown[] = []) {
  await fakeSupabase(page, [], profileUpdates);
  await page.addInitScript(
    ([key, session]) => {
      if (!sessionStorage.getItem('e2e-seeded')) {
        localStorage.setItem(key, JSON.stringify(session));
        sessionStorage.setItem('e2e-seeded', '1');
      }
    },
    [STORAGE_KEY, fakeSession()] as const,
  );
}

/** The URL fragment Supabase puts on the links it emails (implicit flow). */
export function emailLinkFragment(type: 'invite' | 'recovery') {
  const s = fakeSession();
  return `#access_token=${s.access_token}&refresh_token=${s.refresh_token}&expires_in=3600&expires_at=${s.expires_at}&token_type=bearer&type=${type}`;
}
