import { SUBJECT_ID, type ReviewStatus, type SubjectApi, type SubjectInfo } from '../subject.ts';
import type { StoredRating } from '../rating/ratings.ts';
import type { Item, Lesson } from '../content/schema.ts';
import { phaseOf, type StoredCard } from '../srs/grades.ts';

/** ts-fsrs loads with the first review saved, not with the square (#137). */
const loadScheduler = () => import('../srs/scheduler.ts');
import { rateResult, toSkillRating } from '../rating/ratings.ts';
import type { Award, ProgressStore, SessionWrite } from './store.ts';
import type { ContentSource } from '../content/privateContent.ts';
import { PartnerError, type PartnerSource } from '../partner.ts';
import { SpeechError, type SpeechSource } from '../speech.ts';
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
/** At most this many media links in one `mediaUrls` request. */
export const MAX_MEDIA_LINKS = 100;
/** Per session; the database enforces the same limits (ADR 0031). */
const MAX_SESSION_ITEMS = 200;
/** Events a session may report, and the most of one kind at once (as the database). */
const MAX_EVENTS = 50;
const MAX_EVENT_COUNT = 100;

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
  speech: SpeechSource | null = null,
  partner: PartnerSource | null = null,
): SubjectApi<State> {
  const packs = new Map<string, Promise<{ items: Item[]; lessons: Lesson[] }>>();
  // The private media each loaded pack names: a subject may only link files its own content names
  // (ADR 0019; security review L2).
  const named = new Map<string, Promise<Set<string>>>();
  const id = subject.id;
  if (!SUBJECT_ID.test(id)) throw new Error(`Invalid subject id: "${id}"`);
  const skills = subject.skills;
  for (const skill of skills ?? []) {
    if (!SUBJECT_ID.test(skill)) throw new Error(`Invalid skill id: "${skill}"`);
  }
  const checkScore = (score: number) => {
    if (typeof score !== 'number' || !(score >= 0 && score <= 1)) {
      throw new RangeError(`recordResult: score is 0 to 1, got ${score}`);
    }
  };
  const checkSeed = (itemSeed: number | undefined) => {
    if (itemSeed !== undefined && !(Number.isFinite(itemSeed) && Math.abs(itemSeed) < 5000)) {
      throw new RangeError(`recordResult: itemSeed must be a sane rating, got ${itemSeed}`);
    }
  };
  const checkSkill = (skill: string) => {
    if (typeof skill !== 'string' || !SUBJECT_ID.test(skill)) {
      throw new RangeError(`Invalid skill id: "${String(skill)}"`);
    }
    if (skills && !skills.includes(skill)) {
      throw new RangeError(`${id} has no skill "${skill}" (it has: ${skills.join(', ')})`);
    }
  };
  /** The content source, once `path` is checked: a safe path some loaded pack of ours names. */
  const checkedSource = (path: string): Promise<ContentSource> => {
    if (!Media.shape.path.safeParse(path).success || path.split('/').includes('..')) {
      return Promise.reject(new RangeError(`Invalid media path: "${String(path)}"`));
    }
    if (!content) return Promise.reject(new Error('No content source in this app'));
    const source = content;
    return Promise.allSettled(named.values()).then((sets) => {
      if (!sets.some((r) => r.status === 'fulfilled' && r.value.has(path))) {
        throw new RangeError(`${id}'s content doesn't name "${path}"`);
      }
      return source;
    });
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
    async saveSession({
      state,
      reviews = [],
      results = [],
      events = [],
      xp = 0,
      minutes = 0,
      at = new Date(),
      sessionId = crypto.randomUUID(),
    }) {
      // Checked up front, so a bad report sends nothing at all.
      if (
        state !== undefined &&
        (state === null || typeof state !== 'object' || Array.isArray(state))
      ) {
        throw new TypeError('saveSession: state must be a plain object');
      }
      if (reviews.length > MAX_SESSION_ITEMS || results.length > MAX_SESSION_ITEMS) {
        throw new RangeError(`saveSession: at most ${MAX_SESSION_ITEMS} reviews and results`);
      }
      reviews.forEach((r) => checkItemId(r.itemId));
      for (const r of results) {
        checkSkill(r.skill);
        checkItemId(r.itemId);
        checkScore(r.score);
        checkSeed(r.itemSeed);
      }
      if (events.length > MAX_EVENTS) {
        throw new RangeError(`saveSession: at most ${MAX_EVENTS} events`);
      }
      for (const { kind, count = 1 } of events) {
        if (!SUBJECT_ID.test(kind)) throw new TypeError(`saveSession: bad event kind "${kind}"`);
        if (!Number.isInteger(count) || count < 1 || count > MAX_EVENT_COUNT) {
          throw new RangeError(
            `saveSession: an event counts 1 to ${MAX_EVENT_COUNT}, got ${count}`,
          );
        }
      }
      if (!Number.isInteger(xp) || xp < 0 || xp > MAX_XP) {
        throw new RangeError(`saveSession: xp is a whole number from 0 to ${MAX_XP}, got ${xp}`);
      }
      if (!Number.isFinite(minutes) || minutes < 0) {
        throw new RangeError(`saveSession: expected 0 or more minutes, got ${minutes}`);
      }

      // One read per kind, then each answer builds on the one before it, in memory.
      const skillsUsed = [...new Set(results.map((r) => r.skill))];
      const [cards, learners, ...itemsBySkill] = await Promise.all([
        reviews.length
          ? store.reviewCards(id, [...new Set(reviews.map((r) => r.itemId))])
          : Promise.resolve(new Map<string, StoredCard>()),
        results.length ? store.skillRatings(id) : Promise.resolve(new Map<string, StoredRating>()),
        ...skillsUsed.map((skill) =>
          store.itemRatings(id, skill, [
            ...new Set(results.filter((r) => r.skill === skill).map((r) => r.itemId)),
          ]),
        ),
      ]);
      const items = new Map(skillsUsed.map((skill, i) => [skill, itemsBySkill[i] ?? new Map()]));

      const write: SessionWrite = {
        sessionId,
        state: state ?? null,
        reviews: [],
        results: [],
        xp,
        minutes: Math.round(Math.min(minutes, MAX_MINUTES)),
        events: events.map(({ kind, count = 1 }) => ({ kind, count })),
      };
      if (reviews.length) {
        const { scheduleReview } = await loadScheduler();
        for (const { itemId, grade } of reviews) {
          const review = scheduleReview(cards.get(itemId) ?? null, grade, at);
          cards.set(itemId, review.card);
          write.reviews.push({ itemId, review, reviewedAt: at });
        }
      }
      for (const { skill, itemId, score, itemSeed } of results) {
        const skillItems = items.get(skill) ?? new Map<string, StoredRating>();
        const rated = rateResult(
          learners.get(skill) ?? null,
          skillItems.get(itemId) ?? null,
          score,
          at,
          itemSeed,
        );
        learners.set(skill, rated.learner);
        skillItems.set(itemId, rated.item);
        write.results.push({ skill, itemId, score, learner: rated.learner, item: rated.item });
      }
      const { award } = await store.saveSession(id, write);
      if (award) onAward(award);
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
      const { scheduleReview } = await loadScheduler();
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
      checkScore(score);
      checkSeed(itemSeed);
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
        pack.catch(() => {
          packs.delete(source);
          named.delete(source);
        });
        packs.set(source, pack);
        named.set(
          source,
          pack.then(
            ({ items }) =>
              new Set(
                items.flatMap((i) =>
                  i.media.filter((m) => m.store === 'private').map((m) => m.path),
                ),
              ),
            // A pack that failed to load names nothing (its failure is the caller's to handle).
            () => new Set<string>(),
          ),
        );
      }
      return pack;
    },
    mediaUrl(path) {
      return checkedSource(path).then((source) => source.mediaUrl(path));
    },
    mediaUrls(paths) {
      if (paths.length > MAX_MEDIA_LINKS) {
        return Promise.reject(new RangeError(`mediaUrls: at most ${MAX_MEDIA_LINKS} at a time`));
      }
      const unique = [...new Set(paths)];
      return Promise.all(unique.map(checkedSource)).then(async ([source]) => {
        if (!source) return new Map<string, string>();
        if (source.mediaUrls) return source.mediaUrls(unique);
        const urls = await Promise.all(unique.map((p) => source.mediaUrl(p)));
        return new Map(unique.map((p, i) => [p, urls[i] ?? '']));
      });
    },
    transcribe(audio) {
      if (!speech) return Promise.reject(new SpeechError('not-set-up'));
      return speech.transcribe(audio);
    },
    partner(ask) {
      if (!partner) return Promise.reject(new PartnerError('not-set-up'));
      return partner.reply(ask);
    },
  };
}
