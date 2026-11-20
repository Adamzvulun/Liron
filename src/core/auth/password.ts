// Choosing and changing a password (ADR 0016; task 2.3, #324). The rules live here so the
// "Set your password" screen and Settings say the same thing.

export const MIN_PASSWORD = 8;
/** Supabase keeps at most 72 bytes of a password (bcrypt); a longer one can't be used. */
export const MAX_PASSWORD_BYTES = 72;

/** What's wrong with a new password before it's sent, or null if nothing is. */
export function passwordProblem(password: string, again: string): string | null {
  if (password.length < MIN_PASSWORD)
    return `Password must be at least ${MIN_PASSWORD} characters.`;
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES)
    return 'Password is too long. Use a shorter one.';
  if (password !== again) return 'Passwords do not match.';
  return null;
}

/** What to tell the player when Supabase refuses a new password (its error codes). */
export function passwordRefused(code: string | undefined): string {
  switch (code) {
    case 'same_password':
      return 'That’s your password already. Pick a new one.';
    case 'weak_password':
      return 'That password is too easy to guess. Try a longer one.';
    case 'reauthentication_needed':
    case 'session_expired':
    case 'session_not_found':
      return 'Sign out and in again, then change it.';
    default:
      return 'Couldn’t change the password. Try again.';
  }
}
