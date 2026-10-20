/**
 * Detects when a key is struck, from the short-term loudness of the mic signal.
 * A piano attack is a sudden jump in level; the slow decay afterwards is not.
 *
 * "Silence" adapts to the room: the detector keeps track of the background
 * level and only needs a strike to rise clearly above it, so quiet high notes
 * count in a quiet room, and a noisy room doesn't trigger false strikes.
 * It listens briefly before the first strike can count, to learn the room.
 */
export interface OnsetOptions {
  /** Lowest level (RMS, 0–1) ever treated as sound, whatever the background. */
  minSilence?: number;
  /** A sound must be this many times louder than the background. */
  aboveBackground?: number;
  /** How much louder than the recent quietest level a frame must be. */
  ratio?: number;
  /** How far back "recent" reaches, in ms. */
  lookbackMs?: number;
  /** No second onset within this many ms. */
  refractoryMs?: number;
}

const DEFAULTS: Required<OnsetOptions> = {
  minSilence: 0.0008,
  aboveBackground: 4,
  ratio: 1.6,
  lookbackMs: 150,
  refractoryMs: 120,
};

/** The background is the quietest level of the last ten seconds (piano sound always dies away in between). */
const BACKGROUND_WINDOW_MS = 10000;
/** Listen this long before the first strike can count, to learn the room first. */
const WARM_UP_MS = 200;

export class OnsetDetector {
  private history: { time: number; rms: number }[] = [];
  private lastOnset = -Infinity;
  private levels: { time: number; rms: number }[] = [];
  private background: number | null = null;
  private startedAt: number | null = null;
  private o: Required<OnsetOptions>;

  constructor(options: OnsetOptions = {}) {
    this.o = { ...DEFAULTS, ...options };
  }

  /** Feed one frame; returns true if a key was struck in it. */
  push(time: number, rms: number): boolean {
    // Background from the frames before this one, so a strike never raises its own bar.
    while (this.levels.length && time - this.levels[0]!.time > BACKGROUND_WINDOW_MS) this.levels.shift();
    this.background = this.levels.length ? Math.min(...this.levels.map((l) => l.rms)) : 0;
    this.levels.push({ time, rms });
    this.startedAt ??= time;

    this.history = this.history.filter((f) => time - f.time <= this.o.lookbackMs);
    const recentQuiet = this.history.length ? Math.min(...this.history.map((f) => f.rms)) : 0;
    const previous = this.history.at(-1)?.rms ?? 0;
    this.history.push({ time, rms });
    const silence = this.silenceLevel();
    const onset =
      rms > silence &&
      // Rising right now (a decay never is)…
      rms > previous * 1.2 &&
      // …and clearly above the recent quietest level.
      rms > Math.max(recentQuiet, silence / 2) * this.o.ratio &&
      time - this.lastOnset >= this.o.refractoryMs &&
      time - this.startedAt >= WARM_UP_MS;
    if (onset) this.lastOnset = time;
    return onset;
  }

  /** Level below which the room counts as silent. */
  silenceLevel(): number {
    return Math.max(this.o.minSilence, (this.background ?? 0) * this.o.aboveBackground);
  }

  isSilent(rms: number): boolean {
    return rms < this.silenceLevel();
  }
}
