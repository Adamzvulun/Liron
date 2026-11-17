import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readSupabaseConfig } from './config.ts';

const result = readSupabaseConfig(import.meta.env);

/**
 * The one Supabase client for the app, or null when the build has no Supabase settings.
 * Defaults (checked in auth-js 2.118): the session persists in localStorage, tokens refresh
 * automatically, and links from emails are read from the URL.
 */
export const supabase: SupabaseClient | null = result.ok
  ? createClient(result.config.url, result.config.publishableKey)
  : null;

export const missingConfig: string[] = result.ok ? [] : result.missing;
