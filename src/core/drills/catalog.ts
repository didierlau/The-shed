import { ALL_INTERVALS } from '../intervals';
import type { IntervalDrillConfig } from './intervals';
import type { ChordDrillConfig } from './chords';
import type { DegreeDrillConfig, FunctionDrillConfig } from './functional';
import type { ProgressionDrillConfig } from './progressions';
import { MAJOR_KEYS } from '../keys';

/**
 * All drills in the app, in suggested order.
 * Adding a level = adding an entry here. Future drill kinds
 * (voicings) join this union.
 */
export type DrillConfig =
  | IntervalDrillConfig
  | ChordDrillConfig
  | DegreeDrillConfig
  | FunctionDrillConfig
  | ProgressionDrillConfig;

const RANGE: [string, string] = ['C3', 'C5'];
const ROOTS: [string, string] = ['C3', 'G3'];
const MELODY: [string, string] = ['A3', 'A4'];
const EASY_KEYS = ['C', 'F', 'Bb', 'G'] as const;

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
    description: 'Maj7, dominant 7 and m7 — the chords of the ii\u2060–\u2060V\u2060–\u2060I.',
    qualities: ['maj7', '7', 'm7'],
    voicing: 'close',
    playback: 'arpeggio',
    rootRange: ROOTS,
  },
  {
    kind: 'chords',
    id: 'chords-sevenths-minor-ii-v',
    title: 'Minor ii\u2060–\u2060V colours',
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
  {
    kind: 'degrees',
    id: 'degrees-triad',
    title: '1, 3 and 5',
    description: 'Hear the tonic triad notes against a ii\u2060–\u2060V\u2060–\u2060I.',
    degrees: ['1', '3', '5'],
    keys: EASY_KEYS,
    range: MELODY,
  },
  {
    kind: 'degrees',
    id: 'degrees-lower',
    title: '1 to 5',
    description: 'Add 2 and 4: the lower half of the scale.',
    degrees: ['1', '2', '3', '4', '5'],
    keys: EASY_KEYS,
    range: MELODY,
  },
  {
    kind: 'degrees',
    id: 'degrees-major',
    title: 'The whole major scale',
    description: 'All seven degrees, in every key.',
    degrees: ['1', '2', '3', '4', '5', '6', '7'],
    keys: MAJOR_KEYS,
    range: MELODY,
  },
  {
    kind: 'degrees',
    id: 'degrees-blue',
    title: 'Blue notes',
    description: '♭3, ♭5 and ♭7 against the major sound — the blues inside jazz.',
    degrees: ['1', 'b3', '3', 'b5', '5', '6', 'b7'],
    keys: MAJOR_KEYS,
    range: MELODY,
  },
  {
    kind: 'degrees',
    id: 'degrees-chromatic',
    title: 'All twelve degrees',
    description: 'Every chromatic note in every key. Adaptive to your weak spots.',
    degrees: ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'],
    keys: MAJOR_KEYS,
    range: MELODY,
  },
  {
    kind: 'functions',
    id: 'functions-primary',
    title: 'I, IV and V',
    description: 'Home, away and tension — the three pillars.',
    functions: ['I', 'IV', 'V'],
    keys: EASY_KEYS,
  },
  {
    kind: 'functions',
    id: 'functions-ii-v-vi',
    title: 'Add ii and vi',
    description: 'The chords of the turnaround: I\u2060–\u2060vi\u2060–\u2060ii\u2060–\u2060V.',
    functions: ['I', 'ii', 'IV', 'V', 'vi'],
    keys: EASY_KEYS,
  },
  {
    kind: 'functions',
    id: 'functions-all',
    title: 'All diatonic 7th chords',
    description: 'Every chord of the major key, in every key.',
    functions: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'],
    keys: MAJOR_KEYS,
  },
  {
    kind: 'progressions',
    id: 'progressions-ii-v',
    title: 'Major or minor ii\u2060–\u2060V',
    description: 'The most important sound in jazz, in both flavours.',
    progressions: ['ii-V-I', 'ii-V-i'],
    keys: EASY_KEYS,
  },
  {
    kind: 'progressions',
    id: 'progressions-turnarounds',
    title: 'Turnarounds',
    description: 'Four ways back to the top of the tune.',
    progressions: ['I-vi-ii-V', 'I-VI7-ii-V', 'iii-VI7-ii-V', 'I-vi-ii-bII7'],
    keys: EASY_KEYS,
  },
  {
    kind: 'progressions',
    id: 'progressions-colours',
    title: 'Reharmonised turnarounds',
    description: 'Tritone subs, the Dameron turnaround and the backdoor ii\u2060–\u2060V.',
    progressions: ['I-vi-ii-V', 'I-vi-ii-bII7', 'dameron', 'backdoor'],
    keys: MAJOR_KEYS,
  },
  {
    kind: 'progressions',
    id: 'progressions-standards',
    title: 'Building blocks of standards',
    description: 'Rhythm-changes bridge, blues, backdoor and ii\u2060–\u2060V\u2060–\u2060I.',
    progressions: ['ii-V-I', 'rhythm-bridge', 'blues-start', 'backdoor'],
    keys: MAJOR_KEYS,
  },
  {
    kind: 'progressions',
    id: 'progressions-all',
    title: 'All progressions',
    description: 'Every progression, every key. Adaptive to your weak spots.',
    progressions: [
      'ii-V-I', 'ii-V-i', 'I-vi-ii-V', 'I-VI7-ii-V', 'iii-VI7-ii-V',
      'I-vi-ii-bII7', 'dameron', 'backdoor', 'rhythm-bridge', 'blues-start',
    ],
    keys: MAJOR_KEYS,
  },
];

/** Home-screen sections, in order. Each lists the drill kinds it shows. */
export const DRILL_GROUPS: { kinds: DrillConfig['kind'][]; title: string }[] = [
  { kinds: ['intervals'], title: 'Intervals' },
  { kinds: ['chords'], title: 'Chord qualities' },
  { kinds: ['degrees', 'functions'], title: 'Functional hearing' },
  { kinds: ['progressions'], title: 'Progressions' },
];

export function findDrill(id: string): DrillConfig | undefined {
  return DRILLS.find((d) => d.id === id);
}
