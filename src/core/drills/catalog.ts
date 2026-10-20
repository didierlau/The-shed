import { ALL_INTERVALS } from '../intervals';
import type { IntervalDrillConfig } from './intervals';
import type { ChordDrillConfig } from './chords';

/**
 * All drills in the app, in suggested order.
 * Adding a level = adding an entry here. Future drill kinds
 * (functional notes, progressions, voicings) join this union.
 */
export type DrillConfig = IntervalDrillConfig | ChordDrillConfig;

const RANGE: [string, string] = ['C3', 'C5'];
const ROOTS: [string, string] = ['C3', 'G3'];

export const DRILLS: DrillConfig[] = [
  {
    kind: 'intervals',
    id: 'intervals-perfect',
    title: 'Perfect intervals',
    description: '4ths, 5ths and octaves — the skeleton of harmony.',
    intervals: ['4P', '5P', '8P'],
    directions: ['up'],
    range: RANGE,
  },
  {
    kind: 'intervals',
    id: 'intervals-thirds',
    title: 'Thirds',
    description: 'Major vs minor 3rd: the sound of chord quality.',
    intervals: ['3m', '3M'],
    directions: ['up', 'down'],
    range: RANGE,
  },
  {
    kind: 'intervals',
    id: 'intervals-seconds',
    title: 'Seconds',
    description: 'Half and whole steps — the building blocks of lines.',
    intervals: ['2m', '2M'],
    directions: ['up', 'down'],
    range: RANGE,
  },
  {
    kind: 'intervals',
    id: 'intervals-sevenths',
    title: '6ths & 7ths',
    description: 'The colours that make jazz chords sound like jazz.',
    intervals: ['6m', '6M', '7m', '7M'],
    directions: ['up', 'down'],
    range: RANGE,
  },
  {
    kind: 'intervals',
    id: 'intervals-guide-tones',
    title: 'Guide tones',
    description: 'Tritone, 3rds and 7ths stacked together — hear the shells.',
    intervals: ['3m', '3M', '4A', '7m', '7M'],
    directions: ['harmonic'],
    range: RANGE,
  },
  {
    kind: 'intervals',
    id: 'intervals-all',
    title: 'All intervals',
    description: 'Everything, melodic and harmonic. Adaptive to your weak spots.',
    intervals: ALL_INTERVALS,
    directions: ['up', 'down', 'harmonic'],
    range: RANGE,
  },
  {
    kind: 'chords',
    id: 'chords-triads-basic',
    title: 'Major & minor triads',
    description: 'The first colour choice: bright or dark.',
    qualities: ['M', 'm'],
    voicing: 'close',
    playback: 'arpeggio',
    rootRange: ROOTS,
  },
  {
    kind: 'chords',
    id: 'chords-triads-all',
    title: 'All triads',
    description: 'Major, minor, diminished and augmented.',
    qualities: ['M', 'm', 'dim', 'aug'],
    voicing: 'close',
    playback: 'arpeggio',
    rootRange: ROOTS,
  },
  {
    kind: 'chords',
    id: 'chords-sevenths-core',
    title: 'The big three 7ths',
    description: 'Maj7, dominant 7 and m7 — the chords of the ii–V–I.',
    qualities: ['maj7', '7', 'm7'],
    voicing: 'close',
    playback: 'arpeggio',
    rootRange: ROOTS,
  },
  {
    kind: 'chords',
    id: 'chords-sevenths-minor-ii-v',
    title: 'Minor ii–V colours',
    description: 'Add half-diminished and diminished 7 to the big three.',
    qualities: ['maj7', '7', 'm7', 'm7b5', 'dim7'],
    voicing: 'close',
    playback: 'arpeggio',
    rootRange: ROOTS,
  },
  {
    kind: 'chords',
    id: 'chords-sixths',
    title: '6ths & minor-major',
    description: 'Tonic colours: 6, m6 and mMaj7 against maj7 and m7.',
    qualities: ['6', 'm6', 'mMaj7', 'maj7', 'm7'],
    voicing: 'close',
    playback: 'block',
    rootRange: ROOTS,
  },
  {
    kind: 'chords',
    id: 'chords-shells',
    title: 'Shell voicings',
    description: 'Root, 3rd and 7th only — how they sound when you comp.',
    qualities: ['maj7', '7', 'm7', '6', '7sus4'],
    voicing: 'shell',
    playback: 'block',
    rootRange: ROOTS,
  },
  {
    kind: 'chords',
    id: 'chords-all',
    title: 'All chord qualities',
    description: 'Every 7th and 6th chord, played together. Adaptive to your weak spots.',
    qualities: ['maj7', '7', 'm7', 'm7b5', 'dim7', 'mMaj7', '6', 'm6', '7sus4'],
    voicing: 'close',
    playback: 'block',
    rootRange: ROOTS,
  },
];

/** Home-screen sections, in order. */
export const DRILL_GROUPS: { kind: DrillConfig['kind']; title: string }[] = [
  { kind: 'intervals', title: 'Intervals' },
  { kind: 'chords', title: 'Chord qualities' },
];

export function findDrill(id: string): DrillConfig | undefined {
  return DRILLS.find((d) => d.id === id);
}
