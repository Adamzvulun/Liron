import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { supabase } from './supabase.ts';
import { GateScene } from './Scenes.tsx';
import { MIN_PASSWORD, passwordProblem, passwordRefused } from './password.ts';
import { PasswordField } from './PasswordField.tsx';
import { signInRefused } from './signIn.ts';
import {
  checkInvite,
  JOIN_PROBLEM,
  joinWithInvite,
  type InviteState,
  type JoinProblem,
} from './invites.ts';
import './auth.css';

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="auth">
      <GateScene />
      <p className="auth__brand">Waymark</p>
      <section className="auth__panel" aria-labelledby="auth-title">
        <h1 id="auth-title" className="auth__title">
          {title}
        </h1>
        {children}
      </section>
    </main>
  );
}

/** Login for invited people only: sign-ups are switched off in Supabase (docs/process/SUPABASE.md). */
export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  // Signing in, or asking for a reset link: two views of one panel, sharing the email typed.
  const [view, setView] = useState<'signin' | 'reset'>('signin');
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const show = (next: 'signin' | 'reset') => {
    setView(next);
    setMessage(null);
  };

  async function signIn(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (!error) return;
    // Only a refused login means a wrong password; offline or a busy server isn't the player's
    // fault, and shouldn't send them to reset it (review, 2026-11-15).
    setMessage({ kind: 'error', text: signInRefused(error) });
  }

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    setMessage(
      error
        ? { kind: 'error', text: 'Couldn’t send the email. Try again in a while.' }
        : {
            kind: 'info',
            // Supabase's own mail reaches only the projects' owner (SUPABASE.md), so friends are
            // told who can help instead of waiting for nothing (#324).
            text: 'If an account exists for that email, we’ve sent a password reset link. Didn’t get it within a few minutes? Ask whoever invited you to reset your password.',
          },
    );
  }

  const emailField = (
    <label className="auth__label">
      Email
      <input
        className="auth__input"
        type="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="off"
        spellCheck={false}
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </label>
  );

  if (view === 'reset') {
    return (
      <Panel title="Reset your password">
        <form className="auth__form" onSubmit={sendLink}>
          <p className="auth__text auth__text--tight">
            Enter your email and we’ll send you a link to reset your password.
          </p>
          {emailField}
          <button className="auth__button" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset email'}
          </button>
          {message && <Said message={message} />}
          <button className="auth__link" type="button" onClick={() => show('signin')}>
            Back to sign in
          </button>
        </form>
      </Panel>
    );
  }

  return (
    <Panel title="Sign in">
      <form className="auth__form" onSubmit={signIn}>
        {emailField}
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />
        <button className="auth__button" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {message && <Said message={message} />}
        <button className="auth__link" type="button" onClick={() => show('reset')}>
          Forgot your password?
        </button>
        <p className="auth__hint">
          New here? Waymark is invite-only. Open the invite link you were sent, or sign in with the
          email and password you were given.
        </p>
      </form>
    </Panel>
  );
}

/** A sign-in or link message, under the button it answers. */
function Said({ message }: { message: { kind: 'error' | 'info'; text: string } }) {
  return (
    <p className={`auth__message auth__message--${message.kind}`} role="status">
      {message.text}
    </p>
  );
}

/** Shown after following an invite or reset link. */
export function SetPasswordScreen({ email, onDone }: { email?: string; onDone: () => void }) {
  const hintId = useId();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    // The same rules, and the same words, as Settings' "Change password".
    const problem = passwordProblem(password, again);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    // A password Supabase refuses says why, as Settings does (review, 2026-11-19). Other
    // refusals keep this screen's own words: "sign out and in" means nothing on an invite link.
    if (!error) onDone();
    else if (error.code === 'weak_password' || error.code === 'same_password')
      setError(passwordRefused(error.code));
    else setError('Couldn’t save the password. Try again.');
  }

  return (
    <Panel title="Set your password">
      <form className="auth__form" onSubmit={save}>
        {email && (
          <>
            <p className="auth__text auth__text--tight">
              Enter a new password for <strong className="auth__email">{email}</strong>.
            </p>
            {/* For password managers: the account the new password belongs to. */}
            <input type="email" autoComplete="username" value={email} readOnly hidden />
          </>
        )}
        <PasswordField
          label="New password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          describedBy={hintId}
          value={password}
          onChange={setPassword}
        />
        <p id={hintId} className="auth__hint">
          At least {MIN_PASSWORD} characters.
        </p>
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          value={again}
          onChange={setAgain}
        />
        <button className="auth__button" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
        {error && (
          <p className="auth__message auth__message--error" role="status">
            {error}
          </p>
        )}
      </form>
    </Panel>
  );
}

