import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD, passwordProblem, passwordRefused } from './password.ts';

describe('changing a password (#324)', () => {
  it('asks for at least the minimum length, typed the same twice', () => {
    expect(passwordProblem('short', 'short')).toBe(
      `Password must be at least ${MIN_PASSWORD} characters.`,
    );
    expect(passwordProblem('long enough', 'long enougj')).toBe('Passwords do not match.');
    expect(passwordProblem('long enough', 'long enough')).toBeNull();
  });

  it('says what to do for each refusal, and something useful for the rest', () => {
    expect(passwordRefused('same_password')).toMatch(/already/);
    expect(passwordRefused('weak_password')).toMatch(/longer/);
    expect(passwordRefused('reauthentication_needed')).toMatch(/Sign out and in again/);
    expect(passwordRefused(undefined)).toBe('Couldn’t change the password. Try again.');
  });
});
