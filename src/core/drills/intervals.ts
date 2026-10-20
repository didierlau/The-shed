import { Note } from 'tonal';
import { INTERVALS, semitones, type IntervalName } from '../intervals';
import { randomInt, pick, weightedPick } from '../random';
import { practiceWeight, type StatsTable } from '../stats';
import type { Question, Rng } from '../types';

export type IntervalDirection = 'up' | 'down' | 'harmonic';

/**
 * Configuration for an interval drill. New levels are new configs —
 * see `catalog.ts` — not new code.
 */
export interface IntervalDrillConfig {
  kind: 'intervals';
  id: string;
  title: string;
  description: string;
  intervals: IntervalName[];
  /** One or more directions; each question picks one at random. */
  directions: IntervalDirection[];
  /** Lowest and highest note that may be played, e.g. "C3" and "C5". */
  range: [string, string];
}

/**
 * Create one question. If `stats` is given, intervals you get wrong more often
 * are picked more often (adaptive practice).
 */
export function generateIntervalQuestion(
  config: IntervalDrillConfig,
  rng: Rng,
  stats: StatsTable = {},
): Question {
  if (config.intervals.length === 0) throw new Error(`Drill "${config.id}" has no intervals`);

  const interval = weightedPick(rng, config.intervals, (i) => practiceWeight(stats[i]));
  const direction = pick(rng, config.directions);
  const size = semitones(interval);

  const low = Note.midi(config.range[0]);
  const high = Note.midi(config.range[1]);
  if (low === null || high === null || high - low < size) {
    throw new Error(`Drill "${config.id}" range ${config.range.join('–')} is too small for ${interval}`);
  }

  const bottomMidi = randomInt(rng, low, high - size);
  const bottom = Note.fromMidi(bottomMidi);
  const top = Note.fromMidi(bottomMidi + size);

  const playback =
    direction === 'harmonic'
      ? [{ notes: [bottom, top], beats: 2 }]
      : direction === 'up'
        ? [{ notes: [bottom], beats: 1 }, { notes: [top], beats: 1.5 }]
        : [{ notes: [top], beats: 1 }, { notes: [bottom], beats: 1.5 }];

  const arrow = direction === 'harmonic' ? '+' : '→';
  const [first, second] = direction === 'down' ? [top, bottom] : [bottom, top];

  return {
    playback,
    prompt: 'Name the interval you hear.',
    choices: config.intervals.map((value) => ({ value, label: INTERVALS[value].label })),
    answer: interval,
    reveal: `${INTERVALS[interval].label}: ${first} ${arrow} ${second}`,
  };
}
