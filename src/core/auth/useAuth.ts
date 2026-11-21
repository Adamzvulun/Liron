import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { needsNewPassword } from './config.ts';
import { supabase } from './supabase.ts';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'setPassword'; session: Session }
  | { status: 'signedIn'; session: Session };

/** Tracks the login state. Links from invite or reset emails lead to the "Set your password" step. */
export function useAuth(): [AuthState, () => void] {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  // Read once at start-up, before supabase-js clears the token fragment from the URL.
  const wantsPassword = useRef(needsNewPassword(window.location.hash));

  useEffect(() => {
    if (!supabase) return;
    const apply = (session: Session | null) => {
      if (!session) setState({ status: 'signedOut' });
      else if (wantsPassword.current) setState({ status: 'setPassword', session });
      else setState({ status: 'signedIn', session });
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') wantsPassword.current = true;
      apply(session);
    });
    void supabase.auth.getSession().then(({ data: { session } }) => apply(session));
    return () => data.subscription.unsubscribe();
  }, []);

  const passwordChosen = useCallback(() => {
    wantsPassword.current = false;
    setState((s) => (s.status === 'setPassword' ? { status: 'signedIn', session: s.session } : s));
  }, []);

  return [state, passwordChosen];
}
