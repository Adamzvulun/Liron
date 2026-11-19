import type { SupabaseClient } from '@supabase/supabase-js';

// Invite links (ADR 0052): the link an inviter sends, and joining with it. The server side is
// api/join.ts and the database's invite functions (20270110000000_invite_links.sql).

/** Where an invite link leads: the join page, with the code in the fragment (never sent to a server log). */
export const inviteLink = (origin: string, code: string) => `${origin}/join#${code}`;

/** The code in a join page's fragment, or null if there isn't one. */
export function inviteCode(path: string, hash: string): string | null {
  if (!/^\/join\/?$/.test(path)) return null;
  return /^#?([0-9a-f]{64})$/i.exec(hash)?.[1]?.toLowerCase() ?? null;
}

/** Making links, for an inviter's Settings. */
export interface InviteSource {
  /** Whether this player may make links. */
  canInvite(): Promise<boolean>;
  /** Whether this site can make accounts from links (its server has the secret key). */
  ready(): Promise<boolean>;
  /** A new link's code; throws `InviteError` when it can't. */
  make(): Promise<string>;
}

export class InviteError extends Error {
  constructor(readonly reason: 'full' | 'failed') {
    super(`invite ${reason}`);
  }
}

/** Making links through the database's own functions; only an inviter may. */
export const supabaseInvites = (client: SupabaseClient): InviteSource => ({
  canInvite: async () => {
    const { data, error } = await client.rpc('can_invite');
    return !error && data === true;
  },
  // A code that can't be real: the answer says only whether the server is set up.
  ready: async () => (await checkInvite('0'.repeat(64))) !== 'not-set-up',
  make: async () => {
    const { data, error } = await client.rpc('make_invite');
    if (error || typeof data !== 'string')
      throw new InviteError(error?.hint === 'full' ? 'full' : 'failed');
    return data;
  },
});

export type InviteState = 'open' | 'closed' | 'not-set-up' | 'failed';
export type JoinProblem = 'used' | 'email-taken' | 'weak-password' | 'not-set-up' | 'failed';

const post = async (body: object, fetchFn: typeof fetch) => {
  const res = await fetchFn('/api/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const answer = (await res.json().catch(() => ({}))) as {
    open?: unknown;
    ok?: unknown;
    error?: unknown;
  };
  return { res, answer };
};

/** Whether a link can still be used. */
export async function checkInvite(
  code: string,
  fetchFn: typeof fetch = fetch,
): Promise<InviteState> {
  try {
    const { res, answer } = await post({ action: 'check', code }, fetchFn);
    if (answer.error === 'not-set-up') return 'not-set-up';
    if (!res.ok) return 'failed';
    return answer.open === true ? 'open' : 'closed';
  } catch {
    return 'failed';
  }
}

const PROBLEMS: readonly JoinProblem[] = ['used', 'email-taken', 'weak-password', 'not-set-up'];

/** Makes the account; null when it's made, else what went wrong. */
export async function joinWithInvite(
  join: { code: string; email: string; password: string },
  fetchFn: typeof fetch = fetch,
): Promise<JoinProblem | null> {
  try {
    const { res, answer } = await post({ action: 'join', ...join }, fetchFn);
    if (res.ok && answer.ok === true) return null;
    return PROBLEMS.find((p) => p === answer.error) ?? 'failed';
  } catch {
    return 'failed';
  }
}

/** What the join page says for each problem. */
export const JOIN_PROBLEM: Record<JoinProblem, string> = {
  used: 'This invite link has expired or has already been used. Ask for a new one.',
  'email-taken': 'An account with this email already exists. Sign in instead.',
  'weak-password': 'That password is too easy to guess. Try a longer one.',
  'not-set-up': 'Invites aren’t set up on this site yet.',
  failed: 'Couldn’t create your account. Try again.',
};
