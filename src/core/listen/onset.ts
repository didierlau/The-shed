/**
 * Detects when a key is struck, from the short-term loudness of the mic signal.
 * A piano attack is a sudden jump in level; the slow decay afterwards is not.
 */
export interface OnsetOptions {
  /** Level (RMS, 0–1) below which everything counts as silence. */
  silence?: number;
  /** How much louder than the recent quietest level a frame must be. */
  ratio?: number;
  /** How far back "recent" reaches, in ms. */
  lookbackMs?: number;
  /** No second onset within this many ms. */
  refractoryMs?: number;
}

const DEFAULTS: Required<OnsetOptions> = { silence: 0.004, ratio: 1.6, lookbackMs: 150, refractoryMs: 120 };

export class OnsetDetector {
  private history: { time: number; rms: number }[] = [];
  private lastOnset = -Infinity;
  private o: Required<OnsetOptions>;

  constructor(options: OnsetOptions = {}) {
    this.o = { ...DEFAULTS, ...options };
  }

  /** Feed one frame; returns true if a key was struck in it. */
  push(time: number, rms: number): boolean {
    this.history = this.history.filter((f) => time - f.time <= this.o.lookbackMs);
    const recentQuiet = this.history.length ? Math.min(...this.history.map((f) => f.rms)) : 0;
    const previous = this.history.at(-1)?.rms ?? 0;
    this.history.push({ time, rms });
    const onset =
      rms > this.o.silence &&
      // Rising right now (a decay never is)…
      rms > previous * 1.2 &&
      // …and clearly above the recent quietest level.
      rms > Math.max(recentQuiet, this.o.silence / 2) * this.o.ratio &&
      time - this.lastOnset >= this.o.refractoryMs;
    if (onset) this.lastOnset = time;
    return onset;
  }

  isSilent(rms: number): boolean {
    return rms < this.o.silence;
  }
}
