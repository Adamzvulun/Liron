import type { Page } from '@playwright/test';
import { watchForCrashes } from './fixtures.ts';
import { WORD_CHAPTERS } from '../../src/subjects/arabic/core/coreWords.ts';
import { REVIEWS } from '../../src/subjects/arabic/words.ts';
import { ACHIEVEMENTS } from '../../src/core/achievements/achievements.ts';

// The e2e build points at this address (playwright.config.ts). Nothing listens there:
// every request is answered by page.route below, so tests never touch a real project.
export const FAKE_SUPABASE_URL = 'http://127.0.0.1:54321';
const STORAGE_KEY = 'sb-127-auth-token'; // supabase-js: `sb-${first part of the host}-auth-token`

export const PASSWORD = 'correct horse';

export function fakeSession() {
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

/** Every line Nour has (src/core/guide/seen.ts): what an old hand has heard. */
export const GUIDE_SAID = [
  'welcome',
  'intro:board',
  'intro:fellowship',
  'intro:market',
  'intro:wardrobe',
  'intro:other-hall',
  'intro:arena',
  'intro:ledger',
] as const;

/** What a test can change about the player beyond the defaults (ADR 0033, 0034). */
export interface Extras {
  /**
   * Ids the guide has already shown (the-guide.md §4). Most tests are about something else, so
   * Nour has said everything unless a test gives its own list ([] for a brand-new player).
   */
  guideSeen?: string[];
  /** Leave the first page showing for a new player (the-road.md §8). */
  firstPage?: boolean;
  /** Item ids the player owns. */
  owned?: string[];
  /** Overrides for today's status, e.g. shields held. */
  today?: Partial<typeof TODAY>;
  /** Unopened chests (ADR 0033). Each opens to 30 gold, a gem, the boots and a shield. */
  chests?: { id: string; kind: string; source: string; source_key: string }[];
  /** Gold in the wallet at the start, instead of WALLET's. */
  gold?: number;
  /** Skill ratings by subject, e.g. { arabic: { read: 1240 } }, each on 40 results. */
  ratings?: Record<string, Record<string, number>>;
  /** Achievement ids earned (#177); the rest have no progress unless `progress` says. */
  earned?: string[];
  /** Progress toward achievements not earned, by id. */
  progress?: Record<string, number>;
  /** The title worn at the start ('' for none). */
  title?: string;
  /** The player's name, if not PROFILE's ('' for a player who hasn't chosen one). */
  name?: string;
  /**
   * Whether the account holds the deck's licence (ADR 0050). Every account does; false plays
   * the safety net: the database then reads no deck rows, as row-level security would.
   */
  licensee?: boolean;
  /** Whether the player may make invite links (ADR 0052); each link made is pushed to `made`. */
  invites?: { inviter: boolean; made?: string[] };
  /** What the ledger reads (docs/game/ledger.md): cards, this week's reviews and the days. */
  ledger?: {
    cards?: Record<string, { item_id: string; interval: number; reps: number }[]>;
    week?: Record<string, string[]>;
    days?: { day: string; minutes: number }[];
  };
  /**
   * The Fellowship (task 3.1): the player's friends' cards and the requests waiting for them.
   * Each call to a Fellowship function is pushed to `calls`, and `refuse` makes one fail.
   */
  fellowship?: {
    friends?: Record<string, unknown>[];
    requests?: Record<string, unknown>[];
    calls?: { fn: string; args: unknown }[];
    refuse?: Record<string, string>;
    /** The party feed's rows (task 3.3), as `fellowship_feed` returns them. */
    feed?: Record<string, unknown>[];
    /** Whether the player shares their milestones (default true). */
    sharing?: boolean;
    /**
     * Challenges (task 3.4), as `my_challenges` returns them. Answering, declining and sending
     * change them; the last recorded round's score answers a challenge.
     */
    challenges?: Record<string, unknown>[];
    /** This week's Fellowship quest (task 3.5), as `fellowship_quest` returns it. */
    quest?: Record<string, unknown> | null;
    /** Gifts for the player, as `my_gifts` returns them. */
    gifts?: Record<string, unknown>[];
  };
}

/** A friend's card as the database returns it (fellowship-build.md §3). */
export function friendCard(id: string, name: string, more: Record<string, unknown> = {}) {
  return {
    id,
    me: false,
    name,
    look: {},
    title: '',
    level: 3,
    streak: 2,
    ranks: [],
    achievements: [],
    ...more,
  };
}

/** Today's fake Market stall (#49): 2 gear, 1 dye and the streak shield. */
export const STALL = [
  { id: 'tarboosh', kind: 'gear', slot: 'head', rarity: 'common', price: 60 },
  { id: 'robe', kind: 'gear', slot: 'torso', rarity: 'rare', price: 180 },
  { id: 'indigo-dye', kind: 'color', slot: null, rarity: 'common', price: 60 },
  { id: 'streak-shield', kind: 'functional', slot: null, rarity: 'functional', price: 120 },
] as const;

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
  watchForCrashes(page);
  const saved = new Map<string, object>();
  // Events from saved sessions, by kind, for today's contracts (ADR 0032).
  const events = new Map<string, number>();
  const opened = new Set<string>();
  // Session ids already saved: the database applies a session once (ADR 0031).
  const sessions = new Set<string>();
  // The title worn (#177), changed by set_title.
  let title = extras.title ?? '';
  let guideSeen = extras.guideSeen ?? [...GUIDE_SAID];
  // The Market's purchases (#49): what was bought, and the gold spent.
  const bought: string[] = [];
  let spent = 0;
  const board = () => {
    const contracts = CONTRACTS.map((c) => {
      const progress = Math.min(c.target, events.get(c.kind) ?? 0);
      return { ...c, progress, paid: progress >= c.target };
    });
    const earned = contracts.filter((c) => c.paid).reduce((sum, c) => sum + c.gold, 0);
    return { contracts, gold: (extras.gold ?? WALLET.gold) + earned - spent };
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
    if (url.pathname === '/rest/v1/rpc/can_invite') {
      return route.fulfill({ json: extras.invites?.inviter ?? false });
    }
    if (url.pathname === '/rest/v1/rpc/make_invite') {
      if (!extras.invites?.inviter) {
        return route.fulfill({ status: 403, json: { code: '42501', message: 'not an inviter' } });
      }
      const made = extras.invites.made ?? [];
      const code = (made.length + 1).toString(16).padStart(64, 'c');
      made.push(code);
      return route.fulfill({ json: code });
    }
    if (url.pathname === '/rest/v1/rpc/is_content_licensee') {
      return route.fulfill({ json: extras.licensee ?? true });
    }
    if (url.pathname === '/rest/v1/rpc/today_status') {
      return route.fulfill({ json: { ...TODAY, ...extras.today } });
    }
    if (url.pathname === '/rest/v1/chests') {
      return route.fulfill({ json: (extras.chests ?? []).filter((c) => !opened.has(c.id)) });
    }
    if (url.pathname === '/rest/v1/rpc/open_chest') {
      const { p_chest } = route.request().postDataJSON() as { p_chest: string };
      const chest = extras.chests?.find((c) => c.id === p_chest);
      if (!chest) return route.fulfill({ status: 400, json: { message: 'no such chest' } });
      // Opened before: what it held, and no purse, as the database answers.
      if (opened.has(p_chest)) {
        return route.fulfill({
          json: {
            id: chest.id,
            kind: chest.kind,
            gold: 30,
            gems: 1,
            item: 'boots',
            item_gold: 0,
            shield: true,
            shield_gold: 0,
            already_open: true,
          },
        });
      }
      opened.add(p_chest);
      const shields = (extras.today?.streak_shields ?? TODAY.streak_shields) + 1;
      return route.fulfill({
        json: {
          id: chest.id,
          kind: chest.kind,
          gold: 30,
          gems: 1,
          item: 'boots',
          item_gold: 0,
          shield: true,
          shield_gold: 0,
          already_open: false,
          wallet: {
            gold: board().gold + 30 * opened.size,
            gems: WALLET.gems + opened.size,
            streak_shields: shields,
          },
        },
      });
    }
    // The Fellowship's functions (task 3.1): a list that changes as the player acts.
    const fellowshipFn =
      /^\/rest\/v1\/rpc\/(my_friend_code|new_friend_code|ask_friend|answer_friend|remove_friend|fellowship|fellowship_requests|fellowship_feed|record_round_score|send_challenge|answer_challenge|decline_challenge|my_challenges|fellowship_quest|collect_fellowship_quest|give_item|my_gifts)$/.exec(
        url.pathname,
      )?.[1];
    if (fellowshipFn) {
      const f = (extras.fellowship ??= {});
      const args = route.request().postDataJSON() as Record<string, unknown> | null;
      (f.calls ??= []).push({ fn: fellowshipFn, args });
      const refusal = f.refuse?.[fellowshipFn];
      if (refusal) {
        return route.fulfill({
          status: 400,
          json: { message: 'no', hint: refusal, code: 'P0001' },
        });
      }
      const friends = (f.friends ??= []);
      const waiting = (f.requests ??= []);
      switch (fellowshipFn) {
        case 'my_friend_code':
          return route.fulfill({ json: 'K7QM4RXA' });
        case 'new_friend_code':
          return route.fulfill({ json: 'N3WCPDE5' });
        case 'fellowship':
          return route.fulfill({
            json: [{ ...friendCard(fakeSession().user.id, 'Adam'), me: true }, ...friends],
          });
        case 'fellowship_requests':
          return route.fulfill({ json: waiting });
        case 'fellowship_feed':
          return route.fulfill({ json: f.feed ?? [] });
        case 'answer_friend': {
          const i = waiting.findIndex((r) => r.id === args?.p_other);
          if (i >= 0) {
            const [r] = waiting.splice(i, 1);
            if (args?.p_accept) friends.push(friendCard(String(r.id), String(r.name)));
          }
          return route.fulfill({ json: null });
        }
        case 'remove_friend': {
          const i = friends.findIndex((c) => c.id === args?.p_other);
          if (i >= 0) friends.splice(i, 1);
          return route.fulfill({ json: null });
        }
        case 'fellowship_quest':
          return route.fulfill({ json: f.quest ?? null });
        case 'collect_fellowship_quest': {
          if (f.quest) {
            f.quest.collected = true;
            spent -= Number(f.quest.gold);
          }
          return route.fulfill({ json: board().gold });
        }
        case 'give_item': {
          const ware = STALL.find((w) => w.id === args?.p_item);
          if (ware) spent += ware.price;
          return route.fulfill({ json: board().gold });
        }
        case 'my_gifts':
          return route.fulfill({ json: f.gifts ?? [] });
        case 'my_challenges':
          return route.fulfill({ json: f.challenges ?? [] });
        case 'decline_challenge': {
          const c = f.challenges?.find((x) => x.id === args?.p_challenge);
          if (c) c.state = 'declined';
          return route.fulfill({ json: null });
        }
        case 'answer_challenge': {
          const c = f.challenges?.find((x) => x.id === args?.p_challenge);
          const scored = f.calls.findLast((x) => x.fn === 'record_round_score');
          const score = (scored?.args as { p_score?: number } | undefined)?.p_score ?? 0;
          if (c) {
            c.state = 'answered';
            c.to = { ...(c.to as object), score, best: score };
          }
          return route.fulfill({ json: null });
        }
        case 'send_challenge': {
          const to = friends.find((x) => x.id === args?.p_friend);
          const scored = f.calls.findLast((x) => x.fn === 'record_round_score');
          const a = scored?.args as { p_kind?: string; p_score?: number } | undefined;
          const id = `00000000-0000-4000-8000-${String((f.challenges ??= []).length + 1).padStart(12, '0')}`;
          f.challenges.unshift({
            id,
            kind: a?.p_kind ?? 'rush',
            mine: true,
            from: { id: fakeSession().user.id, name: 'Adam', score: a?.p_score ?? 0, best: null },
            to: { id: to?.id, name: to?.name, score: null, best: null },
            state: 'open',
            sent: new Date().toISOString().slice(0, 10),
          });
          return route.fulfill({ json: id });
        }
        default:
          return route.fulfill({ json: null });
      }
    }
    if (url.pathname === '/rest/v1/rpc/my_achievements') {
      return route.fulfill({
        json: {
          title,
          gems: WALLET.gems,
          achievements: ACHIEVEMENTS.map((a) => ({
            id: a.id,
            progress: extras.earned?.includes(a.id)
              ? a.condition.n
              : Math.min(a.condition.n, extras.progress?.[a.id] ?? 0),
            target: a.condition.n,
            earned_at: extras.earned?.includes(a.id) ? '2026-11-09T20:00:00Z' : null,
          })),
        },
      });
    }
    if (url.pathname === '/rest/v1/rpc/guide_mark') {
      const { p_ids } = route.request().postDataJSON() as { p_ids: string[] };
      guideSeen = [...new Set([...guideSeen, ...p_ids])].sort();
      profileUpdates.push({ guide_seen: guideSeen });
      return route.fulfill({ json: null });
    }
    if (url.pathname === '/rest/v1/rpc/set_title') {
      const { p_title } = route.request().postDataJSON() as { p_title: string };
      const mine = ACHIEVEMENTS.some((a) => a.title === p_title && extras.earned?.includes(a.id));
      if (p_title && !mine) {
        return route.fulfill({ status: 400, json: { message: 'that title is not yours yet' } });
      }
      title = p_title;
      profileUpdates.push({ title });
      return route.fulfill({ json: title });
    }
    if (url.pathname === '/rest/v1/rpc/market_today') {
      const gold = board().gold;
      const shields =
        (extras.today?.streak_shields ?? TODAY.streak_shields) +
        bought.filter((b) => b === 'streak-shield').length;
      return route.fulfill({
        json: {
          day: TODAY.day,
          wares: STALL.map((w) => ({
            ...w,
            owned:
              w.kind === 'functional'
                ? shields >= 2
                : [...(extras.owned ?? []), ...bought].includes(w.id),
            affordable: gold >= w.price,
          })),
        },
      });
    }
    if (url.pathname === '/rest/v1/rpc/buy_item') {
      const { p_item } = route.request().postDataJSON() as { p_item: string };
      const ware = STALL.find((w) => w.id === p_item);
      if (!ware) return route.fulfill({ status: 400, json: { message: 'not for sale today' } });
      const held =
        (extras.today?.streak_shields ?? TODAY.streak_shields) +
        bought.filter((b) => b === 'streak-shield').length;
      const owned =
        ware.kind === 'functional'
          ? held >= 2
          : [...(extras.owned ?? []), ...bought].includes(ware.id);
      if (owned) return route.fulfill({ status: 400, json: { message: 'already owned' } });
      if (board().gold < ware.price) {
        return route.fulfill({ status: 400, json: { message: 'too little gold' } });
      }
      bought.push(ware.id);
      spent += ware.price;
      const shields =
        (extras.today?.streak_shields ?? TODAY.streak_shields) +
        bought.filter((b) => b === 'streak-shield').length;
      return route.fulfill({
        json: {
          item: ware.id,
          wallet: { gold: board().gold, gems: WALLET.gems, streak_shields: shields },
        },
      });
    }
    if (url.pathname === '/rest/v1/owned_items') {
      return route.fulfill({
        json: [...(extras.owned ?? []), ...bought.filter((b) => b !== 'streak-shield')].map(
          (item_id) => ({ item_id }),
        ),
      });
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
      const rows = extras.licensee === false ? [] : content;
      // The deck's version check (#124): the row count and the latest change.
      if (url.searchParams.get('select') === 'updated_at') {
        return route.fulfill({
          json: rows.length ? [{ updated_at: '2026-11-01T00:00:00Z' }] : [],
          headers: {
            'Content-Range': `0-0/${rows.length}`,
            'Access-Control-Expose-Headers': 'Content-Range',
          },
        });
      }
      return route.fulfill({ json: rows });
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
    // The ledger's reads (docs/game/ledger.md): all of a subject's cards, its week, the days.
    if (
      url.pathname === '/rest/v1/review_cards' &&
      url.searchParams.get('select')?.includes('reps')
    ) {
      const subject = url.searchParams.get('subject_id')?.replace(/^eq\./, '') ?? '';
      return route.fulfill({ json: extras.ledger?.cards?.[subject] ?? [] });
    }
    if (url.pathname === '/rest/v1/review_log') {
      const subject = url.searchParams.get('subject_id')?.replace(/^eq\./, '') ?? '';
      const week = extras.ledger?.week?.[subject] ?? [];
      return route.fulfill({ json: week.map((item_id) => ({ item_id })) });
    }
    if (url.pathname === '/rest/v1/daily_activity') {
      return route.fulfill({ json: extras.ledger?.days ?? [] });
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
      // No subject asked for: the list of what was practiced, the latest save first.
      if (url.pathname === '/rest/v1/subject_progress' && !url.searchParams.has('subject_id')) {
        return route.fulfill({
          json: [...saved.keys()].reverse().map((subject_id) => ({ subject_id })),
        });
      }
      const subject = url.searchParams.get('subject_id')?.replace(/^eq\./, '') ?? '';
      const state = saved.get(subject) ?? morseState;
      if (url.pathname === '/rest/v1/subject_progress' && state) {
        const row = { xp: 0, minutes: 0, state };
        return route.fulfill({ json: single ? row : [row] });
      }
      if (url.pathname === '/rest/v1/skill_ratings' && !single) {
        const rated = Object.entries(extras.ratings?.[subject] ?? {});
        return route.fulfill({
          json: rated.map(([skill, rating]) => ({
            skill,
            rating,
            rd: 80,
            volatility: 0.06,
            games: 40,
            rated_at: new Date().toISOString(),
          })),
        });
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
      // As the database does: no id is refused, and an id seen before changes nothing.
      if (!a.p_session) {
        return route.fulfill({ status: 400, json: { message: 'a session id is required' } });
      }
      if (sessions.has(a.p_session)) {
        return route.fulfill({ json: { duplicate: true, award: null } });
      }
      sessions.add(a.p_session);
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
      const profile = {
        ...PROFILE,
        ...(extras.name !== undefined && { display_name: extras.name }),
        title,
        share_milestones: extras.fellowship?.sharing ?? true,
        guide_seen: guideSeen,
      };
      return route.fulfill({ json: single ? profile : [profile] });
    }
    if (url.pathname === '/rest/v1/wallets') {
      // supabase-js asks for a single object with this Accept header (maybeSingle).
      const wallet = { ...WALLET, gold: (extras.gold ?? WALLET.gold) - spent };
      return route.fulfill({ json: single ? wallet : [wallet] });
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
 * A deck-like word under the id of the `n`th word in a lesson's reviewed list (lesson 1 unless
 * given; content/arabic/lesson-words.json, #125): a reviewed lesson uses only listed ids.
 */
export const lessonWord = (n: number, arabic: string, english: string, lesson = 1): ContentRow => {
  const id = REVIEWS.find((r) => r.lesson === lesson)?.words[n - 1]?.deck;
  if (!id) throw new Error(`no reviewed lesson-${lesson} word number ${n}`);
  return { ...deckWord(n, arabic, english), item_id: id };
};

/**
 * A deck-like word under the id of the `n`th word on the word path (content/arabic/core-words.json):
 * the echo well draws only on the path and the reviewed lesson words.
 */
export const pathWord = (n: number, arabic: string, english: string): ContentRow => {
  // Path words that aren't also reviewed lesson words, whose Latin may be overridden.
  const reviewed = new Set(REVIEWS.flatMap((r) => r.words.map((w) => w.deck)));
  const id = WORD_CHAPTERS.flatMap((c) => c.words).filter((w) => !reviewed.has(w.deck))[n - 1]
    ?.deck;
  if (!id) throw new Error(`no word-path word number ${n}`);
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
    ([key, session, firstPage]) => {
      if (!sessionStorage.getItem('e2e-seeded')) {
        localStorage.setItem(key, JSON.stringify(session));
        // The first page (the-road.md §8) covers the square for a new player; most tests are
        // about something else, so it starts closed unless a test asks for it.
        if (!firstPage) localStorage.setItem('waymark:first-page-closed', '1');
        sessionStorage.setItem('e2e-seeded', '1');
      }
    },
    [STORAGE_KEY, fakeSession(), extras.firstPage ?? false] as const,
  );
}

/** The URL fragment Supabase puts on the links it emails (implicit flow). */
export function emailLinkFragment(type: 'invite' | 'recovery') {
  const s = fakeSession();
  return `#access_token=${s.access_token}&refresh_token=${s.refresh_token}&expires_in=3600&expires_at=${s.expires_at}&token_type=bearer&type=${type}`;
}

/** What save_session receives (supabaseStore's saveSession). */
export interface SaveSessionArgs {
  p_subject: string;
  p_session: string;
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
