import { norm, VEC_HIGH, VEC_LOW, VEC_SIZE, type SemitoneVector } from './semitones';

/**
 * Explain a sound as a mix of known piano notes.
 *
 * Each note has a template: what that key sounds like in semitone-vector form
 * (its fundamental plus overtones, as heard by this mic in this room). We look
 * for the non-negative combination of templates that best rebuilds the sound,
 * with a small penalty on using many notes (so overtones aren't mistaken for
 * extra notes). The notes with clearly non-zero weight are what's sounding.
 *
 * The fit is done on power (magnitude squared): the partials of different notes
 * add up as power, not as amplitude, and fitting amplitudes produces ghost notes.
 */

export interface NoteDictionary {
  /** MIDI number of each template, ascending. */
  notes: number[];
  /** One unit-length template per note. */
  templates: SemitoneVector[];
  /**
   * Recorded from this piano (true) or modelled (false). Modelled templates fit
   * less exactly, so only clearer notes are trusted.
   */
  calibrated: boolean;
}

export interface DecomposeOptions {
  /** Penalty for each unit of note weight; higher = fewer, stronger notes. */
  sparsity?: number;
  iterations?: number;
  /** Keep notes with at least this share of the strongest note's weight. */
  relativeThreshold?: number;
  /** Most notes reported at once. */
  maxNotes?: number;
  /**
   * A note's own fundamental must show at least this share of the power its
   * template predicts there, or the note is dropped and the fit redone. Stops a
   * low "ghost" note from explaining two real notes that happen to be its overtones.
   */
  fundamentalEvidence?: number;
}

const DEFAULTS: Required<DecomposeOptions> = {
  sparsity: 0.0005,
  iterations: 300,
  relativeThreshold: 0.3,
  maxNotes: 8,
  fundamentalEvidence: 0.3,
};

/** Without calibration, a note must be louder relative to the rest to count. */
const MODELLED_THRESHOLD = 0.35;

interface Prepared {
  /** Power templates (each sums to 1, since magnitude templates are unit length). */
  power: Float64Array[];
  gram: Float64Array;
}

/** Power templates and their Gram matrix, cached per dictionary. */
const cache = new WeakMap<NoteDictionary, Prepared>();

function prepare(dict: NoteDictionary): Prepared {
  const hit = cache.get(dict);
  if (hit) return hit;
  const power = dict.templates.map((t) => t.map((v) => v * v));
  const k = power.length;
  const gram = new Float64Array(k * k);
  for (let i = 0; i < k; i++) {
    for (let j = i; j < k; j++) {
      let s = 0;
      for (let n = 0; n < VEC_SIZE; n++) s += power[i]![n]! * power[j]![n]!;
      gram[i * k + j] = s;
      gram[j * k + i] = s;
    }
  }
  const prepared = { power, gram };
  cache.set(dict, prepared);
  return prepared;
}

/**
 * Loudness of every dictionary note in the sound (same order as `dict.notes`),
 * as amplitudes relative to the whole sound.
 */
export function noteWeights(
  x: SemitoneVector,
  dict: NoteDictionary,
  options: DecomposeOptions = {},
  /** Notes allowed in the fit (all when omitted). */
  allowed?: boolean[],
): Float64Array {
  const o = { ...DEFAULTS, ...options };
  const { power, gram: g } = prepare(dict);
  const k = power.length;
  const scale = norm(x) ** 2;
  const h = new Float64Array(k);
  if (scale === 0) return h;

  const b = new Float64Array(k);
  for (let i = 0; i < k; i++) {
    let s = 0;
    const t = power[i]!;
    for (let n = 0; n < VEC_SIZE; n++) s += (t[n]! * x[n]! ** 2) / scale;
    b[i] = s;
  }
  // Coordinate descent on the penalised least-squares fit, keeping every weight ≥ 0.
  // gh tracks G·h so each step is cheap.
  const gh = new Float64Array(k);
  for (let it = 0; it < o.iterations; it++) {
    let moved = 0;
    for (let i = 0; i < k; i++) {
      const gii = g[i * k + i]!;
      if (gii <= 0 || (allowed && !allowed[i])) continue;
      const next = Math.max(0, h[i]! + (b[i]! - gh[i]! - o.sparsity) / gii);
      const delta = next - h[i]!;
      if (delta === 0) continue;
      h[i] = next;
      for (let j = 0; j < k; j++) gh[j]! += g[j * k + i]! * delta;
      moved = Math.max(moved, Math.abs(delta));
    }
    if (moved < 1e-9) break;
  }
  // Power → amplitude, so thresholds read like loudness.
  return h.map(Math.sqrt);
}