/** Leaves the join page for the sign-in screen. */
const toSignIn = () => window.location.assign('/');

/**
 * The page an invite link opens (ADR 0052): the friend chooses their own email and password,
 * the server makes the account, and they're signed in.
 */
export function JoinScreen({ code }: { code: string }) {
  const hintId = useId();
  const [state, setState] = useState<InviteState | 'checking'>('checking');
  const [from, setFrom] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState(false);

  useEffect(() => {
    let live = true;
    void checkInvite(code).then((check) => {
      if (!live) return;
      setState(check.state);
      setFrom(check.from);
    });
    return () => {
      live = false;
    };
  }, [code]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const problem = passwordProblem(password, again);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    setTaken(false);
    const refused: JoinProblem | null = await joinWithInvite({
      code,
      email: email.trim(),
      password,
    });
    if (refused) {
      setBusy(false);
      if (refused === 'used') setState('closed');
      else if (refused === 'not-set-up') setState('not-set-up');
      else {
        setError(JOIN_PROBLEM[refused]);
        setTaken(refused === 'email-taken');
      }
      return;
    }
    // The account is made: sign in with it, on the square's own address.
    window.history.replaceState(null, '', '/');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) toSignIn();
  }

  if (state === 'checking') {
    return (
      <Panel title="Create your account">
        <p className="auth__text" role="status">
          Checking your invite…
        </p>
      </Panel>
    );
  }
  if (state !== 'open') {
    const text =
      state === 'closed'
        ? JOIN_PROBLEM.used
        : state === 'not-set-up'
          ? JOIN_PROBLEM['not-set-up']
          : 'Couldn’t check your invite. Check your connection and try again.';
    return (
      <Panel title={state === 'closed' ? 'Invite link expired' : 'Create your account'}>
        <p className="auth__text">{text}</p>
        <button className="auth__link" type="button" onClick={toSignIn}>
          Go to sign in
        </button>
      </Panel>
    );
  }
  return (
    <Panel title="Create your account">
      <form className="auth__form" onSubmit={create}>
        <p className="auth__text auth__text--tight">
          {from ? (
            <>
              <strong className="auth__email">{from}</strong> invited you to Waymark.
            </>
          ) : (
            'You’ve been invited to Waymark.'
          )}
        </p>
        <label className="auth__label">
          Email
          <input
            className="auth__input"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="off"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <PasswordField
          label="Password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          describedBy={hintId}
          value={password}
          onChange={setPassword}
        />
        <p id={hintId} className="auth__hint">
          At least {MIN_PASSWORD} characters.
        </p>
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          value={again}
          onChange={setAgain}
        />
        <button className="auth__button" type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        {error && (
          <p className="auth__message auth__message--error" role="status">
            {error}
          </p>
        )}
        <button className="auth__link" type="button" onClick={toSignIn}>
          {taken ? 'Sign in' : 'Already have an account? Sign in'}
        </button>
      </form>
    </Panel>
  );
}

/** The build has no Supabase settings (e.g. a fresh local checkout without `.env.local`). */
export function NotConfiguredScreen({ missing }: { missing: string[] }) {
  return (
    <Panel title="Not set up yet">
      <p className="auth__text">This copy of Waymark has no login settings. Missing:</p>
      <ul className="auth__text">
        {missing.map((m) => (
          <li key={m}>
            <code>{m}</code>
          </li>
        ))}
      </ul>
      <p className="auth__text">See docs/process/SUPABASE.md.</p>
    </Panel>
  );
}
