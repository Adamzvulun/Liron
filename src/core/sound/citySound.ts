// The city's synthesizer (task 4.6, docs/design/sound.md): every sound is made here with Web Audio,
// like the Morse tones, so there are no audio files and no licenses. Loaded on the first tap.
//
// Unlike the lessons, these sounds don't ask iPhone to play through the silent switch: a click
// or a chime should go quiet when the phone is set to silent.

import { resumeOnGesture } from '../audio.ts';
import type { Ambient, Cue, SoundSettings } from './sound.ts';

/** One bell-like note: a sine and a quieter octave, struck and left to ring. */
export interface Note {
  /** Seconds after the cue starts. */
  at: number;
  hz: number;
  /** Seconds to ring. */
  ring: number;
  gain: number;
}

/** The notes of each cue. Gentle and short: a game you open every day mustn't nag. */
export const CUES: Record<Exclude<Cue, 'tap'>, Note[]> = {
  // A fifth, like a small bell on a shop door.
  reward: [
    { at: 0, hz: 880, ring: 0.7, gain: 0.07 },
    { at: 0.09, hz: 1318.5, ring: 0.9, gain: 0.06 },
  ],
  // Up a major arpeggio to the octave.
  levelUp: [
    { at: 0, hz: 523.25, ring: 0.6, gain: 0.07 },
    { at: 0.11, hz: 659.25, ring: 0.6, gain: 0.07 },
    { at: 0.22, hz: 783.99, ring: 0.7, gain: 0.07 },
    { at: 0.36, hz: 1046.5, ring: 1.2, gain: 0.08 },
  ],
  // One soft bell, as a lamp is lit.
  step: [{ at: 0, hz: 783.99, ring: 0.8, gain: 0.06 }],
};

/** The click: a short wooden tick, falling in pitch. */
export const TAP = { from: 620, to: 440, seconds: 0.045, gain: 0.05 };

/**
 * Each place's bed of sound: noise shaped by a filter, swelling slowly. Very quiet: it's there
 * to make the place feel inhabited, not to be listened to.
 */
export const BEDS: Record<
  Ambient,
  { type: BiquadFilterType; hz: number; q: number; gain: number; swell: number }
> = {
  // The fountain: running water.
  square: { type: 'bandpass', hz: 1400, q: 0.6, gain: 0.03, swell: 0.13 },
  // The notice board stands on the square.
  board: { type: 'bandpass', hz: 1400, q: 0.6, gain: 0.025, swell: 0.13 },
  // The hearth: a low, warm rumble.
  house: { type: 'lowpass', hz: 320, q: 0.7, gain: 0.05, swell: 0.07 },
  // The market: a murmur of voices far off.
  market: { type: 'bandpass', hz: 480, q: 1.2, gain: 0.035, swell: 0.21 },
};

/** Seconds a bed takes to come in, and to go. */
export const FADE_IN = 1.5;
export const FADE_OUT = 0.8;

let ctx: BaseAudioContext | null = null;
let out: GainNode | null = null;
let bed: { name: Ambient; stop: () => void } | null = null;

/** Makes the context: called from inside the player's first tap. */
export function start(context?: BaseAudioContext) {
  if (ctx) return;
  if (context) ctx = context;
  else {
    const live = new AudioContext();
    resumeOnGesture(live);
    ctx = live;
  }
  out = ctx.createGain();
  out.gain.value = 1;
  out.connect(ctx.destination);
}

function bell(n: Note, t0: number) {
  if (!ctx || !out) return;
  const t = t0 + n.at;
  for (const [mult, share] of [
    [1, 1],
    [2, 0.25],
  ] as const) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = n.hz * mult;
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(n.gain * share, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + n.ring);
    osc.connect(amp);
    amp.connect(out);
    osc.start(t);
    osc.stop(t + n.ring + 0.05);
    osc.onended = () => amp.disconnect();
  }
}

/** Plays one cue now. */
export function cue(kind: Cue) {
  if (!ctx || !out) return;
  const t0 = ctx.currentTime + 0.01;
  if (kind !== 'tap') {
    for (const n of CUES[kind]) bell(n, t0);
    return;
  }
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(TAP.from, t0);
  osc.frequency.exponentialRampToValueAtTime(TAP.to, t0 + TAP.seconds);
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(TAP.gain, t0 + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + TAP.seconds);
  osc.connect(amp);
  amp.connect(out);
  osc.start(t0);
  osc.stop(t0 + TAP.seconds + 0.02);
  osc.onended = () => amp.disconnect();
}

function noise(c: BaseAudioContext): AudioBuffer {
  const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 1;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }
  return buffer;
}

function startBed(name: Ambient) {
  if (!ctx || !out) return null;
  const c = ctx;
  const b = BEDS[name];
  const src = c.createBufferSource();
  src.buffer = noise(c);
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = b.type;
  filter.frequency.value = b.hz;
  filter.Q.value = b.q;
  const amp = c.createGain();
  const now = c.currentTime;
  amp.gain.setValueAtTime(0, now);
  amp.gain.linearRampToValueAtTime(b.gain, now + FADE_IN);
  // A slow swell, so the bed breathes instead of hissing. It sways its own stage, before the
  // fade, so the fades start and end at silence (review, 2026-11-19).
  const swell = c.createGain();
  swell.gain.value = 1;
  const lfo = c.createOscillator();
  const depth = c.createGain();
  lfo.frequency.value = b.swell;
  depth.gain.value = 0.35;
  lfo.connect(depth);
  depth.connect(swell.gain);
  src.connect(filter);
  filter.connect(swell);
  swell.connect(amp);
  amp.connect(out);
  src.start(now);
  lfo.start(now);
  return () => {
    const t = c.currentTime;
    amp.gain.cancelScheduledValues(t);
    amp.gain.setValueAtTime(amp.gain.value, t);
    amp.gain.linearRampToValueAtTime(0, t + FADE_OUT);
    src.stop(t + FADE_OUT + 0.05);
    lfo.stop(t + FADE_OUT + 0.05);
    src.onended = () => amp.disconnect();
  };
}

/** Brings the bed in line with the switches and the place: starts, swaps or stops it. */
export function apply(settings: SoundSettings, place: Ambient | null) {
  const want = settings.ambient ? place : null;
  if (bed?.name === want) return;
  bed?.stop();
  bed = null;
  if (!want) return;
  const stop = startBed(want);
  if (stop) bed = { name: want, stop };
}

/** The bed playing now, for tests. */
export const playing = () => bed?.name ?? null;

/** For tests: forget the context. */
export function resetForTests() {
  bed = null;
  ctx = null;
  out = null;
}
