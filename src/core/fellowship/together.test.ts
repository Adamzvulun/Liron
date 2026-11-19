import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  giftProblem,
  questLine,
  questUnit,
  readGift,
  readQuest,
  supabaseTogether,
  TogetherError,
} from './together.ts';

const raw = {
  id: 'inn-talk',
  metric: 'event',
  subject: 'arabic',
  target: 10,
  gold: 40,
  week: '2026-11-16',
  total: 7,
  mine: 3,
  collected: false,
};

describe('readQuest', () => {
  it('reads the database’s quest', () => {
    expect(readQuest(raw)).toEqual({
      id: 'inn-talk',
      metric: 'event',
      target: 10,
      gold: 40,
      week: '2026-11-16',
      total: 7,
      mine: 3,
      collected: false,
    });
  });

  it('reads nothing, or nonsense, as no quest, and bad numbers as none', () => {
    expect(readQuest(null)).toBeNull();
    expect(readQuest({ ...raw, metric: 'votes' })).toBeNull();
    expect(readQuest({ ...raw, total: -4, target: 0 })).toMatchObject({ total: 0, target: 1 });
  });
});

describe('the words', () => {
  it('says each quest as a thing to do together', () => {
    expect(questLine({ id: 'inn-talk', metric: 'event', target: 10 })).toBe(
      'Have 10 chats at the inn between you',
    );
    expect(questLine({ id: 'together-hours', metric: 'minutes', target: 600 })).toBe(
      'Learn for 10 hours between you',
    );
    expect(questLine({ id: 'new-one', metric: 'minutes', target: 90 })).toBe(
      'Learn for 90 minutes between you',
    );
    expect(questUnit({ metric: 'minutes' })).toBe('minutes');
  });

  it('names the friend when a gift can’t go', () => {
    expect(giftProblem(new TogetherError('owned'), 'Basma')).toBe('Basma already has it.');
    expect(giftProblem(new Error('down'), 'Basma')).toMatch(/couldn’t be sent/);
  });
});

describe('readGift', () => {
  it('reads a gift, and gives a nameless giver a name', () => {
    const g = { id: 3, from: 'x', name: '', item: 'cloak', day: '2026-11-17' };
    expect(readGift(g)).toEqual({ ...g, name: 'A traveler' });
    expect(readGift({ ...g, id: 'three' })).toBeNull();
  });
});

describe('supabaseTogether', () => {
  it('maps the database’s hints to problems', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: 'no', hint: 'owned' } }));
    const source = supabaseTogether({ rpc } as unknown as SupabaseClient);
    await expect(source.give('b', 'cloak')).rejects.toMatchObject({ problem: 'owned' });
    expect(rpc).toHaveBeenCalledWith('give_item', { p_friend: 'b', p_item: 'cloak' });
  });

  it('returns the gold after collecting', async () => {
    const rpc = vi.fn(async () => ({ data: 1039, error: null }));
    expect(await supabaseTogether({ rpc } as unknown as SupabaseClient).collect()).toBe(1039);
  });

  it('calls an odd answer a failure, never a purse of 0 (review, 2026-11-19)', async () => {
    for (const data of [null, '1039', -5]) {
      const rpc = vi.fn(async () => ({ data, error: null }));
      const source = supabaseTogether({ rpc } as unknown as SupabaseClient);
      await expect(source.collect()).rejects.toMatchObject({ problem: 'failed' });
      await expect(source.give('b', 'cloak')).rejects.toMatchObject({ problem: 'failed' });
    }
  });
});
