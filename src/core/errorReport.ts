import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './auth/supabase.ts';

// Our own error log (task 10.1, #499; ADR 0058). A crash sends the message, the first 10 stack
// lines, the route (pathname only), the app version and the user agent. Nothing from a form or the
// page is read, and the server cuts each field again.

/** Never throws, never waits for the page, and stays quiet when signed out. */
export function reportError(error: unknown, client: SupabaseClient | null = supabase): void {
  try {
    if (!client) return;
    const e = error instanceof Error ? error : undefined;
    const args = {
      p_message: (e?.message ?? String(error)).slice(0, 500),
      p_stack: (e?.stack ?? '').split('\n').slice(0, 10).join('\n').slice(0, 4000),
      p_route: window.location.pathname,
      p_version: __APP_VERSION__,
      p_user_agent: navigator.userAgent.slice(0, 300),
    };
    void client.auth
      .getSession()
      .then(({ data }) => (data.session ? client.rpc('report_error', args) : undefined))
      .catch(() => undefined);
  } catch {
    // An error while reporting is dropped: it must never loop.
  }
}

/** Reports what nothing else caught. Returns the way to stop, for tests. */
export function watchForErrors(): () => void {
  const onError = (e: ErrorEvent) => reportError(e.error ?? e.message);
  const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
