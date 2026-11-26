import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

/**
 * The address link previews load the card from: apps want it whole. Vercel names the live
 * site's shortest address (its own domain once there is one) at build time; elsewhere the
 * card's path stays relative.
 */
export const siteUrl = (env: Record<string, string | undefined> = process.env) =>
  env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '';

// A regular responsive website: no PWA plugin, no service worker (ADR 0005).
export default defineConfig({
  // The error log says which release a crash came from (ADR 0058).
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('%SITE%', siteUrl()) },
  ],
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'supabase/tests/**/*.test.ts', 'tests/**/*.test.ts'],
    // `npm run coverage` (ADR 0030): a report to read, not a gate.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts'],
      reporter: ['text-summary', 'html'],
    },
  },
});
