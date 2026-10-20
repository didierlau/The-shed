import { CHORD_QUALITIES, type ChordQuality } from '../chords';
import { ALL_INTERVALS, INTERVALS, type IntervalName } from '../intervals';
import { DEGREES, FUNCTIONS, MAJOR_KEYS, type Degree, type HarmonicFunction } from '../keys';
import { PROGRESSIONS, type ProgressionName } from '../progressions';
import type { Choice } from '../types';
import { VOICINGS, type VoicingType } from '../voicings';
import type { IntervalDirection } from './intervals';
import type { DrillConfig } from './catalog';

/**
 * "Build your own" practice: for each drill kind, the items you can tick
 * (intervals, chord qualities, progressions…) and a few options, turned
 * into an ordinary drill config. Pure data in, config out.
 */

export type DrillKind = DrillConfig['kind'];

export interface CustomOption {
  id: string;
  label: string;
  choices: Choice[];
  /** Several choices may be on at once (e.g. up + down), or exactly one. */
  multi: boolean;
  default: string[];
}

export interface CustomSpec {
  kind: DrillKind;
  /** What the items are called, e.g. "chord qualities". */
  noun: string;
  items: Choice[];
  defaultItems: string[];
  options: CustomOption[];
}

/** What the user picked. Stored as-is, so it must stay plain JSON. */
export interface CustomSelection {
  items: string[];
  options: Record<string, string[]>;
}

export const MIN_ITEMS = 2;

const KEYS_OPTION: CustomOption = {
  id: 'keys',
  label: 'Keys',
  choices: [
    { value: 'easy', label: 'C, F, B♭, G' },
    { value: 'all', label: 'All 12' },
  ],
  multi: false,
  default: ['easy'],
};

const EASY_KEYS = ['C', 'F', 'Bb', 'G'] as const;

/**
 * Items in an explicit musical order. (Object.keys can't be trusted for this:
 * JavaScript lists number-like keys such as "6" and "7" first.)
 */
const entries = <K extends string, V extends { label: string; detail?: string }>(
  order: readonly K[],
  table: Record<K, V>,
): Choice[] => order.map((value) => ({ value, label: table[value].label, detail: table[value].detail }));

const CHORD_ORDER: ChordQuality[] = ['M', 'm', 'dim', 'aug', 'maj7', '7', 'm7', 'm7b5', 'dim7', 'mMaj7', '6', 'm6', '7sus4', '7b9'];
const DEGREE_ORDER: Degree[] = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
const FUNCTION_ORDER: HarmonicFunction[] = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];

export const CUSTOM_SPECS: Record<DrillKind, CustomSpec> = {
  intervals: {
    kind: 'intervals',
    noun: 'intervals',
    items: entries(ALL_INTERVALS, INTERVALS),
    defaultItems: ['3m', '3M', '5P'],
    options: [
      {
        id: 'directions',
        label: 'Played',
        choices: [
          { value: 'up', label: 'Up' },
          { value: 'down', label: 'Down' },
          { value: 'harmonic', label: 'Together' },
        ],
        multi: true,
        default: ['up'],
      },
    ],
  },
  chords: {
    kind: 'chords',
    noun: 'chord qualities',
    items: entries(CHORD_ORDER, CHORD_QUALITIES),
    defaultItems: ['maj7', '7', 'm7'],
    options: [
      {
        id: 'playback',
        label: 'Played',
        choices: [
          { value: 'arpeggio', label: 'Note by note, then together' },
          { value: 'block', label: 'Together' },
        ],
        multi: false,
        default: ['arpeggio'],
      },
    ],
  },
  degrees: {
    kind: 'degrees',
    noun: 'scale degrees',
    items: entries(DEGREE_ORDER, DEGREES),
    defaultItems: ['1', '3', '5'],
    options: [KEYS_OPTION],
  },
  functions: {
    kind: 'functions',
    noun: 'chord functions',
    items: entries(FUNCTION_ORDER, FUNCTIONS),
    defaultItems: ['I', 'IV', 'V'],
    options: [KEYS_OPTION],
  },
  progressions: {
    kind: 'progressions',
    noun: 'progressions',
    items: entries(Object.keys(PROGRESSIONS) as ProgressionName[], PROGRESSIONS as Record<ProgressionName, { label: string; detail?: string }>),
    defaultItems: ['ii-V-I', 'ii-V-i'],
    options: [KEYS_OPTION],
  },
  voicings: {
    kind: 'voicings',
    noun: 'voicings',
    items: entries(Object.keys(VOICINGS) as VoicingType[], VOICINGS),
    defaultItems: ['close', 'shell', 'drop2'],
    options: [],
  },
};

export function customDrillId(kind: DrillKind): string {
  return `custom-${kind}`;
}

export function customKindFromId(id: string): DrillKind | null {
  const kind = id.startsWith('custom-') ? id.slice('custom-'.length) : '';
  return kind in CUSTOM_SPECS ? (kind as DrillKind) : null;
}

export function defaultSelection(kind: DrillKind): CustomSelection {
  const spec = CUSTOM_SPECS[kind];
  return {
    items: [...spec.defaultItems],
    options: Object.fromEntries(spec.options.map((o) => [o.id, [...o.default]])),
  };
}

/**
 * Clean up a stored selection: drop unknown values, keep catalogue order,
 * and fall back to defaults where nothing valid is left.
 */
export function normaliseSelection(kind: DrillKind, selection: Partial<CustomSelection> | undefined): CustomSelection {
  const spec = CUSTOM_SPECS[kind];
  const fallback = defaultSelection(kind);
  const picked = new Set(selection?.items ?? []);
  const items = spec.items.map((i) => i.value).filter((v) => picked.has(v));
  const options: Record<string, string[]> = {};
  for (const o of spec.options) {
    const valid = o.choices.map((c) => c.value).filter((v) => selection?.options?.[o.id]?.includes(v));
    const kept = o.multi ? valid : valid.slice(0, 1);
    options[o.id] = kept.length > 0 ? kept : fallback.options[o.id]!;
  }
  return { items: items.length >= MIN_ITEMS ? items : fallback.items, options };
}

/** Turn a selection into a drill config the normal drill session can run. */
export function buildCustomDrill(kind: DrillKind, raw: Partial<CustomSelection> | undefined): DrillConfig {
  const sel = normaliseSelection(kind, raw);
  const spec = CUSTOM_SPECS[kind];
  const labels = spec.items.filter((i) => sel.items.includes(i.value)).map((i) => i.label);
  const base = {
    id: customDrillId(kind),
    title: 'Your mix',
    description: labels.join(', '),
  };
  const keys = sel.options.keys?.[0] === 'all' ? MAJOR_KEYS : EASY_KEYS;

  switch (kind) {
    case 'intervals':
      return {
        ...base,
        kind,
        intervals: sel.items as IntervalName[],
        directions: sel.options.directions as IntervalDirection[],
      };
    case 'chords':
      return {
        ...base,
        kind,
        qualities: sel.items as ChordQuality[],
        voicing: 'close',
        playback: sel.options.playback![0] === 'block' ? 'block' : 'arpeggio',
      };
    case 'degrees':
      return { ...base, kind, degrees: sel.items as Degree[], keys };
    case 'functions':
      return { ...base, kind, functions: sel.items as HarmonicFunction[], keys };
    case 'progressions':
      return { ...base, kind, progressions: sel.items as ProgressionName[], keys };
    case 'voicings':
      return { ...base, kind, voicings: sel.items as VoicingType[], qualities: ['maj7', 'm7', '7', 'm7b5'] };
  }
}
