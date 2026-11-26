import type { SupabaseClient } from '@supabase/supabase-js';
import { signInRefused } from '../auth/signIn.ts';

// Take your data and leave (task 10.2, #500): the player's own rows, read with their own session
// under row-level security, and deleting the account through the database (docs/process/FRIENDS.md).

/**
 * Every table a player may read their own rows from, with its whole primary key: the rows are
 * paged in that order, so a page never repeats or skips a row that ties on the first column.
 */
export const MY_TABLES: readonly (readonly [table: string, ...order: string[]])[] = [
  ['profiles', 'id'],
  ['wallets', 'user_id'],
  ['daily_activity', 'user_id', 'day'],
  ['subject_progress', 'user_id', 'subject_id'],
  ['review_cards', 'user_id', 'subject_id', 'item_id'],
  ['review_log', 'id'],
  ['skill_ratings', 'user_id', 'subject_id', 'skill'],
  ['item_ratings', 'user_id', 'subject_id', 'skill', 'item_id'],
  ['rating_log', 'id'],
  ['subject_events', 'user_id', 'day', 'subject_id', 'kind'],
  ['daily_chests', 'user_id', 'day'],
  ['daily_contracts', 'user_id', 'day', 'template_id'],
  ['chests', 'id'],
  ['owned_items', 'user_id', 'item_id'],
  ['player_achievements', 'user_id', 'achievement_id'],
  ['friend_codes', 'user_id'],
  ['homes', 'user_id', 'room'],
];
/**
 * What friends sent or are, read through the functions that show only the player's own side (the
 * tables behind them can't be read directly).
 */
const MY_CALLS = ['my_notes', 'my_gifts', 'my_challenges', 'fellowship'] as const;
/**
 * Player tables left out of the file, and why. supabase/tests/isolation.test.ts checks that every
 * player table is in MY_TABLES or here.
 */
export const NOT_INCLUDED: Record<string, string> = {
  saved_sessions: 'no one can read it',
  speech_checks: 'a daily counter',
  partner_replies: 'a daily counter',
  chat_lines: 'a daily counter; chats themselves aren’t stored',
  content_licensees: 'the licence switch',
  fellowship_limits: 'a daily counter',
  fellowship_feed: 'friends’ milestones, read through the Notice Board',
  round_scores: 'no one can read it',
  challenges: 'in the file as my_challenges',
  fellowship_quest_rewards: 'no one can read it',
  gifts: 'in the file as my_gifts',
  home_notes: 'in the file as my_notes',
  friendships: 'in the file as fellowship',
  error_log: 'our own crash log: no one can read it, and it holds nothing you typed',
};
const PAGE = 1000;

/** The player's own rows, by table (and the lists friends wrote to them). Throws if any read fails. */
export async function readMyData(client: SupabaseClient): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};
  for (const [table, ...order] of MY_TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      let query = client.from(table).select('*');
      for (const column of order) query = query.order(column);
      const { data: page, error } = await query.range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...page);
      if (page.length < PAGE) break;
    }
    data[table] = rows;
  }
  for (const call of MY_CALLS) {
    const { data: rows, error } = await client.rpc(call);
    if (error) throw error;
    data[call] = rows ?? [];
  }
  return data;
}

/** Saves `data` as one JSON file through the browser's own download. */
export function saveJson(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  // Not at once: some browsers start the download after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Set once an account is gone, so the next page shows the goodbye. */
export const GOODBYE_KEY = 'waymark:goodbye';

/** What the player must type to confirm the deletion. */
export const DELETE_WORD = 'DELETE';
/** Whether the typed word counts: exactly DELETE, in capitals (spaces around it are forgiven). */
export const deleteWordOk = (typed: string) => typed.trim() === DELETE_WORD;

/**
 * Deletes the signed-in account after asking for the password again; null when it's gone, else
 * what to tell the player. Nothing is deleted unless the password was right. There is no undo.
 */
export async function deleteAccount(
  client: SupabaseClient,
  password: string,
): Promise<string | null> {
  try {
    const { data } = await client.auth.getSession();
    const email = data.session?.user.email;
    if (!email) return 'Sign in again first, then try once more.';
    const again = await client.auth.signInWithPassword({ email, password });
    if (again.error)
      return again.error.code === 'invalid_credentials' || again.error.status === 400
        ? 'That password isn’t right.'
        : signInRefused(again.error);
    const { error } = await client.rpc('delete_my_account');
    if (error) return 'Couldn’t delete your account. Nothing was removed. Try again.';
    // The account is gone: whatever fails now must not say otherwise.
    try {
      // Read by the page that follows, which says goodbye.
      globalThis.sessionStorage?.setItem(GOODBYE_KEY, '1');
      await client.auth.signOut({ scope: 'local' });
    } catch {
      // The login is already deleted; the next page load finds no session.
    }
    return null;
  } catch {
    return 'Couldn’t reach Waymark just now. Nothing was removed. Try again.';
  }
}

/** What Settings' danger area calls, bound to the signed-in client. */
export const supabaseAccount = (client: SupabaseClient) => ({
  download: () =>
    readMyData(client).then(
      (data) => {
        saveJson(`waymark-my-data-${new Date().toISOString().slice(0, 10)}.json`, data);
        return true;
      },
      () => false,
    ),
  remove: (password: string) => deleteAccount(client, password),
});
