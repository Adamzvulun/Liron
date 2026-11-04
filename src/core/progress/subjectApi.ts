import { SUBJECT_ID, type ReviewStatus, type SubjectApi, type SubjectInfo } from '../subject.ts';
import type { Item, Lesson } from '../content/schema.ts';
import { phaseOf, scheduleReview, type StoredCard } from '../srs/scheduler.ts';
import { rateResult, toSkillRating } from '../rating/ratings.ts';
import type { Award, ProgressStore } from './store.ts';
import type { ContentSource } from '../content/privateContent.ts';
import { ContentPack, Media } from '../content/schema.ts';

const MAX_XP = 10_000; // per call; the same limits are enforced again in the database
const MAX_MINUTES = 240;
const MAX_DUE = 500;

const checkItemId = (itemId: string) => {
  if (typeof itemId !== 'string' || itemId.length < 1 || itemId.length > 128) {
    throw new RangeError(`Item ids are 1-128 characters, got "${String(itemId)}"`);
  }
};

const MAX_RATED_ITEMS = 500;

const statusOf = (card: StoredCard): ReviewStatus => ({
  due: new Date(String(card.due)),
  phase: phaseOf(card),
  reps: Number(card.reps ?? 0),
  lapses: Number(card.lapses ?? 0),
});

/**
 * Builds the API the platform hands to one subject, bound to that subject's id.
 * `onAward` lets the platform update the HUD and celebrate level-ups. `content` serves the
 * subject's private content; without it, asking for content fails.
 */
export function subjectApi<State extends object>(
  subject: Pick<SubjectInfo, 'id' | 'skills'>,
  store: ProgressStore,
  onAward: (award: Award) => void = () => {},
  content: ContentSource | null = null,
): SubjectApi<State> {
  const packs = new Map<string, Promise<{ items: Item[]; lessons: Lesson[] }>>();
  const id = subject.id;
  if (!SUBJECT_ID.test(id)) throw new Error(`Invalid subject id: "${id}"`);
  const skills = subject.skills;
  for (const skill of skills ?? []) {
    if (!SUBJECT_ID.test(skill)) throw new Error(`Invalid skill id: "${skill}"`);
  }
  const checkSkill = (skill: string) => {
    if (typeof skill !== 'string' || !SUBJECT_ID.test(skill)) {
      throw new RangeError(`Invalid skill id: "${String(skill)}"`);
    }
    if (skills && !skills.includes(skill)) {
      throw new RangeError(`${id} has no skill "${skill}" (it has: ${skills.join(', ')})`);
    }
  };
  return {
    subjectId: id,
    async awardXP(amount) {
      if (!Number.isInteger(amount) || amount < 1 || amount > MAX_XP) {
        throw new RangeError(`awardXP: expected a whole number from 1 to ${MAX_XP}, got ${amount}`);
      }
      onAward(await store.record(id, amount, 0));
    },
    async recordPractice(minutes) {
      if (!Number.isFinite(minutes) || minutes < 0) {
        throw new RangeError(`recordPractice: expected 0 or more minutes, got ${minutes}`);
      }
      // A screen left open for hours counts as the most one call may report, so the rest of
      // the save (state, reviews, XP) isn't reported as failed (2026-11-04 QA review, B6).
      const whole = Math.round(Math.min(minutes, MAX_MINUTES));
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
    async recordResult(skill, itemId, score, { at = new Date(), itemSeed } = {}) {
      checkSkill(skill);
      checkItemId(itemId);
      if (typeof score !== 'number' || !(score >= 0 && score <= 1)) {
        throw new RangeError(`recordResult: score is 0 to 1, got ${score}`);
      }
      if (itemSeed !== undefined && !(Number.isFinite(itemSeed) && Math.abs(itemSeed) < 5000)) {
        throw new RangeError(`recordResult: itemSeed must be a sane rating, got ${itemSeed}`);
      }
      const [learners, items] = await Promise.all([
        store.skillRatings(id),
        store.itemRatings(id, skill, [itemId]),
      ]);
      const rated = rateResult(
        learners.get(skill) ?? null,
        items.get(itemId) ?? null,
        score,
        at,
        itemSeed,
      );
      await store.saveResult(id, skill, itemId, score, rated.learner, rated.item);
      return { learner: toSkillRating(rated.learner, at), item: toSkillRating(rated.item, at) };
    },
    async skillRatings() {
      const now = new Date();
      const stored = await store.skillRatings(id);
      return new Map([...stored].map(([skill, r]) => [skill, toSkillRating(r, now)]));
    },
    async itemRatings(skill, itemIds) {
      checkSkill(skill);
      itemIds.forEach(checkItemId);
      if (itemIds.length > MAX_RATED_ITEMS) {
        throw new RangeError(`itemRatings: at most ${MAX_RATED_ITEMS} items at a time`);
      }
      const now = new Date();
      const stored = await store.itemRatings(id, skill, itemIds);
      return new Map([...stored].map(([item, r]) => [item, toSkillRating(r, now)]));
    },
    privateContent(source) {
      if (!ContentPack.shape.source.safeParse(source).success) {
        return Promise.reject(new RangeError(`Invalid content source: "${String(source)}"`));
      }
      if (!content) return Promise.reject(new Error('No content source in this app'));
      let pack = packs.get(source);
      if (!pack) {
        pack = content.pack(id, source);
        // A failed load isn't kept, so the next ask tries again.
        pack.catch(() => packs.delete(source));
        packs.set(source, pack);
      }
      return pack;
    },
    mediaUrl(path) {
      if (!Media.shape.path.safeParse(path).success || path.split('/').includes('..')) {
        return Promise.reject(new RangeError(`Invalid media path: "${String(path)}"`));
      }
      if (!content) return Promise.reject(new Error('No content source in this app'));
      return content.mediaUrl(path);
    },
  };
}