/** The notes (MIDI numbers, ascending) that are sounding in `x`. */
export function decompose(x: SemitoneVector, dict: NoteDictionary, options: DecomposeOptions = {}): number[] {
  const o = { ...DEFAULTS, ...(dict.calibrated ? {} : { relativeThreshold: MODELLED_THRESHOLD }), ...options };
  const allowed = dict.notes.map(() => true);
  const scale = norm(x) ** 2;

  for (let round = 0; round < 6; round++) {
    const h = noteWeights(x, dict, o, allowed);
    const max = Math.max(0, ...h);
    if (max < 0.05) return [];
    const candidates = dict.notes.map((note, i) => ({ note, i, w: h[i]! }));
    const kept = candidates
      .filter((e) => e.w >= o.relativeThreshold * max)
      .sort((a, b) => b.w - a.w)
      .slice(0, o.maxNotes);
    // Phone mics hear bass quietly, so a note below everything else gets half the bar.
    const lowestKept = Math.min(...kept.map((e) => e.note));
    const bass = candidates
      .filter((e) => e.note < lowestKept && e.w >= (o.relativeThreshold / 2) * max)
      .sort((a, b) => b.w - a.w)[0];
    if (bass && kept.length < o.maxNotes) kept.push(bass);

    // Evidence check: is each note's own fundamental there, as strongly as its template says,
    // beyond what the other notes' overtones already put at that pitch?
    const ghosts = kept.filter(({ note, i, w }) => {
      const bin = note - VEC_LOW;
      const predicted = w * w * dict.templates[i]![bin]! ** 2;
      const fromOthers = kept.reduce((sum, e) => (e.i === i ? sum : sum + e.w * e.w * dict.templates[e.i]![bin]! ** 2), 0);
      const own = x[bin]! ** 2 / scale - fromOthers;
      return predicted > 1e-4 && own < o.fundamentalEvidence * predicted;
    });
    if (ghosts.length === 0) return kept.map((e) => e.note).sort((a, b) => a - b);
    // Drop the strongest ghost and fit again: its energy goes back to the real notes.
    allowed[ghosts.sort((a, b) => b.w - a.w)[0]!.i] = false;
  }
  return [];
}

/**
 * A modelled piano note in semitone-vector form: partials that fade with height,
 * slightly sharp (piano strings are stiff), and a softer fundamental in the bass,
 * the way a phone mic hears it. Used when the piano hasn't been calibrated.
 */
export function modelNote(midi: number): SemitoneVector {
  const v = new Float64Array(VEC_SIZE);
  const inharmonicity = 0.0004;
  for (let h = 1; h <= 10; h++) {
    const partial = midi + 12 * Math.log2(h * Math.sqrt(1 + inharmonicity * h * h));
    const k = Math.round(partial) - VEC_LOW;
    if (k < 0 || k >= VEC_SIZE) continue;
    let amp = 1 / h ** 0.9;
    if (h === 1 && midi < 48) amp *= 0.35 + (0.65 * (midi - VEC_LOW)) / (48 - VEC_LOW);
    v[k]! += amp;
  }
  return unit(v);
}

export function unit(v: SemitoneVector): SemitoneVector {
  const n = norm(v);
  const out = new Float64Array(VEC_SIZE);
  if (n > 0) for (let i = 0; i < VEC_SIZE; i++) out[i] = v[i]! / n;
  return out;
}

/** Dictionary of modelled notes, for when there's no calibration. */
export function modelDictionary(low = VEC_LOW, high = 96): NoteDictionary {
  const notes: number[] = [];
  for (let m = Math.max(low, VEC_LOW); m <= Math.min(high, VEC_HIGH); m++) notes.push(m);
  return { notes, templates: notes.map(modelNote), calibrated: false };
}
