import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

// The CSP's outside hosts (task 15.1, #523; ADR 0059): YouTube's player is the only thing the
// browser loads from elsewhere. Gemini, LRCLIB and oEmbed are called server-side, so
// connect-src stays on Supabase. A host added or dropped fails here.
const vercel = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'vercel.json'), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const csp =
  vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy')
    ?.value ?? '';
const directives = Object.fromEntries(
  csp.split(';').map((d) => {
    const [name = '', ...sources] = d.trim().split(/\s+/);
    return [name, sources];
  }),
);
const outside = (name: string) =>
  (directives[name] ?? []).filter((s) => s.startsWith('https://') || s.startsWith('wss://'));

it('lets in exactly the hosts each directive needs', () => {
  expect(outside('script-src')).toEqual(['https://www.youtube.com']);
  expect(outside('frame-src')).toEqual(['https://www.youtube-nocookie.com']);
  expect(outside('img-src')).toEqual(['https://i.ytimg.com']);
  expect(outside('connect-src')).toEqual(['https://*.supabase.co', 'wss://*.supabase.co']);
  expect(outside('media-src')).toEqual(['https://*.supabase.co']);
  expect(outside('default-src')).toEqual([]);
  expect(directives['frame-ancestors']).toEqual(["'none'"]);
});
