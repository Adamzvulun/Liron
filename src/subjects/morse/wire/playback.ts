// Playing a friend's key on the wire (task 3.6, ADR 0046). Each edge comes with the friend's own
// clock; it plays a fixed short delay behind, so a message that arrives a little late still
// keeps the rhythm. A message later than the delay stretches that one gap and moves the delay
// on, rather than squeezing or reordering what was keyed.

import type { Mark } from '../send/decoder.ts';
import type { KeyEdge } from '../../../core/fellowship/wire.ts';

/** How far behind the friend's key you hear it. */
export const WIRE_DELAY_MS = 250;

export class Playback {
  private offset: number | null = null;
  private lastAt = -Infinity;
  private downAt: number | null = null;
  private readonly marks: Mark[] = [];

  /** When to play `edge`, on this side's clock, given that it arrived at `now`. */
  at(edge: KeyEdge, now: number): number {
    if (this.offset === null) this.offset = now - edge.t + WIRE_DELAY_MS;
    let at = edge.t + this.offset;
    if (at < now) {
      this.offset += now - at;
      at = now;
    }
    at = Math.max(at, this.lastAt);
    this.lastAt = at;
    return at;
  }

  /** Records an edge as it sounds, for the strip and the decoder. Returns the marks so far. */
  sound(edge: KeyEdge, at: number): readonly Mark[] {
    if (edge.down) {
      this.downAt ??= at;
    } else if (this.downAt !== null) {
      this.marks.push({ down: this.downAt, up: Math.max(at, this.downAt + 1) });
      this.downAt = null;
    }
    return this.marks;
  }

  /** When the key went down, if it's down now. */
  get held(): number | null {
    return this.downAt;
  }
}
