import { modelDictionary, unit, type NoteDictionary } from './decompose';
import { at, newEnergy, VEC_HIGH, VEC_LOW, VEC_SIZE, type SemitoneVector } from './semitones';

/**
 * "Teach the app your piano": record each key once, in order, so detection can
 * match sounds against how this piano actually sounds through this phone.
 */

/** A saved calibration. Plain JSON so it can be stored as-is. */
export interface Calibration {
  version: 1;
  createdAt: string;
  /** Median deviation from A440 equal temperament, in cents (negative = flat). */
  tuningCents: number;
  keys: { midi: number; template: number[] }[];
}

export const CALIBRATION_RANGES = {
  quick: { label: 'Quick', detail: 'C3–C5 · 25 keys', low: 48, high: 72 },
  full: { label: 'Full', detail: 'C2–C6 · 49 keys', low: 36, high: 84 },
} as const;

export type CalibrationRange = keyof typeof CALIBRATION_RANGES;

export interface OfferResult {
  accepted: boolean;
  /** The key that seemed loudest, for "that sounded like D3" feedback. */
  heard: number | null;
}

/** The new note must stand out this much from its neighbouring keys. */
const CLARITY = 1.5;

/** Does the key at `centre` stand out from the keys up to two semitones either side? */
function standsOut(d: SemitoneVector, centre: number): boolean {
  if (centre > VEC_HIGH) return false;
  const here = at(d, centre);
  let rival = 0;
  for (let k = centre - 2; k <= centre + 2; k++) if (k !== centre) rival = Math.max(rival, at(d, k));
  return here > 0 && here >= rival * CLARITY;
}

/**
 * Is `midi` clearly the note that was just struck? Checked on its fundamental, or
 * its 2nd partial when the fundamental is too weak; for faint bass notes, its 3rd
 * and 4th partials together (12th and two octaves up) also count.
 */
export function isClearly(d: SemitoneVector, midi: number): boolean {
  return (
    standsOut(d, midi) ||
    standsOut(d, midi + 12) ||
    (midi < 48 && standsOut(d, midi + 19) && standsOut(d, midi + 24))
  );
}

export class CalibrationSession {
  private recorded: { midi: number; template: SemitoneVector; cents: number | null }[] = [];
  /** Keys handled so far, recorded or skipped, in order. */
  private handled: { midi: number; skipped: boolean }[] = [];

  constructor(
    readonly low: number,
    readonly high: number,
  ) {}

  get total(): number {
    return this.high - this.low + 1;
  }

  /** Keys recorded (skipped keys don't count). */
  get done(): number {
    return this.recorded.length;
  }

  /** Keys passed so far, recorded or skipped. */
  get position(): number {
    return this.handled.length;
  }

  get skipped(): number[] {
    return this.handled.filter((h) => h.skipped).map((h) => h.midi);
  }

  /** The key to play next, or null when finished. */
  get expected(): number | null {
    const next = this.low + this.handled.length;
    return next <= this.high ? next : null;
  }

  /** Move on without recording this key; nearby recorded keys stand in for it. */
  skip(): void {
    const midi = this.expected;
    if (midi !== null) this.handled.push({ midi, skipped: true });
  }

  /**
   * Is the expected key clearly in what was heard just after a strike (`after`),
   * compared with just before it (`before`)? Doesn't record anything.
   */
  check(after: SemitoneVector, before: SemitoneVector): OfferResult {
    const midi = this.expected;
    if (midi === null) return { accepted: false, heard: null };
    const d = newEnergy(after, before);
    let heard: number | null = null;
    for (let k = midi - 6; k <= midi + 6; k++) if (at(d, k) > 0 && (heard === null || at(d, k) > at(d, heard))) heard = k;
    return isClearly(d, midi) ? { accepted: true, heard: midi } : { accepted: false, heard };
  }

  /** Record the expected key's sound and move on to the next key. */
  record(after: SemitoneVector, before: SemitoneVector, cents: number | null): void {
    const midi = this.expected;
    if (midi === null) return;
    this.recorded.push({ midi, template: unit(newEnergy(after, before)), cents });
    this.handled.push({ midi, skipped: false });
  }

  /** Check and, if it's the right key, record it in one go. */
  offer(after: SemitoneVector, before: SemitoneVector, cents: number | null): OfferResult {
    const result = this.check(after, before);
    if (result.accepted) this.record(after, before, cents);
    return result;
  }

  /** Step back one key (recorded or skipped), e.g. after a double strike. */
  undo(): void {
    const last = this.handled.pop();
    if (last && !last.skipped) this.recorded.pop();
  }

  result(createdAt: string): Calibration {
    const cents = this.recorded.map((r) => r.cents).filter((c): c is number => c !== null).sort((a, b) => a - b);
    const tuningCents = cents.length ? cents[Math.floor(cents.length / 2)]! : 0;
    return {
      version: 1,
      createdAt,
      tuningCents: Math.round(tuningCents),
      keys: this.recorded.map((r) => ({ midi: r.midi, template: [...r.template].map((v) => Math.round(v * 1e5) / 1e5) })),
    };
  }
}

/**
 * Note dictionary for detection. With a calibration, every key from E1 up uses
 * the nearest recorded key's sound, moved to the right pitch; recorded keys use
 * their own. Without one, modelled piano notes.
 */
export function buildDictionary(calibration: Calibration | null, low = VEC_LOW, high = 96): NoteDictionary {
  if (!calibration || calibration.keys.length === 0) return modelDictionary(low, high);
  const recorded = calibration.keys;
  const notes: number[] = [];
  const templates: SemitoneVector[] = [];
  for (let m = low; m <= high; m++) {
    const nearest = recorded.reduce((a, b) => (Math.abs(b.midi - m) < Math.abs(a.midi - m) ? b : a));
    const shift = m - nearest.midi;
    const t = new Float64Array(VEC_SIZE);
    for (let k = 0; k < VEC_SIZE; k++) {
      const from = k - shift;
      if (from >= 0 && from < VEC_SIZE) t[k] = nearest.template[from] ?? 0;
    }
    notes.push(m);
    templates.push(unit(t));
  }
  return { notes, templates, calibrated: true };
}
