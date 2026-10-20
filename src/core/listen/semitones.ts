import { frequencyToMidi, midiToFrequency } from './spectrum';

/**
 * A spectrum folded into one value per piano key ("semitone vector").
 * This is the common currency of mic listening: calibration templates,
 * live frames and the note decomposition all use it.
 */

/** Lowest and highest key the vector covers: E1 to C8. */
export const VEC_LOW = 28;
export const VEC_HIGH = 108;
export const VEC_SIZE = VEC_HIGH - VEC_LOW + 1;

export type SemitoneVector = Float64Array;

/**
 * Fold an FFT frame (dB per bin, as an AnalyserNode gives) into per-key magnitudes.
 * `tuningCents` shifts the key boundaries for a piano that isn't at A440.
 */
export function spectrumToSemitones(db: ArrayLike<number>, sampleRate: number, tuningCents = 0): SemitoneVector {
  const out = new Float64Array(VEC_SIZE);
  const binHz = sampleRate / (db.length * 2);
  const first = Math.max(1, Math.floor(midiToFrequency(VEC_LOW - 0.5) / binHz));
  const last = Math.min(db.length - 1, Math.ceil(midiToFrequency(VEC_HIGH + 0.5) / binHz));
  for (let i = first; i <= last; i++) {
    const key = Math.round(frequencyToMidi(i * binHz) - tuningCents / 100) - VEC_LOW;
    if (key < 0 || key >= VEC_SIZE) continue;
    out[key]! += 10 ** (db[i]! / 10); // power
  }
  for (let k = 0; k < VEC_SIZE; k++) out[k] = Math.sqrt(out[k]!);
  return out;
}

/** What changed since `before`: energy that appeared, with fading energy ignored. */
export function newEnergy(after: SemitoneVector, before: SemitoneVector): SemitoneVector {
  const out = new Float64Array(VEC_SIZE);
  for (let k = 0; k < VEC_SIZE; k++) out[k] = Math.sqrt(Math.max(0, after[k]! ** 2 - before[k]! ** 2));
  return out;
}

export function norm(v: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i]! ** 2;
  return Math.sqrt(s);
}

export function at(v: SemitoneVector, midi: number): number {
  const k = midi - VEC_LOW;
  return k >= 0 && k < VEC_SIZE ? v[k]! : 0;
}

/**
 * Fine pitch of a key from the raw spectrum, in cents away from equal temperament
 * (negative = flat). Looks at the fundamental, or the 2nd partial when the
 * fundamental is too weak (low notes on a phone mic). Null if neither is clear.
 */
export function measureCents(db: ArrayLike<number>, sampleRate: number, midi: number): number | null {
  const binHz = sampleRate / (db.length * 2);
  for (const partial of [1, 2]) {
    const target = midiToFrequency(midi) * partial;
    const lo = Math.max(1, Math.floor((target * 2 ** (-0.5 / 12)) / binHz));
    const hi = Math.min(db.length - 2, Math.ceil((target * 2 ** (0.5 / 12)) / binHz));
    let best = -1;
    for (let i = lo; i <= hi; i++) if (best < 0 || db[i]! > db[best]!) best = i;
    if (best < 0) continue;
    const v = db[best]!;
    const l = db[best - 1]!;
    const r = db[best + 1]!;
    // Must be a real peak standing out of its surroundings.
    if (v <= l || v < r || v - Math.min(db[lo]!, db[hi]!) < 10) continue;
    const shift = (0.5 * (l - r)) / (l - 2 * v + r || 1);
    const hz = ((best + shift) * binHz) / partial;
    return 1200 * Math.log2(hz / midiToFrequency(midi));
  }
  return null;
}
