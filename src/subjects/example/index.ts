// A template subject, and the proof that a subject needs no platform changes (ADR 0019).
// It is not listed in src/subjects/index.ts, so it never ships. To start a real subject, copy
// this folder, give it its own id and place, and list it in the registry.
import type { SubjectApi, SubjectInfo } from '../../core/subject.ts';

export const example: SubjectInfo = {
  id: 'example',
  place: 'Example Yard',
  tagline: 'A template for new subjects',
  guildColor: 'var(--guild-morse)',
};

/** The subject's own saved state. Only this subject reads it. */
export interface ExampleState {
  drillsDone: number;
}

/** What the subject does when a drill ends: XP for right answers, time spent, its own state. */
export async function finishDrill(
  api: SubjectApi<ExampleState>,
  drill: { correct: number; minutes: number },
): Promise<void> {
  const state = (await api.loadState()) ?? { drillsDone: 0 };
  // One save for the whole session (ADR 0031): all of it is kept, or none of it.
  await api.saveSession({
    state: { drillsDone: state.drillsDone + 1 },
    xp: drill.correct * 2,
    minutes: drill.minutes,
  });
}
