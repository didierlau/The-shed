import { Interval } from 'tonal';

/**
 * Interval catalogue, using tonal's interval names ("3m", "5P", ...).
 * Labels are what the user sees; `short` is for compact buttons.
 */
export const INTERVALS = {
  '2m': { label: 'Minor 2nd', short: 'm2' },
  '2M': { label: 'Major 2nd', short: 'M2' },
  '3m': { label: 'Minor 3rd', short: 'm3' },
  '3M': { label: 'Major 3rd', short: 'M3' },
  '4P': { label: 'Perfect 4th', short: 'P4' },
  '4A': { label: 'Tritone', short: 'TT' },
  '5P': { label: 'Perfect 5th', short: 'P5' },
  '6m': { label: 'Minor 6th', short: 'm6' },
  '6M': { label: 'Major 6th', short: 'M6' },
  '7m': { label: 'Minor 7th', short: 'm7' },
  '7M': { label: 'Major 7th', short: 'M7' },
  '8P': { label: 'Octave', short: 'P8' },
} as const;

export type IntervalName = keyof typeof INTERVALS;

export const ALL_INTERVALS = Object.keys(INTERVALS) as IntervalName[];

export function semitones(name: IntervalName): number {
  return Interval.semitones(name) ?? 0;
}
