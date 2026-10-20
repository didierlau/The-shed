import { Note } from 'tonal';
import type { ChordQuality } from './chords';
import { DEGREES, degreeNote, voiceChord, type Degree, type MajorKey } from './keys';
import type { PlaybackStep } from './types';

/**
 * Common jazz progressions, written as chords relative to a major key.
 * Each chord is a root degree (chromatic roots allowed, e.g. ♭II for a
 * tritone sub) plus a quality.
 */
export interface ProgressionChord {
  degree: Degree;
  quality: ChordQuality;
}

export interface Progression {
  /** Roman numerals, e.g. "I–vi–ii–♭II7". */
  label: string;
  /** Nickname shown beside the numerals, if it has one. */
  detail?: string;
  chords: ProgressionChord[];
}

const c = (degree: Degree, quality: ChordQuality): ProgressionChord => ({ degree, quality });

export const PROGRESSIONS = {
  'ii-V-I': {
    label: 'ii–V–I',
    detail: 'major',
    chords: [c('2', 'm7'), c('5', '7'), c('1', 'maj7'), c('1', 'maj7')],
  },
  'ii-V-i': {
    label: 'iiø–V7♭9–i',
    detail: 'minor',
    chords: [c('2', 'm7b5'), c('5', '7b9'), c('1', 'm6'), c('1', 'm6')],
  },
  'I-vi-ii-V': {
    label: 'I–vi–ii–V',
    chords: [c('1', 'maj7'), c('6', 'm7'), c('2', 'm7'), c('5', '7')],
  },
  'I-VI7-ii-V': {
    label: 'I–VI7–ii–V',
    chords: [c('1', 'maj7'), c('6', '7'), c('2', 'm7'), c('5', '7')],
  },
  'iii-VI7-ii-V': {
    label: 'iii–VI7–ii–V',
    chords: [c('3', 'm7'), c('6', '7'), c('2', 'm7'), c('5', '7')],
  },
  'I-vi-ii-bII7': {
    label: 'I–vi–ii–♭II7',
    detail: 'tritone sub',
    chords: [c('1', 'maj7'), c('6', 'm7'), c('2', 'm7'), c('b2', '7')],
  },
  dameron: {
    label: 'I–♭III7–♭VI7–♭II7',
    detail: 'Dameron',
    chords: [c('1', 'maj7'), c('b3', '7'), c('b6', '7'), c('b2', '7')],
  },
  backdoor: {
    label: 'iv–♭VII7–I',
    detail: 'backdoor',
    chords: [c('4', 'm7'), c('b7', '7'), c('1', 'maj7'), c('1', 'maj7')],
  },
  'rhythm-bridge': {
    label: 'III7–VI7–II7–V7',
    detail: 'rhythm bridge',
    chords: [c('3', '7'), c('6', '7'), c('2', '7'), c('5', '7')],
  },
  'blues-start': {
    label: 'I7–IV7–I7',
    detail: 'blues',
    chords: [c('1', '7'), c('4', '7'), c('1', '7'), c('1', '7')],
  },
} as const satisfies Record<string, Progression>;

export type ProgressionName = keyof typeof PROGRESSIONS;

function chordRootMidi(key: MajorKey, degree: Degree): number {
  return Note.midi(key + '3')! + DEGREES[degree].semitones;
}

/** Chord symbols of a progression in a key, e.g. ("F", "ii-V-I") → ["Gm7", "C7", "Fmaj7", "Fmaj7"]. */
export function progressionSymbols(key: MajorKey, name: ProgressionName): string[] {
  return PROGRESSIONS[name].chords.map((ch) => degreeNote(key, ch.degree) + ch.quality);
}

/** The progression as playback: two beats per chord, the last one held longer. */
export function progressionPlayback(key: MajorKey, name: ProgressionName): PlaybackStep[] {
  const chords = PROGRESSIONS[name].chords;
  return chords.map((ch, i) => ({
    notes: voiceChord(chordRootMidi(key, ch.degree), ch.quality),
    beats: i === chords.length - 1 ? 3 : 2,
  }));
}
