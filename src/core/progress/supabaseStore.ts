import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProgressStore } from './store.ts';

/**
 * Progress kept in Supabase. Writes go through the database functions from ADR 0019, which
 * update the subject, today's activity and the wallet in one transaction. Reads rely on
 * row-level security: a user only ever sees their own rows.
 */
export function supabaseStore(client: SupabaseClient): ProgressStore {
  const row = async (subjectId: string) => {
    const { data, error } = await client
      .from('subject_progress')
      .select('xp, minutes, state')
      .eq('subject_id', subjectId)
      .maybeSingle<{ xp: number; minutes: number; state: object }>();
    if (error) throw new Error(`Couldn't read ${subjectId} progress: ${error.message}`);
    return data;
  };
  return {
    async record(subjectId, xp, minutes) {
      const { error } = await client.rpc('record_progress', {
        p_subject: subjectId,
        p_xp: xp,
        p_minutes: minutes,
      });
      if (error) throw new Error(`Couldn't save ${subjectId} progress: ${error.message}`);
    },
    async summary(subjectId) {
      const data = await row(subjectId);
      return { xp: Number(data?.xp ?? 0), minutes: data?.minutes ?? 0 };
    },
    async loadState(subjectId) {
      const data = await row(subjectId);
      // A row can exist with the default empty state; that means "never saved".
      return data && Object.keys(data.state).length > 0 ? data.state : null;
    },
    async saveState(subjectId, state) {
      const { error } = await client.rpc('save_subject_state', {
        p_subject: subjectId,
        p_state: state,
      });
      if (error) throw new Error(`Couldn't save ${subjectId} state: ${error.message}`);
    },
  };
}
