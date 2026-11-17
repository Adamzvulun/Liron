import { describe, expect, it, vi } from 'vitest';
import type { InnTurn } from '../../../core/partner.ts';
import type { SubjectApi } from '../../../core/subject.ts';
import { NEW_PROGRESS } from '../progress.ts';
import { OWN_SENTENCES } from '../core/ownSentences.ts';
import {
  FINALE_STORY,
  finaleOpen,
  guestPage,
  PAGE_LINES,
  pageRead,
  pickStranger,
  readVerdict,
  reportFinale,
  STORY_LINES,
  storyPassed,
  STRANGERS,
} from './stranger.ts';

const met = [...OWN_SENTENCES.keys()];
const lines = (n: number): InnTurn[] =>
  Array.from({ length: n * 2 }, (_, i) => ({
    who: i % 2 === 0 ? 'them' : 'you',
    text: 'كلام',
  }));
const yes = { understood: true, answered: true, keptGoing: true, why: '' };

describe('The Stranger at the Gate (tasks 4.2 and 4.3)', () => {
  it('tells its whole story from content, with strangers whose names fit the slate', () => {
    for (const v of Object.values(FINALE_STORY)) expect(v.length).toBeGreaterThan(0);
    expect(STRANGERS.length).toBeGreaterThanOrEqual(6);
    for (const s of STRANGERS) {
      expect(s.latin).not.toBe('');
      expect(s.hebrew).toMatch(/^[֐-׿]+$/);
      expect(s.arabic).toMatch(/^[ء-ي]+$/);
    }
  });

  it('writes the page from our own sentences only, for words you have met', () => {
    const page = guestPage(met, OWN_SENTENCES, () => 0.3);
    expect(page).toHaveLength(PAGE_LINES);
    const ours = new Set([...OWN_SENTENCES.values()].map((s) => s.arabic));
    for (const l of page ?? []) {
      expect(ours.has(l.arabic)).toBe(true);
      expect(l.choices).toContain(l.english);
      expect(new Set(l.choices).size).toBe(l.choices.length);
      expect(l.choices.length).toBeGreaterThanOrEqual(2);
    }
    // Too few words met: no page yet.
    expect(guestPage(met.slice(0, 3), OWN_SENTENCES)).toBeNull();
  });

  it('counts the lines read right', () => {
    const page = guestPage(met, OWN_SENTENCES, () => 0.5) ?? [];
    const right = page.map((l) => l.english);
    expect(pageRead(page, right)).toBe(PAGE_LINES);
    expect(pageRead(page, ['nope', ...right.slice(1)])).toBe(PAGE_LINES - 1);
  });

  it('picks a stranger', () => {
    expect(pickStranger(() => 0)).toBe(STRANGERS[0]);
    expect(pickStranger(() => 0.999)).toBe(STRANGERS.at(-1));
  });

  it('reads only a whole verdict', () => {
    expect(readVerdict(JSON.stringify(yes))).toEqual(yes);
    expect(readVerdict('{"understood":true}')).toBeNull();
    expect(readVerdict('not json')).toBeNull();
  });

  it('passes on all three parts and enough lines of yours', () => {
    expect(storyPassed(yes, lines(STORY_LINES))).toBe(true);
    expect(storyPassed(yes, lines(STORY_LINES - 1))).toBe(false);
    expect(storyPassed({ ...yes, keptGoing: false }, lines(8))).toBe(false);
  });

  it('opens for a Storyteller only', () => {
    expect(finaleOpen(NEW_PROGRESS)).toBe(false);
    expect(finaleOpen({ ...NEW_PROGRESS, ranks: ['guest', 'storyteller'] })).toBe(true);
  });

  it('sends its event on the first pass only', async () => {
    const saveSession = vi.fn().mockResolvedValue(undefined);
    const api = { saveSession } as unknown as SubjectApi;
    const after = await reportFinale(api, NEW_PROGRESS, true, 600);
    expect(after.finale).toBe(true);
    expect(saveSession.mock.calls[0]?.[0]).toMatchObject({
      xp: 120,
      events: [{ kind: 'trial-stranger-at-the-gate' }],
    });
    await reportFinale(api, after, true, 600);
    expect(saveSession.mock.calls[1]?.[0]).toMatchObject({ xp: 10, events: [] });
  });
});
