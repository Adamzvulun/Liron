import { describe, expect, it } from 'vitest';
import { KEEP_MARKS, Playback, WIRE_DELAY_MS } from './playback.ts';

describe('playing a friend’s key (task 3.6)', () => {
  it('keeps the friend’s rhythm a fixed delay behind, whatever the network did', () => {
    const p = new Playback();
    // Keyed at 0, 60, 120, 300 ms; arrived with 40 to 120 ms of jitter.
    expect(p.at({ down: true, t: 0 }, 1000)).toBe(1000 + WIRE_DELAY_MS);
    expect(p.at({ down: false, t: 60 }, 1180)).toBe(1060 + WIRE_DELAY_MS);
    expect(p.at({ down: true, t: 120 }, 1160)).toBe(1120 + WIRE_DELAY_MS);
    expect(p.at({ down: false, t: 300 }, 1340)).toBe(1300 + WIRE_DELAY_MS);
  });

  it('a message later than the delay plays at once, and moves the delay on', () => {
    const p = new Playback();
    p.at({ down: true, t: 0 }, 0);
    expect(p.at({ down: false, t: 100 }, 900)).toBe(900);
    // The next edge keeps its gap from that one.
    expect(p.at({ down: true, t: 160 }, 920)).toBe(960);
  });

  it('never plays out of order', () => {
    const p = new Playback();
    p.at({ down: true, t: 500 }, 0);
    // The friend started over: their clock went back to 0.
    expect(p.at({ down: false, t: 0 }, 10)).toBeGreaterThanOrEqual(WIRE_DELAY_MS);
  });

  it('turns edges into marks for the strip and the decoder', () => {
    const p = new Playback();
    p.sound({ down: true, t: 0 }, 100);
    expect(p.held).toBe(100);
    expect(p.sound({ down: false, t: 60 }, 160)).toEqual([{ down: 100, up: 160 }]);
    // An up with no down before it is ignored.
    expect(p.sound({ down: false, t: 90 }, 190)).toHaveLength(1);
    expect(p.held).toBeNull();
  });
});

describe('a long evening on the wire (review, 2026-11-19)', () => {
  const key = (p: Playback, at: number, ms = 60) => {
    p.sound({ down: true, t: 0 }, at);
    return p.sound({ down: false, t: 0 }, at + ms);
  };

  it('keeps at most KEEP_MARKS, letting the oldest go from a pause', () => {
    const p = new Playback();
    let t = 0;
    let marks: readonly { down: number; up: number }[] = [];
    // Words of 10 marks, 2 s apart.
    for (let word = 0; word < 60; word++) {
      for (let i = 0; i < 10; i++) {
        marks = key(p, t);
        t += 120;
      }
      t += 2_000;
    }
    expect(marks.length).toBeLessThanOrEqual(KEEP_MARKS);
    expect(marks.length).toBeGreaterThan(KEEP_MARKS - 10);
    // It starts at a word, not inside one.
    expect(marks.length % 10).toBe(0);
  });

  it('still cuts when nobody ever pauses', () => {
    const p = new Playback();
    let marks: readonly { down: number; up: number }[] = [];
    for (let i = 0; i < KEEP_MARKS * 2; i++) marks = key(p, i * 120);
    expect(marks.length).toBeLessThanOrEqual(KEEP_MARKS);
  });
});
