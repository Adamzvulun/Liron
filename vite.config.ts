import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A regular responsive website: no PWA plugin, no service worker (ADR 0005).
export default defineConfig({
  plugins: [react()],
});
