// The band (E16): what an operator's signal goes through on its way to you. Three effects, each
// from 0 (none) to 1 (heavy), as Web Audio nodes behind the player's `route` hook:
// - noise: filtered hiss under the tone;
// - fading (QSB): the signal swells and sinks slowly;
// - interference (QRM): another station keying faintly on a nearby pitch.
// Design: docs/game/radio-qso.md §4.

import type { PlayLife, Route } from '../player.ts';
import { schedule } from '../timing.ts';

export interface Band {
  noise: number;
  qsb: number;
  qrm: number;
}

/** What the other station on the band is sending, over and over. */
const QRM_TEXT = 'CQ TEST DE QZ8ZZ QZ8ZZ TEST';
const QRM_WPM = 24;
/** How far the interfering station is from the tone, in Hz. */
const QRM_OFFSET = 230;

/** How loud each effect is at 1, against a tone of about 0.5. */
export const LEVELS = { noise: 0.22, qsbDepth: 0.75, qrm: 0.18 };

/** The fading's gain swings between `1 - depth` and 1; `depth` grows with `qsb`. */
export const qsbDepth = (qsb: number) => Math.min(1, Math.max(0, qsb)) * LEVELS.qsbDepth;

/** Starts a source with the sound and stops it when the sound ends. */
function live(src: AudioScheduledSourceNode, life: PlayLife, lead = 0.05) {
  src.start(Math.max(0, life.startsAt - lead));
  life.onEnd(() => {
    try {
      src.stop();
    } catch {
      // Never started, or already stopped.
    }
    src.disconnect();
  });
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number, random: () => number) {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
  return buf;
}

/**
 * The route for an operator's band, around a tone at `pitch`. With no effects at all it's
 * undefined, and the tone goes straight to the speakers.
 */
export function bandRoute(
  band: Band,
  pitch = 600,
  random: () => number = Math.random,
): Route | undefined {
  if (band.noise <= 0 && band.qsb <= 0 && band.qrm <= 0) return undefined;
  return (keyed, ctx, life) => {
    const out = ctx.createGain();
    out.gain.value = 1;
    const parts: AudioNode[] = [];
    life.onEnd(() => parts.forEach((p) => p.disconnect()));

    // Fading: the tone through a gain that an LFO swings slowly.
    if (band.qsb > 0) {
      const depth = qsbDepth(band.qsb);
      const fade = ctx.createGain();
      fade.gain.value = 1 - depth / 2;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.12 + random() * 0.12;
      const swing = ctx.createGain();
      swing.gain.value = depth / 2;
      lfo.connect(swing).connect(fade.gain);
      keyed.connect(fade).connect(out);
      parts.push(fade, swing);
      live(lfo, life);
    } else {
      keyed.connect(out);
    }

    // Noise: looped white noise, narrowed around the tone like a receiver's filter.
    if (band.noise > 0) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, 2, random);
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = pitch;
      filter.Q.value = 1.2;
      const level = ctx.createGain();
      level.gain.value = Math.min(1, band.noise) * LEVELS.noise;
      src.connect(filter).connect(level).connect(out);
      parts.push(filter, level);
      live(src, life, 0.3);
    }

    // Interference: another station calling CQ at a nearby pitch, from the start, on repeat.
    if (band.qrm > 0) {
      const osc = ctx.createOscillator();
      osc.frequency.value = pitch + QRM_OFFSET;
      const key = ctx.createGain();
      key.gain.value = 0;
      const level = Math.min(1, band.qrm) * LEVELS.qrm;
      const plan = schedule(QRM_TEXT, { charWpm: QRM_WPM });
      const loop = plan.duration + 1.5;
      const from = life.startsAt - random() * loop;
      for (let t = from; t < life.endsAt; t += loop) {
        for (const { at, dur } of plan.tones) {
          const on = t + at;
          if (on < life.startsAt - 0.2 || on > life.endsAt) continue;
          key.gain.setValueAtTime(0, on);
          key.gain.linearRampToValueAtTime(level, on + 0.005);
          key.gain.setValueAtTime(level, on + dur - 0.005);
          key.gain.linearRampToValueAtTime(0, on + dur);
        }
      }
      osc.connect(key).connect(out);
      parts.push(key);
      live(osc, life, 0.3);
    }
    return out;
  };
}
