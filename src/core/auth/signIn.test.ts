import { describe, expect, it } from 'vitest';
import { signInRefused } from './signIn.ts';

describe('a refused sign-in (review, 2026-11-19)', () => {
  it('says what went wrong, and sends only a wrong password to the reset link', () => {
    expect(signInRefused({ code: 'invalid_credentials', status: 400 })).toBe(
      'Incorrect email or password.',
    );
    expect(signInRefused({ status: 400 })).toBe('Incorrect email or password.');
    expect(signInRefused({ code: 'email_not_confirmed', status: 400 })).toMatch(/isn’t confirmed/);
    expect(signInRefused({ status: 429 })).toMatch(/Too many tries/);
    expect(signInRefused({ code: 'validation_failed', status: 400 })).toMatch(/email address/);
    expect(signInRefused({ status: 0 })).toMatch(/Couldn’t reach Waymark/);
    expect(signInRefused({ status: 500 })).toMatch(/Couldn’t reach Waymark/);
  });
});
