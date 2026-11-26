import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './auth/supabase.ts';

// Our own error log (task 10.1, #499; ADR 0058). A crash sends the message, the first 10 stack
// lines, the route (pathname only), the app version and the user agent. No form or page content is
// read, and quoted text in an error is blanked out. The server cuts each field again.

/** Text in quotes may be something the player typed: keep the quotes, blank what's inside. */
const redact = (text: string) => text.replace(/(["'`]).*?\1/g, '$1…$1');
/** What this page load has sent, so one error in a loop is sent once, and 20 at most. */
const sent = new Set<string>();

/** Never throws, never waits for the page, and stays quiet when signed out. */
export function reportError(error: unknown, client: SupabaseClient | null = supabase): void {
  try {
    if (!client) return;
    const e = error instanceof Error ? error : undefined;
    const message = redact(e?.message ?? String(error)).slice(0, 500);
    if (sent.has(message) || sent.size >= 20) return;
    sent.add(message);
    const lines = redact(e?.stack ?? '')
      .split('\n')
      .slice(0, 10);
    // The first line of a stack repeats the message.
    if (lines[0]) lines[0] = lines[0].slice(0, 300);
    const args = {
      p_message: message,
      p_stack: lines.join('\n').slice(0, 4000),
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
