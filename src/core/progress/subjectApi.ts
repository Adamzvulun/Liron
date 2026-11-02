import { SUBJECT_ID, type ReviewStatus, type SubjectApi, type SubjectInfo } from '../subject.ts';
import { phaseOf, scheduleReview, type StoredCard } from '../srs/scheduler.ts';
import type { Award, ProgressStore } from './store.ts';

const MAX_XP = 10_000; // per call; the same limits are enforced again in the database
const MAX_MINUTES = 240;
const MAX_DUE = 500;

const checkItemId = (itemId: string) => {
  if (typeof itemId !== 'string' || itemId.length < 1 || itemId.length > 128) {
    throw new RangeError(`Item ids are 1-128 characters, got "${String(itemId)}"`);
  }
};

const statusOf = (card: StoredCard): ReviewStatus => ({
  due: new Date(String(card.due)),
  phase: phaseOf(card),
  reps: Number(card.reps ?? 0),
  lapses: Number(card.lapses ?? 0),
});

/**
 * Builds the API the platform hands to one subject, bound to that subject's id.
 * `onAward` lets the platform update the HUD and celebrate level-ups.
 */
export function subjectApi<State extends object>(
  subject: Pick<SubjectInfo, 'id'>,
  store: ProgressStore,
  onAward: (award: Award) => void = () => {},
): SubjectApi<State> {
  const id = subject.id;
  if (!SUBJECT_ID.test(id)) throw new Error(`Invalid subject id: "${id}"`);
  return {
    subjectId: id,
    async awardXP(amount) {
      if (!Number.isInteger(amount) || amount < 1 || amount > MAX_XP) {
        throw new RangeError(`awardXP: expected a whole number from 1 to ${MAX_XP}, got ${amount}`);
      }
      onAward(await store.record(id, amount, 0));
    },
    async recordPractice(minutes) {
      if (!Number.isFinite(minutes) || minutes < 0 || minutes > MAX_MINUTES) {
        throw new RangeError(
          `recordPractice: expected 0 to ${MAX_MINUTES} minutes, got ${minutes}`,
        );
      }
      const whole = Math.round(minutes);
      if (whole > 0) onAward(await store.record(id, 0, whole));
    },
    progressSummary: () => store.summary(id),
    loadState: () => store.loadState(id) as Promise<State | null>,
    async saveState(state) {
      if (state === null || typeof state !== 'object' || Array.isArray(state)) {
        throw new TypeError('saveState: state must be a plain object');
      }
      await store.saveState(id, state);
    },
    async recordReview(itemId, grade, at = new Date()) {
      checkItemId(itemId);
      const stored = (await store.reviewCards(id, [itemId])).get(itemId) ?? null;
      const review = scheduleReview(stored, grade, at);
      await store.saveReview(id, itemId, review, at);
      return statusOf(review.card);
    },
    async dueItems({ limit = 50, now = new Date() } = {}) {
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_DUE) {
        throw new RangeError(`dueItems: limit is 1 to ${MAX_DUE}, got ${limit}`);
      }
      return store.dueCards(id, now, limit);
    },
    async reviewStatus(itemIds) {
      itemIds.forEach(checkItemId);
      const cards = await store.reviewCards(id, itemIds);
      return new Map([...cards].map(([item, card]) => [item, statusOf(card)]));
    },
  };
}
