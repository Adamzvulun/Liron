// The questline tracker's data (ADR 0032, #47): each started subject's questline status, read
// from its own saved state. The platform shows the status and never looks inside the state.
import { useEffect, useState } from 'react';
import type { QuestlineStatus, SubjectInfo } from '../subject.ts';

export type Questlines = ReadonlyMap<string, QuestlineStatus>;

/**
 * Asks every subject that has a questline where it stands. A subject whose state or status
 * fails to load is left out, so the board falls back to its plain line.
 */
export async function loadQuestlines(
  subjects: readonly SubjectInfo[],
  loadState: (subjectId: string) => Promise<unknown>,
): Promise<Questlines> {
  const found = await Promise.all(
    subjects.map(async (s) => {
      if (!s.questStatus) return null;
      try {
        const status = await s.questStatus(await loadState(s.id));
        return status ? ([s.id, status] as const) : null;
      } catch {
        return null;
      }
    }),
  );
  return new Map(found.filter((f) => f !== null));
}

/** The questlines, loaded again whenever `when` changes (e.g. on coming back to the square). */
export function useQuestlines(
  subjects: readonly SubjectInfo[],
  loadState: (subjectId: string) => Promise<unknown>,
  when: unknown,
): Questlines {
  const [questlines, setQuestlines] = useState<Questlines>(new Map());
  useEffect(() => {
    let live = true;
    void loadQuestlines(subjects, loadState).then((q) => live && setQuestlines(q));
    return () => {
      live = false;
    };
  }, [subjects, loadState, when]);
  return questlines;
}
