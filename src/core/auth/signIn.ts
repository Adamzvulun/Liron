// Signing in (ADR 0016): what the player is told when it doesn't work.

/**
 * What a refused sign-in tells the player. Only a refused login means a wrong password; offline
 * or a busy server isn't the player's fault, and shouldn't send them to reset it (review,
 * 2026-11-15). An unconfirmed account and too many tries say so (review, 2026-11-19).
 */
export function signInRefused(error: { code?: string; status?: number }): string {
  if (error.code === 'email_not_confirmed')
    return 'This account isn’t confirmed yet. Open the invite email first.';
  if (error.status === 429 || error.code === 'over_request_rate_limit')
    return 'Too many tries. Wait a minute, then try again.';
  if (error.code === 'validation_failed') return 'Check the email address.';
  if (error.code === 'invalid_credentials' || error.status === 400)
    return 'That email and password don’t match.';
  return 'Couldn’t reach Waymark just now. Check your connection and try again.';
}
