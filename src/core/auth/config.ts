export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export type ConfigResult = { ok: true; config: SupabaseConfig } | { ok: false; missing: string[] };

/** Reads the Supabase settings from Vite's env, and names whatever is missing. */
export function readSupabaseConfig(env: {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}): ConfigResult {
  const url = env.VITE_SUPABASE_URL?.trim() ?? '';
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  const missing: string[] = [];
  if (!url) missing.push('VITE_SUPABASE_URL');
  if (!publishableKey) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, config: { url, publishableKey } };
}

/**
 * Supabase puts `type=invite` or `type=recovery` in the URL fragment of the links it emails.
 * Both mean "this person needs to choose a password now".
 */
export function needsNewPassword(hash: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const type = params.get('type');
  return type === 'invite' || type === 'recovery';
}
