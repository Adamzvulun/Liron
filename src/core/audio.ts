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

/**
 * If a context is still suspended (made a moment after the tap, as a drill's first sound is, which
 * iPhone Safari may refuse), the next tap or key press resumes it, so the sound starts instead of
 * staying silent (review, 2026-11-15).
 */
export function resumeOnGesture(ctx: AudioContext, target: EventTarget = globalThis): void {
  if (ctx.state !== 'suspended' || typeof target.addEventListener !== 'function') return;
  const events = ['pointerdown', 'keydown', 'touchend'] as const;
  const resume = () => {
    for (const e of events) target.removeEventListener(e, resume, true);
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  };
  for (const e of events) target.addEventListener(e, resume, true);
}

/** A live audio context for sound you can hear, made after a tap or key press. */
export function newAudioContext(options?: AudioContextOptions): AudioContext {
  preferPlayback();
  const ctx = new AudioContext(options);
  resumeOnGesture(ctx);
  return ctx;
}
