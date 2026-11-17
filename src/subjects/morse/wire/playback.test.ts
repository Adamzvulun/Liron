import { describe, expect, it } from 'vitest';
import { Playback, WIRE_DELAY_MS } from './playback.ts';

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
