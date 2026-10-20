import { Note } from 'tonal';
import { chordSemitones, type ChordQuality } from './chords';
import type { PlaybackStep } from './types';

/**
 * Functional harmony in major keys: scale degrees, diatonic chords,
 * and the cadence that establishes a key before a question.
 */

/** Keys as a jazz musician spells them. */
export const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export type MajorKey = (typeof MAJOR_KEYS)[number];

/** Every chromatic degree relative to the tonic. */
export const DEGREES = {
  '1': { label: '1', semitones: 0, interval: '1P' },
  b2: { label: '♭2', semitones: 1, interval: '2m' },
  '2': { label: '2', semitones: 2, interval: '2M' },
  b3: { label: '♭3', semitones: 3, interval: '3m' },
  '3': { label: '3', semitones: 4, interval: '3M' },
  '4': { label: '4', semitones: 5, interval: '4P' },
  b5: { label: '♭5', semitones: 6, interval: '5d' },
  '5': { label: '5', semitones: 7, interval: '5P' },
  b6: { label: '♭6', semitones: 8, interval: '6m' },
  '6': { label: '6', semitones: 9, interval: '6M' },
  b7: { label: '♭7', semitones: 10, interval: '7m' },
  '7': { label: '7', semitones: 11, interval: '7M' },
} as const;
export type Degree = keyof typeof DEGREES;

/** Diatonic 7th chords of a major key. */
export const FUNCTIONS = {
  I: { label: 'Imaj7', degree: '1', quality: 'maj7' },
  ii: { label: 'ii7', degree: '2', quality: 'm7' },
  iii: { label: 'iii7', degree: '3', quality: 'm7' },
  IV: { label: 'IVmaj7', degree: '4', quality: 'maj7' },
  V: { label: 'V7', degree: '5', quality: '7' },
  vi: { label: 'vi7', degree: '6', quality: 'm7' },
  vii: { label: 'viiø7', degree: '7', quality: 'm7b5' },
} as const satisfies Record<string, { label: string; degree: Degree; quality: ChordQuality }>;
export type HarmonicFunction = keyof typeof FUNCTIONS;

/** Name of a degree's note in a key, e.g. ("Eb", "b7") → "Db". */
export function degreeNote(key: MajorKey, degree: Degree): string {
  return Note.transpose(key, DEGREES[degree].interval);
}

/** Chord symbol for a function in a key, e.g. ("Bb", "ii") → "Cm7". */
export function functionSymbol(key: MajorKey, fn: HarmonicFunction): string {
  const f = FUNCTIONS[fn];
  return degreeNote(key, f.degree) + f.quality;
}

// Register for comping chords (G3–F#4) and for the bass (C2–B2).
const CHORD_WINDOW = Note.midi('G3')!;
const BASS_WINDOW = Note.midi('C2')!;

function placeInWindow(midi: number, windowStart: number): number {
  return windowStart + ((((midi - windowStart) % 12) + 12) % 12);
}

/**
 * Voice a chord the way a pianist would comp it: bass note low, chord tones
 * close together in the middle register. Every chord lands in the same window,
 * so a sequence of them moves smoothly.
 */
export function voiceChord(rootMidi: number, quality: ChordQuality): string[] {
  const bass = placeInWindow(rootMidi, BASS_WINDOW);
  const upper = chordSemitones(quality)
    .map((o) => placeInWindow(rootMidi + o, CHORD_WINDOW))
    .sort((a, b) => a - b);
  return [bass, ...upper].map((m) => Note.fromMidi(m));
}

export function functionChord(key: MajorKey, fn: HarmonicFunction): string[] {
  const f = FUNCTIONS[fn];
  const root = Note.midi(key + '3')! + DEGREES[f.degree].semitones;
  return voiceChord(root, f.quality);
}

/** A ii–V–I in the key, then a short rest. Played before every functional question. */
export function cadence(key: MajorKey): PlaybackStep[] {
  return [
    { notes: functionChord(key, 'ii'), beats: 1.5 },
    { notes: functionChord(key, 'V'), beats: 1.5 },
    { notes: functionChord(key, 'I'), beats: 2.5 },
    { notes: [], beats: 0.75 },
  ];
}

const DIATONIC = [0, 2, 4, 5, 7, 9, 11, 12];

/**
 * How a degree resolves to the tonic, the Functional Ear Trainer way:
 * the lower half of the scale walks down to 1, the upper half walks up to 8.
 * Returns semitone offsets from the tonic, starting with the degree itself.
 */
export function resolutionPath(degree: Degree): number[] {
  const s = DEGREES[degree].semitones;
  if (s === 0) return [0];
  if (s < 6) return [s, ...DIATONIC.filter((d) => d < s).reverse()];
  return [s, ...DIATONIC.filter((d) => d > s)];
}
