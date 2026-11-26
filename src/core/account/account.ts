import type { SupabaseClient } from '@supabase/supabase-js';
import { signInRefused } from '../auth/signIn.ts';

// Take your data and leave (task 10.2, #500): the player's own rows, read with their own session
// under row-level security, and deleting the account through the database (docs/process/FRIENDS.md).

/**
 * Every table a player may read their own rows from, with a column to page by. Chat lines and
 * saved sessions aren't here: the server keeps only a daily count of the first and no one reads
 * the second. supabase/tests/delete-account.test.ts keeps the delete in step with the tables.
 */
export const MY_TABLES: readonly (readonly [table: string, order: string])[] = [
  ['profiles', 'id'],
  ['wallets', 'user_id'],
  ['daily_activity', 'day'],
  ['subject_progress', 'subject_id'],
  ['review_cards', 'item_id'],
  ['review_log', 'id'],
  ['skill_ratings', 'skill'],
  ['item_ratings', 'item_id'],
  ['rating_log', 'id'],
  ['subject_events', 'day'],
  ['daily_chests', 'day'],
  ['daily_contracts', 'day'],
  ['chests', 'id'],
  ['owned_items', 'item_id'],
  ['player_achievements', 'achievement_id'],
  ['friend_codes', 'code'],
  ['homes', 'room'],
];
/** What friends sent, read through the functions that show only the player's own side. */
const MY_CALLS = ['my_notes', 'my_gifts', 'my_challenges'] as const;
const PAGE = 1000;

/** The player's own rows, by table (and the three lists friends wrote to them). Throws if any read fails. */
export async function readMyData(client: SupabaseClient): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};
  for (const [table, order] of MY_TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data: page, error } = await client
        .from(table)
        .select('*')
        .order(order)
        .range(from, from + PAGE - 1);
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
  URL.revokeObjectURL(url);
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
    if (again.error) return signInRefused(again.error);
    const { error } = await client.rpc('delete_my_account');
    if (error) return 'Couldn’t delete your account. Nothing was removed. Try again.';
    // Read by the signed-out page that follows, which says goodbye instead of "welcome back".
    globalThis.sessionStorage?.setItem(GOODBYE_KEY, '1');
    await client.auth.signOut({ scope: 'local' });
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
