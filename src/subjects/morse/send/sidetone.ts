// The straight key's sidetone (#35): a tone that sounds while the key is down.
//
// For the shortest delay between pressing and hearing, the oscillator runs all the time and
// only its volume is switched; nothing is created on a key press. The volume moves with a
// ~1.5 ms time constant (fully on in ~5 ms), the usual click-free keying edge.

const EDGE = 0.0015;

export class Sidetone {
  private gain?: GainNode;
  private osc?: OscillatorNode;

  constructor(
    private readonly ctx: AudioContext,
    private readonly pitch = 600,
    private readonly volume = 0.4,
  ) {}

  /** Call from a tap, click or key press: browsers only allow sound after one. */
  async unlock(): Promise<void> {
    // Build first, so a key press right after this call already has something to switch on.
    if (!this.osc) {
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0;
      this.osc = this.ctx.createOscillator();
      this.osc.frequency.value = this.pitch;
      this.osc.connect(this.gain).connect(this.ctx.destination);
      this.osc.start();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  down(): void {
    this.set(this.volume);
  }

  up(): void {
    this.set(0);
  }

  /** Silences and releases the oscillator. */
  close(): void {
    this.up();
    this.osc?.stop(this.ctx.currentTime + 0.02);
    this.osc = undefined;
  }

  private set(level: number) {
    if (!this.gain) return;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setTargetAtTime(level, now, EDGE);
  }
}
