import { describe, expect, it } from 'vitest';
import { needsNewPassword, readSupabaseConfig } from './config.ts';

describe('readSupabaseConfig', () => {
  it('returns the config when both values are set', () => {
    expect(
      readSupabaseConfig({
        VITE_SUPABASE_URL: ' https://abc.supabase.co ',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
      }),
    ).toEqual({
      ok: true,
      config: { url: 'https://abc.supabase.co', publishableKey: 'sb_publishable_x' },
    });
  });

  it('names every missing value', () => {
    expect(readSupabaseConfig({})).toEqual({
      ok: false,
      missing: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'],
    });
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co' })).toEqual({
      ok: false,
      missing: ['VITE_SUPABASE_PUBLISHABLE_KEY'],
    });
  });
});

describe('needsNewPassword', () => {
  it('is true for invite and recovery links', () => {
    expect(needsNewPassword('#access_token=a&type=invite')).toBe(true);
    expect(needsNewPassword('#access_token=a&type=recovery')).toBe(true);
  });

  it('is false otherwise', () => {
    expect(needsNewPassword('')).toBe(false);
    expect(needsNewPassword('#access_token=a&type=magiclink')).toBe(false);
  });
});
