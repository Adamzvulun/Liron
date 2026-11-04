// One way to make sound for every subject. On iPhone, Safari treats web audio as "ambient" by
// default, so the ring/silent switch mutes it, and Morse tones go quiet with no hint why. Safari
// 16.4+ has the Audio Session API: asking for "playback" plays through the switch, like a music
// app. Other browsers don't have it (and don't need it), so it's feature-detected.

interface AudioSessionNavigator {
  audioSession?: { type: string };
}

/** Asks the browser to treat our sound as playback, not ambient (iOS silent switch). */
export function preferPlayback(nav: unknown = globalThis.navigator): void {
  const session = (nav as AudioSessionNavigator | undefined)?.audioSession;
  if (!session) return;
  try {
    session.type = 'playback';
  } catch {
    // An unknown value or a locked session: keep the browser's default.
  }
}

/** A live audio context for sound you can hear, made after a tap or key press. */
export function newAudioContext(options?: AudioContextOptions): AudioContext {
  preferPlayback();
  return new AudioContext(options);
}
