/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Production and Preview use different projects (ADR 0015). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable key (`sb_publishable_…`). Public by design; Row Level Security guards data. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** package.json's version, set at build time (vite.config.ts). */
declare const __APP_VERSION__: string;
