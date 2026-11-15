import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { supabase } from './supabase.ts';
import './auth.css';

const MIN_PASSWORD = 8;

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="auth">
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
  // Where the message came from: it shows under the control that was used.
  const [message, setMessage] = useState<{
    kind: 'error' | 'info';
    text: string;
    from: 'signin' | 'link';
  } | null>(null);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (!error) return;
    // Only a refused login means a wrong password; offline or a busy server isn't the player's
    // fault, and shouldn't send them to reset it (review, 2026-11-15).
    const wrong = error.code === 'invalid_credentials' || error.status === 400;
    setMessage({
      kind: 'error',
      from: 'signin',
      text: wrong
        ? 'That email and password don’t match.'
        : 'Couldn’t reach Waymark just now. Check your connection and try again.',
    });
  }

  async function sendLink() {
    if (!supabase) return;
    if (!email) {
      setMessage({ kind: 'error', from: 'link', text: 'Type your email first.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    setMessage(
      error
        ? { kind: 'error', from: 'link', text: 'Couldn’t send the email. Try again in a while.' }
        : {
            kind: 'info',
            from: 'link',
            text: 'If that email has an account, a link is on its way.',
          },
    );
  }

  return (
    <Panel title="Sign in">
      <form className="auth__form" onSubmit={signIn}>
        <label className="auth__label">
          Email
          <input
            className="auth__input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="auth__label">
          Password
          <input
            className="auth__input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="auth__button" type="submit" disabled={busy}>
          Enter Waymark
        </button>
        {message?.from === 'signin' && <Said message={message} />}
        <button className="auth__link" type="button" onClick={sendLink} disabled={busy}>
          First time, or forgot your password?
          <span className="auth__link-action">Email me a link.</span>
        </button>
        {message?.from === 'link' && <Said message={message} />}
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
export function SetPasswordScreen({ onDone }: { onDone: () => void }) {
  const hintId = useId();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError('Couldn’t save the password. Try again.');
    else onDone();
  }

  return (
    <Panel title="Choose a password">
      <form className="auth__form" onSubmit={save}>
        <label className="auth__label">
          New password
          <input
            className="auth__input"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            aria-describedby={hintId}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <p id={hintId} className="auth__hint">
          At least {MIN_PASSWORD} characters.
        </p>
        <button className="auth__button" type="submit" disabled={busy}>
          Save and enter
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
