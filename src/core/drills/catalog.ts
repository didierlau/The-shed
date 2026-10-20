import { ALL_INTERVALS } from '../intervals';
import type { IntervalDrillConfig } from './intervals';
import type { ChordDrillConfig } from './chords';
import type { DegreeDrillConfig, FunctionDrillConfig } from './functional';
import type { ProgressionDrillConfig } from './progressions';
import type { VoicingDrillConfig } from './voicings';
import { MAJOR_KEYS } from '../keys';

/**
 * All drills in the app, in suggested order.
 * Adding a level = adding an entry here. New drill kinds join this union.
 */
export type DrillConfig =
  | IntervalDrillConfig
  | ChordDrillConfig
  | DegreeDrillConfig
  | FunctionDrillConfig
  | ProgressionDrillConfig
  | VoicingDrillConfig;

const EASY_KEYS = ['C', 'F', 'Bb', 'G'] as const;

export const DRILLS: DrillConfig[] = [
  {
    kind: 'intervals',
    id: 'intervals-perfect',
    title: 'Perfect intervals',
    description: '4ths, 5ths and octaves — the skeleton of harmony.',
    intervals: ['4P', '5P', '8P'],
    directions: ['up'],
  },
  {
    kind: 'intervals',
    id: 'intervals-thirds',
    title: 'Thirds',
    description: 'Major vs minor 3rd: the sound of chord quality.',
    intervals: ['3m', '3M'],
    directions: ['up', 'down'],
  },
  {
    kind: 'intervals',
    id: 'intervals-seconds',
    title: 'Seconds',
    description: 'Half and whole steps — the building blocks of lines.',
    intervals: ['2m', '2M'],
    directions: ['up', 'down'],
  },
  {
    kind: 'intervals',
    id: 'intervals-sevenths',
    title: '6ths & 7ths',
    description: 'The colours that make jazz chords sound like jazz.',
    intervals: ['6m', '6M', '7m', '7M'],
    directions: ['up', 'down'],
  },
  {
    kind: 'intervals',
    id: 'intervals-guide-tones',
    title: 'Guide tones',
    description: 'Tritone, 3rds and 7ths stacked together — hear the shells.',
    intervals: ['3m', '3M', '4A', '7m', '7M'],
    directions: ['harmonic'],
  },
  {
    kind: 'intervals',
    id: 'intervals-all',
    title: 'All intervals',
    description: 'Everything, melodic and harmonic. Adaptive to your weak spots.',
    intervals: ALL_INTERVALS,
    directions: ['up', 'down', 'harmonic'],
  },
  {
    kind: 'chords',
    id: 'chords-triads-basic',
    title: 'Major & minor triads',
    description: 'The first colour choice: bright or dark.',
    qualities: ['M', 'm'],
    voicing: 'close',
    playback: 'arpeggio',
  },
  {
    kind: 'chords',
    id: 'chords-triads-all',
    title: 'All triads',
    description: 'Major, minor, diminished and augmented.',
    qualities: ['M', 'm', 'dim', 'aug'],
    voicing: 'close',
    playback: 'arpeggio',
  },
  {
    kind: 'chords',
    id: 'chords-sevenths-core',
    title: 'The big three 7ths',
    description: 'Maj7, dominant 7 and m7 — the chords of the ii\u2060–\u2060V\u2060–\u2060I.',
    qualities: ['maj7', '7', 'm7'],
    voicing: 'close',
    playback: 'arpeggio',
  },
  {
    kind: 'chords',
    id: 'chords-sevenths-minor-ii-v',
    title: 'Minor ii\u2060–\u2060V colours',
    description: 'Add half-diminished and diminished 7 to the big three.',
    qualities: ['maj7', '7', 'm7', 'm7b5', 'dim7'],
    voicing: 'close',
    playback: 'arpeggio',
  },
  {
    kind: 'chords',
    id: 'chords-sixths',
    title: '6ths & minor-major',
    description: 'Tonic colours: 6, m6 and mMaj7 against maj7 and m7.',
    qualities: ['6', 'm6', 'mMaj7', 'maj7', 'm7'],
    voicing: 'close',
    playback: 'block',
  },
  {
    kind: 'chords',
    id: 'chords-shells',
    title: 'Shell voicings',
    description: 'Root, 3rd and 7th only — how they sound when you comp.',
    qualities: ['maj7', '7', 'm7', '6', '7sus4'],
    voicing: 'shell',
    playback: 'block',
  },
  {
    kind: 'chords',
    id: 'chords-all',
    title: 'All chord qualities',
    description: 'Every 7th and 6th chord, played together. Adaptive to your weak spots.',
    qualities: ['maj7', '7', 'm7', 'm7b5', 'dim7', 'mMaj7', '6', 'm6', '7sus4'],
    voicing: 'close',
    playback: 'block',
  },
  {
    kind: 'degrees',
    id: 'degrees-triad',
    title: '1, 3 and 5',
    description: 'Hear the tonic triad notes against a ii\u2060–\u2060V\u2060–\u2060I.',
    degrees: ['1', '3', '5'],
    keys: EASY_KEYS,
  },
  {
    kind: 'degrees',
    id: 'degrees-lower',
    title: '1 to 5',
    description: 'Add 2 and 4: the lower half of the scale.',
    degrees: ['1', '2', '3', '4', '5'],
    keys: EASY_KEYS,
  },
  {
    kind: 'degrees',
    id: 'degrees-major',
    title: 'The whole major scale',
    description: 'All seven degrees, in every key.',
    degrees: ['1', '2', '3', '4', '5', '6', '7'],
    keys: MAJOR_KEYS,
  },
  {
    kind: 'degrees',
    id: 'degrees-blue',
    title: 'Blue notes',
    description: '♭3, ♭5 and ♭7 against the major sound — the blues inside jazz.',
    degrees: ['1', 'b3', '3', 'b5', '5', '6', 'b7'],
    keys: MAJOR_KEYS,
  },
  {
    kind: 'degrees',
    id: 'degrees-chromatic',
    title: 'All twelve degrees',
    description: 'Every chromatic note in every key. Adaptive to your weak spots.',
    degrees: ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'],
    keys: MAJOR_KEYS,
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
  {
    kind: 'voicings',
    id: 'voicings-basics',
    title: 'Close, shell or drop-2',
    description: 'Three ways to play the same 7th chord.',
    voicings: ['close', 'shell', 'drop2'],
    qualities: ['maj7', 'm7', '7'],
  },
  {
    kind: 'voicings',
    id: 'voicings-rootless',
    title: 'Rootless A or B',
    description: 'The Bill Evans left-hand voicings: 3 on the bottom, or 7.',
    voicings: ['rootlessA', 'rootlessB'],
    qualities: ['maj7', 'm7', '7', 'm7b5'],
  },
  {
    kind: 'voicings',
    id: 'voicings-comping',
    title: 'Comping voicings',
    description: 'Shell, drop-2 and both rootless shapes.',
    voicings: ['shell', 'drop2', 'rootlessA', 'rootlessB'],
    qualities: ['maj7', 'm7', '7', 'm7b5'],
  },
  {
    kind: 'voicings',
    id: 'voicings-modern',
    title: 'Modern colours',
    description: 'So What 4ths and upper-structure triads against rootless and drop-2.',
    voicings: ['soWhat', 'upperStructure', 'rootlessA', 'drop2'],
    qualities: ['m7', '7'],
  },
  {
    kind: 'voicings',
    id: 'voicings-all',
    title: 'All voicings',
    description: 'Every voicing on every chord it fits. Adaptive to your weak spots.',
    voicings: ['close', 'shell', 'drop2', 'rootlessA', 'rootlessB', 'soWhat', 'upperStructure'],
    qualities: ['maj7', 'm7', '7', 'm7b5'],
  },
];

/** Home-screen sections, in order. Each lists the drill kinds it shows. */
export interface DrillGroup {
  id: string;
  title: string;
  description: string;
  kinds: DrillConfig['kind'][];
}

export const DRILL_GROUPS: DrillGroup[] = [
  { id: 'intervals', title: 'Intervals', description: 'The distance between two notes.', kinds: ['intervals'] },
  { id: 'chords', title: 'Chord qualities', description: 'Triads, 7ths, 6ths and shells.', kinds: ['chords'] },
  {
    id: 'functional',
    title: 'Functional hearing',
    description: 'Notes and chords in a key, after a ii\u2060–\u2060V\u2060–\u2060I.',
    kinds: ['degrees', 'functions'],
  },
  { id: 'progressions', title: 'Progressions', description: 'ii\u2060–\u2060Vs, turnarounds and reharmonisations.', kinds: ['progressions'] },
  { id: 'voicings', title: 'Jazz voicings', description: 'Shells, drop-2, rootless, So What.', kinds: ['voicings'] },
];

export function findGroup(id: string): DrillGroup | undefined {
  return DRILL_GROUPS.find((g) => g.id === id);
}

export function groupOfKind(kind: DrillConfig['kind']): DrillGroup {
  return DRILL_GROUPS.find((g) => g.kinds.includes(kind))!;
}

export function findDrill(id: string): DrillConfig | undefined {
  return DRILLS.find((d) => d.id === id);
}
