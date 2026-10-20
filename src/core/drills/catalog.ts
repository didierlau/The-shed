import { ALL_INTERVALS } from '../intervals';
import type { IntervalDrillConfig } from './intervals';

/**
 * All drills in the app, in suggested order.
 * Adding a level = adding an entry here. Future drill kinds
 * (chord qualities, functional notes, progressions, voicings) join this union.
 */
export type DrillConfig = IntervalDrillConfig;

const RANGE: [string, string] = ['C3', 'C5'];

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
];

export function findDrill(id: string): DrillConfig | undefined {
  return DRILLS.find((d) => d.id === id);
}
