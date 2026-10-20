import { Note } from 'tonal';
import { INTERVALS, semitones, type IntervalName } from '../intervals';
import { randomInt, pick, weightedPick } from '../random';
import { practiceWeight, type StatsTable } from '../stats';
import type { Question, Rng } from '../types';
import { DEFAULT_SETTINGS, type NoteRange } from '../settings';

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
}

/**
 * Create one question, with both notes inside `range`. If `stats` is given,
 * intervals you get wrong more often are picked more often (adaptive practice).
 */
export function generateIntervalQuestion(
  config: IntervalDrillConfig,
  rng: Rng,
  stats: StatsTable = {},
  range: NoteRange = DEFAULT_SETTINGS.range,
): Question {
  if (config.intervals.length === 0) throw new Error(`Drill "${config.id}" has no intervals`);

  const interval = weightedPick(rng, config.intervals, (i) => practiceWeight(stats[i]));
  const direction = pick(rng, config.directions);
  const size = semitones(interval);

  const { low, high } = range;
  if (high - low < size) throw new Error(`Range is too small for ${interval}`);

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
  const spelled = spellInterval(bottomMidi, interval);
  const [first, second] = direction === 'down' ? [spelled.top, spelled.bottom] : [spelled.bottom, spelled.top];

  return {
    playback,
    prompt: 'Name the interval you hear.',
    choices: config.intervals.map((value) => ({ value, label: INTERVALS[value].label })),
    answer: interval,
    reveal: `${INTERVALS[interval].label}: ${first} ${arrow} ${second}`,
  };
}

/**
 * Spell an interval so its name matches what was asked: a major 6th from A is
 * F#, not Gb. Of the flat and sharp names for the bottom note, the one giving
 * fewer accidentals wins (Bb–D rather than A#–C##).
 */
export function spellInterval(bottomMidi: number, interval: IntervalName): { bottom: string; top: string } {
  const names = [...new Set([Note.fromMidi(bottomMidi), Note.fromMidiSharps(bottomMidi)])];
  const options = names.map((bottom) => {
    const top = Note.transpose(bottom, interval);
    return { bottom, top, cost: Note.get(bottom).acc.length + Note.get(top).acc.length };
  });
  options.sort((a, b) => a.cost - b.cost);
  return { bottom: options[0]!.bottom, top: options[0]!.top };
}
