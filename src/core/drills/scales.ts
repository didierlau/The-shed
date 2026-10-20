import { Note } from 'tonal';
import { SCALES, scaleSemitones, spellScale, type ScaleName } from '../scales';
import { randomInt, weightedPick } from '../random';
import { practiceWeight, type StatsTable } from '../stats';
import { DEFAULT_SETTINGS, type NoteRange } from '../settings';
import type { PlaybackStep, Question, Rng } from '../types';

export type ScaleDirection = 'up' | 'updown';

/** Hear a scale and name it. New levels are new configs in `catalog.ts`. */
export interface ScaleDrillConfig {
  kind: 'scales';
  id: string;
  title: string;
  description: string;
  scales: ScaleName[];
  direction: ScaleDirection;
  /** Hold the root low underneath, so the scale is heard against its tonic, like a mode over its chord. */
  drone: boolean;
}

/** The scale is played inside `range`; the drone sits an octave below the root where possible. */
export function generateScaleQuestion(
  config: ScaleDrillConfig,
  rng: Rng,
  stats: StatsTable = {},
  range: NoteRange = DEFAULT_SETTINGS.range,
): Question {
  if (config.scales.length === 0) throw new Error(`Drill "${config.id}" has no scales`);
  const name = weightedPick(rng, config.scales, (s) => practiceWeight(stats[s]));

  // Up to the octave: the root again at the top closes the scale.
  const steps = [...scaleSemitones(name), 12];
  if (range.high - range.low < 12) throw new Error('Range is too small for a scale');
  const root = randomInt(rng, range.low, range.high - 12);
  const notes = steps.map((s) => Note.fromMidi(root + s));
  const line = config.direction === 'updown' ? [...notes, ...notes.slice(0, -1).reverse()] : notes;

  const playback: PlaybackStep[] = line.map((n, i) => ({ notes: [n], beats: i === line.length - 1 ? 1.5 : 0.5 }));
  if (config.drone) {
    const droneMidi = root - 12 >= 28 ? root - 12 : root;
    const total = playback.reduce((sum, s) => sum + s.beats, 0);
    playback[0] = { ...playback[0]!, held: { notes: [Note.fromMidi(droneMidi)], beats: total } };
  }

  const spelled = spellScale(root, name);
  return {
    playback,
    prompt: 'Which scale is this?',
    choices: config.scales.map((value) => ({ value, label: SCALES[value].label, detail: SCALES[value].detail })),
    answer: name,
    reveal: `${spelled.root} ${SCALES[name].label}: ${spelled.notes.join(' ')}`,
  };
}
