import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// A regular responsive website: no PWA plugin, no service worker (ADR 0005).
export default defineConfig({
  plugins: [react()],
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
