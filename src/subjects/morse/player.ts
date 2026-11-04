// The Morse sound engine (#30): plays text as a keyed sine tone with the Web Audio API.
//
// - Timing is scheduled on the audio clock (never setTimeout), from timing.ts.
// - Every key-down has a short rise and fall so there are no clicks.
// - Browsers only allow sound after a tap or click: call `unlock()` from that handler (or
//   just `play()`, which unlocks too).
// - Hook for later (E16: noise, fading, interference): `route` gets the keyed tone and returns
//   the node to send to the speakers. Nothing is built for it yet.

import { newAudioContext } from '../../core/audio.ts';
import { schedule, type PlayedChar, type Speed } from './timing.ts';

/** Rise and fall of each key-down, in seconds. ~5 ms is the usual choice for click-free CW. */
export const RAMP_SECONDS = 0.005;
/** Small delay before the first tone, so the first rise isn't cut short. */
const LEAD_SECONDS = 0.05;

export interface ToneSettings extends Speed {
  /** Tone pitch in Hz. Default 600. */
  pitch?: number;
  /** 0 to 1. Default 0.5. */
  volume?: number;
}

export interface Playback {
  /** The characters that will play, with times relative to the first tone. */
  chars: PlayedChar[];
  /** Audio-clock time of the first tone. */
  startsAt: number;
  /** Resolves when the sound has finished or was stopped. */
  done: Promise<void>;
  /** Stops now, with a short fade. */
  stop(): void;
}

export interface MorsePlayerOptions {
  /** For tests or offline rendering. Default: a new AudioContext on first use. */
  context?: BaseAudioContext;
  /** E16 hook: put effects between the keyed tone and the speakers. */
  route?: (keyed: AudioNode, context: BaseAudioContext) => AudioNode;
}

export class MorsePlayer {
  private ctx?: BaseAudioContext;
  private current?: Playback;

  constructor(private readonly options: MorsePlayerOptions = {}) {
    this.ctx = options.context;
  }

  /** Call from a tap or click. Creates or resumes the audio context. */
  async unlock(): Promise<BaseAudioContext> {
    const ctx = (this.ctx ??= newAudioContext());
    // A live context starts suspended until a tap. (An offline one, for tests, is left alone.)
    const live = typeof AudioContext !== 'undefined' && ctx instanceof AudioContext;
    if (live && ctx.state === 'suspended') await ctx.resume();
    return ctx;
  }

  /** Plays text as Morse, stopping anything already playing. */
  async play(text: string, settings: ToneSettings): Promise<Playback> {
    const ctx = await this.unlock();
    this.current?.stop();

    const { pitch = 600, volume = 0.5 } = settings;
    const level = Math.min(1, Math.max(0, volume));
    const plan = schedule(text, settings);
    const startsAt = ctx.currentTime + LEAD_SECONDS;
    const ramp = RAMP_SECONDS;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = pitch;
    const key = ctx.createGain();
    key.gain.setValueAtTime(0, ctx.currentTime);
    for (const { at, dur } of plan.tones) {
      const on = startsAt + at;
      const off = on + dur;
      key.gain.setValueAtTime(0, on);
      key.gain.linearRampToValueAtTime(level, on + ramp);
      key.gain.setValueAtTime(level, off - ramp);
      key.gain.linearRampToValueAtTime(0, off);
    }
    osc.connect(key);
    const out = this.options.route?.(key, ctx) ?? key;
    out.connect(ctx.destination);

    const endsAt = startsAt + plan.duration + ramp;
    osc.start(startsAt - ramp);
    osc.stop(endsAt);

    let finish!: () => void;
    const done = new Promise<void>((resolve) => (finish = resolve));
    osc.onended = () => {
      osc.disconnect();
      key.disconnect();
      if (this.current === playback) this.current = undefined;
      finish();
    };

    const playback: Playback = {
      chars: plan.chars,
      startsAt,
      done,
      stop: () => {
        const now = ctx.currentTime;
        key.gain.cancelScheduledValues(now);
        key.gain.setValueAtTime(key.gain.value, now);
        key.gain.linearRampToValueAtTime(0, now + ramp);
        try {
          osc.stop(now + ramp);
        } catch {
          // Already stopped.
        }
      },
    };
    this.current = playback;
    return playback;
  }

  /** Stops whatever is playing. */
  stop(): void {
    this.current?.stop();
  }

  /**
   * Stops and closes the audio context this player made (browsers allow only a few at once). A
   * context passed in by the caller is left open. Playing again later makes a new one.
   */
  close(): void {
    this.stop();
    this.current = undefined;
    const own = this.ctx && this.ctx !== this.options.context ? this.ctx : undefined;
    if (own && typeof AudioContext !== 'undefined' && own instanceof AudioContext) {
      void own.close().catch(() => undefined);
    }
    if (own) this.ctx = undefined;
  }

  /** The audio clock, in seconds (0 before the first sound). Playback times use this clock. */
  now(): number {
    return this.ctx?.currentTime ?? 0;
  }
}
