import { describe, expect, it, vi } from 'vitest';
import { MorsePlayer, RAMP_SECONDS } from './player.ts';

/** A stand-in for the Web Audio API that records what was scheduled. */
function fakeContext(currentTime = 1) {
  const calls: [string, number, number?][] = [];
  const param = {
    value: 0,
    setValueAtTime: (v: number, t: number) => calls.push(['set', v, t]),
    linearRampToValueAtTime: (v: number, t: number) => calls.push(['ramp', v, t]),
    cancelScheduledValues: (t: number) => calls.push(['cancel', t]),
  };
  const osc = {
    type: '',
    frequency: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as null | (() => void),
  };
  const gain = { gain: param, connect: vi.fn(), disconnect: vi.fn() };
  const ctx = {
    currentTime,
    destination: { name: 'speakers' },
    createOscillator: () => osc,
    createGain: () => gain,
  };
  return { ctx: ctx as unknown as BaseAudioContext, osc, gain, calls };
}

describe('MorsePlayer', () => {
  it('schedules each key-down on the audio clock with click-free ramps', async () => {
    const { ctx, osc, calls } = fakeContext(1);
    const player = new MorsePlayer({ context: ctx });
    const playback = await player.play('E', { charWpm: 20, pitch: 700, volume: 0.4 });

    expect(osc.frequency.value).toBe(700);
    const on = playback.startsAt;
    expect(on).toBeGreaterThan(1);
    // E is one dit (60 ms): silent, rise, hold, fall.
    expect(calls.slice(1)).toEqual([
      ['set', 0, on],
      ['ramp', 0.4, on + RAMP_SECONDS],
      ['set', 0.4, expect.closeTo(on + 0.06 - RAMP_SECONDS)],
      ['ramp', 0, expect.closeTo(on + 0.06)],
    ]);
    expect(osc.start).toHaveBeenCalledWith(on - RAMP_SECONDS);
    expect(osc.stop).toHaveBeenCalledWith(expect.closeTo(on + 0.06 + RAMP_SECONDS));
  });

  it('resolves `done` when the sound ends', async () => {
    const { ctx, osc } = fakeContext();
    const playback = await new MorsePlayer({ context: ctx }).play('K', { charWpm: 20 });
    osc.onended?.();
    await expect(playback.done).resolves.toBeUndefined();
    expect(playback.chars.map((c) => c.char)).toEqual(['K']);
  });

  it('fades out on stop', async () => {
    const { ctx, calls, osc } = fakeContext(2);
    const player = new MorsePlayer({ context: ctx });
    await player.play('MM', { charWpm: 20 });
    calls.length = 0;
    player.stop();
    expect(calls).toEqual([
      ['cancel', 2],
      ['set', 0, 2],
      ['ramp', 0, 2 + RAMP_SECONDS],
    ]);
    expect(osc.stop).toHaveBeenLastCalledWith(2 + RAMP_SECONDS);
  });

  it('sends the keyed tone through the effects hook when given one', async () => {
    const { ctx, gain } = fakeContext();
    const effect = { connect: vi.fn() };
    const route = vi.fn(() => effect as unknown as AudioNode);
    await new MorsePlayer({ context: ctx, route }).play('E', { charWpm: 20 });
    expect(route).toHaveBeenCalledWith(gain, ctx);
    expect(effect.connect).toHaveBeenCalledWith(ctx.destination);
    expect(gain.connect).not.toHaveBeenCalled();
  });
});
