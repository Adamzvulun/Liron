import { describe, expect, it, vi } from 'vitest';
import { preferPlayback, resumeOnGesture } from './audio.ts';

describe('preferPlayback (iOS silent switch)', () => {
  it('asks Safari for a playback session', () => {
    const nav = { audioSession: { type: 'auto' } };
    preferPlayback(nav);
    expect(nav.audioSession.type).toBe('playback');
  });

  it('does nothing where there is no Audio Session API', () => {
    expect(() => preferPlayback({})).not.toThrow();
    expect(() => preferPlayback(undefined)).not.toThrow();
  });

  it('keeps the default if the browser refuses', () => {
    const nav = {
      audioSession: {
        get type() {
          return 'auto';
        },
        set type(_: string) {
          throw new TypeError('locked');
        },
      },
    };
    expect(() => preferPlayback(nav)).not.toThrow();
  });
});

describe('resumeOnGesture (review, 2026-11-15)', () => {
  it('resumes a suspended context on the next tap, once', async () => {
    const target = new EventTarget();
    let resumed = 0;
    const ctx = {
      state: 'suspended',
      resume: async () => {
        resumed += 1;
        ctx.state = 'running';
      },
    };
    resumeOnGesture(ctx as unknown as AudioContext, target);
    target.dispatchEvent(new Event('pointerdown'));
    target.dispatchEvent(new Event('keydown'));
    await Promise.resolve();
    expect(resumed).toBe(1);
  });

  it('leaves a running context alone', () => {
    const target = new EventTarget();
    const ctx = { state: 'running', resume: vi.fn() };
    resumeOnGesture(ctx as unknown as AudioContext, target);
    target.dispatchEvent(new Event('pointerdown'));
    expect(ctx.resume).not.toHaveBeenCalled();
  });
});
