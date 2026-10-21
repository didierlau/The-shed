import { Note } from 'tonal';

/**
 * App-wide practice settings. Pure data and rules; saving lives in src/storage.
 */

/** A range of playable notes, as MIDI numbers (inclusive). */
export interface NoteRange {
  low: number;
  high: number;
}

export interface Settings {
  /** Where interval, chord-quality and scale-degree questions are played. */
  range: NoteRange;
  /**
   * With the microphone, let the lowest note heard decide the bass (slash chords).
   * Off by default: through a phone mic, resonating low strings can pose as the bass.
   */
  micUsesBass: boolean;
  /** In Listen, play the notes from a MIDI keyboard through the phone's speaker. */
  midiSound: boolean;
}

/** Lowest and highest notes the range can be set to (A1–C7). */
export const RANGE_LIMITS: NoteRange = { low: Note.midi('A1')!, high: Note.midi('C7')! };

/** The range must cover at least two octaves, so every interval and chord fits with room to move. */
export const MIN_RANGE_SPAN = 24;

export const RANGE_PRESETS: { label: string; range: NoteRange }[] = [
  { label: 'C3–C5', range: { low: Note.midi('C3')!, high: Note.midi('C5')! } },
  { label: 'C2–C6', range: { low: Note.midi('C2')!, high: Note.midi('C6')! } },
  { label: 'A1–C7', range: { low: RANGE_LIMITS.low, high: RANGE_LIMITS.high } },
];

export const DEFAULT_SETTINGS: Settings = { range: { ...RANGE_PRESETS[0]!.range }, micUsesBass: false, midiSound: true };

/**
 * Make any stored or edited settings valid: whole numbers, inside the limits,
 * low below high, and at least MIN_RANGE_SPAN apart (widening upwards first).
 */
export function normaliseSettings(raw: Partial<Settings> | undefined): Settings {
  const micUsesBass = raw?.micUsesBass === true;
  const midiSound = raw?.midiSound !== false;
  const r = raw?.range;
  if (!r || !Number.isFinite(r.low) || !Number.isFinite(r.high)) return { ...structuredClone(DEFAULT_SETTINGS), micUsesBass, midiSound };
  let low = Math.round(Math.min(r.low, r.high));
  let high = Math.round(Math.max(r.low, r.high));
  low = clamp(low, RANGE_LIMITS.low, RANGE_LIMITS.high - MIN_RANGE_SPAN);
  high = clamp(high, low + MIN_RANGE_SPAN, RANGE_LIMITS.high);
  return { range: { low, high }, micUsesBass, midiSound };
}

/** Move one end of the range by some semitones, keeping the range valid. */
export function adjustRange(range: NoteRange, end: 'low' | 'high', semitones: number): NoteRange {
  if (end === 'low') {
    const low = clamp(range.low + semitones, RANGE_LIMITS.low, range.high - MIN_RANGE_SPAN);
    return { low, high: range.high };
  }
  const high = clamp(range.high + semitones, range.low + MIN_RANGE_SPAN, RANGE_LIMITS.high);
  return { low: range.low, high };
}

export function rangeLabel(range: NoteRange): string {
  return `${Note.fromMidi(range.low)}–${Note.fromMidi(range.high)}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
