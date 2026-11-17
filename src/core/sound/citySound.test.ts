import { afterEach, describe, expect, it, vi } from 'vitest';
import { apply, BEDS, CUES, cue, playing, resetForTests, start, TAP } from './citySound.ts';

// The city's synthesizer (task 4.6): what each cue and bed schedules on a stand-in context.

function fakeContext() {
  const made: string[] = [];
  const started: number[] = [];
  const peaks: number[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn((v: number) => peaks.push(v)),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  const node = (kind: string) => {
    made.push(kind);
    return {
      gain: param(),
      frequency: param(),
      Q: param(),
      type: '',
      buffer: null,
      loop: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn((t: number) => started.push(t)),
      stop: vi.fn(),
      onended: null,
    };
  };
  const ctx = {
    currentTime: 5,
    sampleRate: 8000,
    destination: {},
    createGain: () => node('gain'),
    createOscillator: () => node('osc'),
    createBiquadFilter: () => node('filter'),
    createBufferSource: () => node('noise'),
    createBuffer: (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) }),
  };
  return { ctx: ctx as unknown as BaseAudioContext, made, started, peaks };
}

afterEach(() => resetForTests());

describe('cues', () => {
  it('a click is one short tone, quieter than any chime', () => {
    const f = fakeContext();
    start(f.ctx);
    f.made.length = 0;
    cue('tap');
    expect(f.made.filter((m) => m === 'osc')).toHaveLength(1);
    expect(Math.max(...f.peaks)).toBe(TAP.gain);
    const loudest = Math.max(...Object.values(CUES).flatMap((ns) => ns.map((n) => n.gain)));
    expect(TAP.gain).toBeLessThan(loudest);
  });

  it('each note of a chime rings as a tone and its octave, in order', () => {
    const f = fakeContext();
    start(f.ctx);
    cue('levelUp');
    expect(f.made.filter((m) => m === 'osc')).toHaveLength(CUES.levelUp.length * 2);
    const at = [...new Set(f.started)].map((t) => +(t - 5.01).toFixed(3));
    expect(at).toEqual(CUES.levelUp.map((n) => n.at));
  });

  it('nothing plays before start', () => {
    expect(() => cue('reward')).not.toThrow();
  });

  it('every sound is gentle: no note above a tenth of full volume', () => {
    const all = [TAP.gain, ...Object.values(CUES).flatMap((ns) => ns.map((n) => n.gain))];
    expect(Math.max(...all)).toBeLessThanOrEqual(0.1);
    expect(Math.max(...Object.values(BEDS).map((b) => b.gain))).toBeLessThanOrEqual(0.05);
  });
});

describe('the beds', () => {
  it('plays the place only while the switch is on, and swaps on a move', () => {
    const f = fakeContext();
    start(f.ctx);
    apply({ effects: true, ambient: false }, 'square');
    expect(playing()).toBeNull();
    apply({ effects: true, ambient: true }, 'square');
    expect(playing()).toBe('square');
    expect(f.peaks).toContain(BEDS.square.gain);
    apply({ effects: true, ambient: true }, 'house');
    expect(playing()).toBe('house');
    apply({ effects: true, ambient: true }, null);
    expect(playing()).toBeNull();
    apply({ effects: true, ambient: true }, 'market');
    apply({ effects: true, ambient: false }, 'market');
    expect(playing()).toBeNull();
  });
});
