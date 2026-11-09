import type { Page } from '@playwright/test';
import { REVIEWS } from '../src/subjects/arabic/words.ts';

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
  streak_shields: 0,
  shielded_days: 0,
};

/** What a test can change about the player beyond the defaults (ADR 0033, 0034). */
export interface Extras {
  /** Item ids the player owns. */
  owned?: string[];
  /** Overrides for today's status, e.g. shields held. */
  today?: Partial<typeof TODAY>;
}

/**
 * Today's contracts on the fake board (ADR 0032): finished by events from saved sessions (the
 * habit counts sessions). Paid ones add their gold to the wallet.
 */
export const CONTRACTS = [
  {
    id: 'habit-sessions',
    subject: null,
    text: 'Finish 3 sessions today',
    kind: 'session',
    target: 3,
    gold: 10,
  },
  {
    id: 'morse-run-90',
    subject: 'morse',
    text: 'Pass a Koch run at 90%',
    kind: 'run-90',
    target: 1,
    gold: 20,
  },
  {
    id: 'arabic-coffee',
    subject: 'arabic',
    text: 'Practice phrases at the coffee corner',
    kind: 'coffee',
    target: 1,
    gold: 15,
  },
];

/**
 * Answers Supabase Auth calls (password login: only PASSWORD works; logout; reset email) and
 * the wallet read.
 */
export async function fakeSupabase(
  page: Page,
  passwordUpdates: unknown[] = [],
  profileUpdates: unknown[] = [],
  subjectCalls: SubjectCall[] = [],
  /** The Morse subject's saved state, if the test wants one. */
  morseState: object | null = null,
  /** Private content rows (content_items), e.g. a few deck words for Arabic. */
  content: ContentRow[] = [],
  extras: Extras = {},
) {
  // Like the database, a saved state is what the next read of that subject returns, so a test
  // can play a session, reload and see where it left off.
  const saved = new Map<string, object>();
  // Events from saved sessions, by kind, for today's contracts (ADR 0032).
  const events = new Map<string, number>();
  const board = () => {
    const contracts = CONTRACTS.map((c) => {
      const progress = Math.min(c.target, events.get(c.kind) ?? 0);
      return { ...c, progress, paid: progress >= c.target };
    });
    const earned = contracts.filter((c) => c.paid).reduce((sum, c) => sum + c.gold, 0);
    return { contracts, gold: WALLET.gold + earned };
  };
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
    if (url.pathname === '/rest/v1/rpc/today_status') {
      return route.fulfill({ json: { ...TODAY, ...extras.today } });
    }
    if (url.pathname === '/rest/v1/owned_items') {
      return route.fulfill({ json: (extras.owned ?? []).map((item_id) => ({ item_id })) });
    }
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
    // Private content (ADR 0023): the rows the test gave, and a short silent recording for
    // every media link.
    if (url.pathname === '/rest/v1/content_items') {
      // The deck's version check (#124): the row count and the latest change.
      if (url.searchParams.get('select') === 'updated_at') {
        return route.fulfill({
          json: content.length ? [{ updated_at: '2026-11-01T00:00:00Z' }] : [],
          headers: {
            'Content-Range': `0-0/${content.length}`,
            'Access-Control-Expose-Headers': 'Content-Range',
          },
        });
      }
      return route.fulfill({ json: content });
    }
    if (url.pathname === '/rest/v1/content_lessons') return route.fulfill({ json: [] });
    if (url.pathname.startsWith('/storage/v1/object/sign/')) {
      if (route.request().method() === 'POST' && url.pathname.endsWith('/sign/private-media')) {
        // Several links in one request (createSignedUrls, #124).
        const { paths } = route.request().postDataJSON() as { paths: string[] };
        return route.fulfill({
          json: paths.map((p) => ({
            error: null,
            path: p,
            signedURL: `/object/sign/private-media/${p}?token=e2e`,
          })),
        });
      }
      if (route.request().method() === 'POST') {
        const path = url.pathname.replace('/storage/v1', '');
        return route.fulfill({ json: { signedURL: `${path}?token=e2e` } });
      }
      return route.fulfill({ contentType: 'audio/wav', body: SILENT_WAV });
    }
    // A subject's progress: no saved state, nothing reviewed or rated yet. Writes are recorded.
    const single = route.request().headers()['accept']?.includes('vnd.pgrst.object');
    if (
      [
        '/rest/v1/subject_progress',
        '/rest/v1/review_cards',
        '/rest/v1/skill_ratings',
        '/rest/v1/item_ratings',
      ].includes(url.pathname)
    ) {
      // PostgREST answers "no row" for a single-object request like this; supabase-js's
      // maybeSingle() turns it into null.
      const subject = url.searchParams.get('subject_id')?.replace(/^eq\./, '') ?? '';
      const state = saved.get(subject) ?? morseState;
      if (url.pathname === '/rest/v1/subject_progress' && state) {
        const row = { xp: 0, minutes: 0, state };
        return route.fulfill({ json: single ? row : [row] });
      }
      return single
        ? route.fulfill({
            status: 406,
            json: { code: 'PGRST116', details: 'The result contains 0 rows', message: 'No rows' },
          })
        : route.fulfill({ json: [] });
    }
    const rpc = url.pathname.replace('/rest/v1/rpc/', '');
    if (['save_subject_state', 'record_review', 'record_result'].includes(rpc)) {
      const args = route.request().postDataJSON() as { p_subject?: string; p_state?: object };
      subjectCalls.push({ rpc, args });
      if (rpc === 'save_subject_state' && args.p_subject && args.p_state)
        saved.set(args.p_subject, args.p_state);
      return route.fulfill({ json: null });
    }
    if (rpc === 'record_progress') {
      const args = route.request().postDataJSON() as { p_xp: number; p_minutes: number };
      subjectCalls.push({ rpc, args });
      return route.fulfill({ json: award(args.p_xp, args.p_minutes) });
    }
    // One save per session (ADR 0031): applied the way the database applies it, and recorded
    // as the calls it stands for, so specs can check each part.
    if (rpc === 'save_session') {
      const a = route.request().postDataJSON() as SaveSessionArgs;
      const p_subject = a.p_subject;
      events.set('session', (events.get('session') ?? 0) + 1);
      for (const e of a.p_events ?? []) events.set(e.kind, (events.get(e.kind) ?? 0) + e.count);
      if (a.p_state) {
        saved.set(p_subject, a.p_state);
        subjectCalls.push({ rpc: 'save_subject_state', args: { p_subject, p_state: a.p_state } });
      }
      for (const r of a.p_reviews ?? [])
        subjectCalls.push({
          rpc: 'record_review',
          args: {
            p_subject,
            p_item: r.item,
            p_rating: r.rating,
            p_reviewed_at: r.reviewed_at,
            p_due: r.due,
            p_state: r.state,
            p_card: r.card,
            p_log: r.log,
          },
        });
      for (const r of a.p_results ?? [])
        subjectCalls.push({
          rpc: 'record_result',
          args: {
            p_subject,
            p_skill: r.skill,
            p_item: r.item,
            p_score: r.score,
            p_rated_at: r.rated_at,
            p_learner: r.learner,
            p_item_rating: r.item_rating,
          },
        });
      const paid = a.p_xp > 0 || a.p_minutes > 0;
      if (paid)
        subjectCalls.push({
          rpc: 'record_progress',
          args: { p_xp: a.p_xp, p_minutes: a.p_minutes },
        });
      return route.fulfill({
        json: { duplicate: false, award: paid ? award(a.p_xp, a.p_minutes) : null },
      });
    }
    if (rpc === 'todays_contracts') {
      const { contracts, gold } = board();
      return route.fulfill({
        json: {
          day: TODAY.day,
          // The kind is the fake's own bookkeeping; the database never sends it.
          contracts: contracts.map((c) => ({ ...c, kind: undefined })),
          paid_now: [],
          gold,
        },
      });
    }
    if (url.pathname === '/rest/v1/profiles') {
      if (route.request().method() === 'PATCH') {
        profileUpdates.push(route.request().postDataJSON());
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({ json: single ? PROFILE : [PROFILE] });
    }
    if (url.pathname === '/rest/v1/wallets') {
      // supabase-js asks for a single object with this Accept header (maybeSingle).
      return route.fulfill({ json: single ? WALLET : [WALLET] });
    }
    return route.fulfill({ status: 404, json: {} });
  });
}

