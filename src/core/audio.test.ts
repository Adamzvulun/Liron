import { describe, expect, it } from 'vitest';
import { preferPlayback } from './audio.ts';

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
