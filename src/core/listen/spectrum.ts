/**
 * Turn a microphone spectrum into the notes that are probably sounding.
 *
 * Input is one FFT frame in decibels (what an AnalyserNode gives). We find
 * spectral peaks, snap them to the nearest semitone, then remove peaks that
 * are just overtones of a lower note (the octave, 12th, two octaves, 17th and
 * 19th above). This is a best guess: a quiet note that coincides with a loud
 * note's overtone can be missed, which is why the app labels mic results as such.
 */

export interface SpectrumOptions {
  /** Ignore everything below this level (dB); treats the frame as silence. */
  silenceDb?: number;
  /** Keep peaks within this many dB of the loudest one. */
  dynamicRangeDb?: number;
  minHz?: number;
  maxHz?: number;
}

const DEFAULTS: Required<SpectrumOptions> = { silenceDb: -65, dynamicRangeDb: 20, minHz: 50, maxHz: 2100 };

// Overtones 2–6: semitones above the fundamental, and roughly how much quieter they are (dB).
const OVERTONES = [2, 3, 4, 5, 6].map((h) => ({ semitones: Math.round(12 * Math.log2(h)), drop: 20 * Math.log10(h) }));

/** A peak this much louder than an overtone would be is treated as a real note. */
const REAL_NOTE_MARGIN_DB = 6;

export function frequencyToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Sounding notes (MIDI numbers, lowest first) in one spectrum frame. Empty when silent. */
export function spectrumToNotes(db: ArrayLike<number>, sampleRate: number, options: SpectrumOptions = {}): number[] {
  const o = { ...DEFAULTS, ...options };
  const fftSize = db.length * 2;
  const binHz = sampleRate / fftSize;
  const first = Math.max(1, Math.floor(o.minHz / binHz));
  const last = Math.min(db.length - 2, Math.ceil(o.maxHz / binHz));

  let loudest = -Infinity;
  for (let i = first; i <= last; i++) loudest = Math.max(loudest, db[i]!);
  if (loudest < o.silenceDb) return [];
  const floor = loudest - o.dynamicRangeDb;

  // Strongest peak per semitone.
  const level = new Map<number, number>();
  for (let i = first; i <= last; i++) {
    const v = db[i]!;
    if (v < floor || v <= db[i - 1]! || v < db[i + 1]!) continue;
    // Parabolic interpolation for a finer frequency estimate.
    const l = db[i - 1]!;
    const r = db[i + 1]!;
    const shift = (0.5 * (l - r)) / (l - 2 * v + r || 1);
    const midiFloat = frequencyToMidi((i + shift) * binHz);
    const midi = Math.round(midiFloat);
    if (Math.abs(midiFloat - midi) > 0.4) continue;
    level.set(midi, Math.max(level.get(midi) ?? -Infinity, v));
  }

  // Drop overtones of lower notes, unless they are clearly louder than an overtone would be
  // (then a real note is sounding there too, like A3 over a low D).
  const notes = [...level.keys()].sort((a, b) => a - b);
  const removed = new Set<number>();
  for (const n of notes) {
    if (removed.has(n)) continue;
    const base = level.get(n)!;
    for (const { semitones, drop } of OVERTONES) {
      const over = level.get(n + semitones);
      if (over !== undefined && over < base - drop + REAL_NOTE_MARGIN_DB) removed.add(n + semitones);
    }
  }
  return notes.filter((n) => !removed.has(n));
}

/**
 * Microphone frames flicker: a note can drop out of one frame and back.
 * This keeps the notes heard in at least `minCount` of the last `window` frames.
 */
export class NoteSmoother {
  private frames: number[][] = [];

  constructor(
    private window = 4,
    private minCount = 3,
  ) {}

  push(notes: number[]): number[] {
    this.frames.push(notes);
    if (this.frames.length > this.window) this.frames.shift();
    const counts = new Map<number, number>();
    for (const f of this.frames) for (const n of f) counts.set(n, (counts.get(n) ?? 0) + 1);
    return [...counts].filter(([, c]) => c >= this.minCount).map(([n]) => n).sort((a, b) => a - b);
  }

  reset(): void {
    this.frames = [];
  }
}