/** One private content row, as the content_items table returns it. */
export interface ContentRow {
  item_id: string;
  type: string;
  data: object;
  media: object[];
  tags: string[];
}

/** A deck-like word for Arabic tests (everyday words, not the deck's own rows). */
export const deckWord = (n: number, arabic: string, english: string): ContentRow => ({
  item_id: `pcav:${String(n).padStart(4, '0')}`,
  type: 'vocab',
  data: { order: n, arabic, pronunciation: arabic, english, section: 1 },
  media: [{ kind: 'audio', store: 'private', path: `lingualism-pcav/w${n}.mp3` }],
  tags: [],
});

/**
 * A deck-like lesson-1 word under the id of the `n`th word in the reviewed lesson-1 list
 * (content/arabic/lesson-words.json, #125): a reviewed lesson uses only listed ids.
 */
export const lessonWord = (n: number, arabic: string, english: string): ContentRow => {
  const id = REVIEWS.find((r) => r.lesson === 1)?.words[n - 1]?.deck;
  if (!id) throw new Error(`no reviewed lesson-1 word number ${n}`);
  return { ...deckWord(n, arabic, english), item_id: id };
};

/** 0.1 s of silence, as a WAV file. */
const SILENT_WAV = (() => {
  const samples = 800;
  const b = Buffer.alloc(44 + samples * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + samples * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(16000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(samples * 2, 40);
  return b;
})();

/** A write a subject made through the database functions (rpc name and arguments). */
export interface SubjectCall {
  rpc: string;
  args: unknown;
}

/**
 * Records the path of every recording the page plays (the signed link names it), so a test
 * can tell which word it heard. Read them with `played(page)`.
 */
export async function listenForAudio(page: Page) {
  await page.addInitScript(() => {
    const heard: string[] = [];
    (window as unknown as { __played: string[] }).__played = heard;
    const Real = window.Audio;
    window.Audio = function (src?: string) {
      if (src) heard.push(src);
      return new Real(src);
    } as unknown as typeof Audio;
  });
}

/** The recordings played so far, as their media paths (`lingualism-pcav/w3.mp3`). */
export async function played(page: Page): Promise<string[]> {
  const urls = await page.evaluate(() => (window as unknown as { __played: string[] }).__played);
  return urls.map((u) => new URL(u, 'http://x').pathname.replace(/^.*\/object\/sign\/[^/]+\//, ''));
}

/**
 * Records every tone the page schedules on Web Audio (each gain's ramps up and down), so a test
 * can read back the Morse a run plays. Read it with `morseHeard(page)`.
 */
export async function listenForMorse(page: Page) {
  await page.addInitScript(() => {
    const keys: { ups: number[]; downs: number[] }[] = [];
    (window as unknown as { __keys: typeof keys }).__keys = keys;
    const seen = new WeakMap<AudioParam, { ups: number[]; downs: number[] }>();
    const ramp = AudioParam.prototype.linearRampToValueAtTime;
    AudioParam.prototype.linearRampToValueAtTime = function (value: number, time: number) {
      let k = seen.get(this);
      if (!k) {
        k = { ups: [], downs: [] };
        seen.set(this, k);
        keys.push(k);
      }
      (value > 0 ? k.ups : k.downs).push(time);
      return ramp.call(this, value, time);
    };
  });
}

/**
 * The runs of Morse scheduled so far (any stretch of 5 tones or more, so not a single letter),
 * each as dots and dashes split into characters: a tone over two dits is a dash, a gap over two
 * dits ends a character.
 */
export async function morseRuns(page: Page, ditSeconds: number): Promise<string[][]> {
  const keys = await page.evaluate(
    () => (window as unknown as { __keys: { ups: number[]; downs: number[] }[] }).__keys,
  );
  return keys
    .filter((k) => k.ups.length >= 5)
    .map((run) => {
      const chars: string[] = [];
      let code = '';
      run.ups.forEach((up, i) => {
        const down = run.downs[i] ?? up;
        const gap = i > 0 ? up - (run.downs[i - 1] ?? up) : 0;
        if (i > 0 && gap > 2 * ditSeconds) {
          chars.push(code);
          code = '';
        }
        code += down - up > 2 * ditSeconds ? '-' : '.';
      });
      if (code) chars.push(code);
      return chars;
    });
}

/** Starts the page already logged in, the way a returning visitor would be. */
export async function signedIn(
  page: Page,
  profileUpdates: unknown[] = [],
  subjectCalls: SubjectCall[] = [],
  morseState: object | null = null,
  content: ContentRow[] = [],
  extras: Extras = {},
) {
  await fakeSupabase(page, [], profileUpdates, subjectCalls, morseState, content, extras);
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

/** What save_session receives (supabaseStore's saveSession). */
interface SaveSessionArgs {
  p_subject: string;
  p_state: object | null;
  p_reviews: Record<string, unknown>[] | null;
  p_results: Record<string, unknown>[] | null;
  p_xp: number;
  p_minutes: number;
  p_events?: { kind: string; count: number }[];
}

/** record_progress's answer: the fake wallet plus what was paid (no gold or gems, no level). */
function award(xp: number, minutes: number) {
  return {
    ...WALLET,
    xp: WALLET.xp + xp,
    xp_earned: xp,
    gold_earned: 0,
    gems_earned: 0,
    level_before: 3,
    level: 3,
    today: { ...TODAY, minutes: TODAY.minutes + minutes },
  };
}

/** The coffee corner's first set: everyday greetings under its deck ids (not the deck's own rows). */
export const GREETINGS = [
  ['4761', 'مرحبا', 'márɧaba', 'Hello'],
  ['4762', 'هلا', 'hála', 'Hi'],
  ['4764', 'صباح الخير', 'ʂabāɧ ilxēr', 'Good morning'],
  ['4765', 'كيف حالك؟', 'kēf ɧālak?', 'How are you?'],
  ['4767', 'تمام', 'tamām', 'Fine'],
  ['4766', 'الحمد لله', 'ilɧamdu lillāh', 'Thank God'],
  ['4780', 'أهلا وسهلا', 'áhla w sáhla', 'Welcome'],
  ['4771', 'باي', 'bāy', 'Bye'],
  ['4772', 'سلام', 'salām', 'Peace'],
  ['4773', 'تصبح على خير', 'tíʂbaɧ 3ála xēr', 'Good night'],
].map(([n, arabic, sound, english]) => ({
  ...deckWord(Number(n), arabic ?? '', english ?? ''),
  data: { order: Number(n), arabic, pronunciation: sound, english, section: 57 },
}));
