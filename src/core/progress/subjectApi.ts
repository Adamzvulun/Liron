import { SUBJECT_ID, type SubjectApi, type SubjectInfo } from '../subject.ts';
import type { ProgressStore } from './store.ts';

const MAX_XP = 10_000; // per call; the same limits are enforced again in the database
const MAX_MINUTES = 240;

/** Builds the API the platform hands to one subject, bound to that subject's id. */
export function subjectApi<State extends object>(
  subject: Pick<SubjectInfo, 'id'>,
  store: ProgressStore,
): SubjectApi<State> {
  const id = subject.id;
  if (!SUBJECT_ID.test(id)) throw new Error(`Invalid subject id: "${id}"`);
  return {
    subjectId: id,
    async awardXP(amount) {
      if (!Number.isInteger(amount) || amount < 1 || amount > MAX_XP) {
        throw new RangeError(`awardXP: expected a whole number from 1 to ${MAX_XP}, got ${amount}`);
      }
      await store.record(id, amount, 0);
    },
    async recordPractice(minutes) {
      if (!Number.isFinite(minutes) || minutes < 0 || minutes > MAX_MINUTES) {
        throw new RangeError(
          `recordPractice: expected 0 to ${MAX_MINUTES} minutes, got ${minutes}`,
        );
      }
      const whole = Math.round(minutes);
      if (whole > 0) await store.record(id, 0, whole);
    },
    progressSummary: () => store.summary(id),
    loadState: () => store.loadState(id) as Promise<State | null>,
    async saveState(state) {
      if (state === null || typeof state !== 'object' || Array.isArray(state)) {
        throw new TypeError('saveState: state must be a plain object');
      }
      await store.saveState(id, state);
    },
  };
}
