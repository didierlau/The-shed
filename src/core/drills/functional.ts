import { Note } from 'tonal';
import {
  cadence,
  DEGREES,
  degreeNote,
  FUNCTIONS,
  functionChord,
  functionSymbol,
  resolutionPath,
  type Degree,
  type HarmonicFunction,
  type MajorKey,
} from '../keys';
import { pick, weightedPick } from '../random';
import { practiceWeight, type StatsTable } from '../stats';
import type { Question, Rng } from '../types';

/**
 * Functional hearing: a ii–V–I sets the key, then you name what you hear
 * relative to it — a single note's scale degree, or a chord's function.
 */

export interface DegreeDrillConfig {
  kind: 'degrees';
  id: string;
  title: string;
  description: string;
  degrees: Degree[];
  keys: readonly MajorKey[];
  /** Range the question note is played in, e.g. ["A3", "A4"]. */
  range: [string, string];
}

export interface FunctionDrillConfig {
  kind: 'functions';
  id: string;
  title: string;
  description: string;
  functions: HarmonicFunction[];
  keys: readonly MajorKey[];
}

export function generateDegreeQuestion(config: DegreeDrillConfig, rng: Rng, stats: StatsTable = {}): Question {
  if (config.degrees.length === 0) throw new Error(`Drill "${config.id}" has no degrees`);
  const key = pick(rng, config.keys);
  const degree = weightedPick(rng, config.degrees, (d) => practiceWeight(stats[d]));

  // Every MIDI note in range that is this degree of this key.
  const low = Note.midi(config.range[0])!;
  const high = Note.midi(config.range[1])!;
  const chroma = (Note.chroma(key)! + DEGREES[degree].semitones) % 12;
  const candidates: number[] = [];
  for (let m = low; m <= high; m++) if (m % 12 === chroma) candidates.push(m);
  if (candidates.length === 0) throw new Error(`Drill "${config.id}" range is too small`);
  const target = pick(rng, candidates);

  const tonic = target - DEGREES[degree].semitones;
  const path = resolutionPath(degree);

  return {
    playback: [...cadence(key), { notes: [Note.fromMidi(target)], beats: 2 }],
    prompt: 'Which scale degree is the note after the cadence?',
    choices: config.degrees.map((value) => ({ value, label: DEGREES[value].label })),
    answer: degree,
    reveal: `${DEGREES[degree].label} in ${key}: ${degreeNote(key, degree)}`,
    resolution: path.map((s, i) => ({ notes: [Note.fromMidi(tonic + s)], beats: i === path.length - 1 ? 1.5 : 0.6 })),
  };
}

export function generateFunctionQuestion(config: FunctionDrillConfig, rng: Rng, stats: StatsTable = {}): Question {
  if (config.functions.length === 0) throw new Error(`Drill "${config.id}" has no functions`);
  const key = pick(rng, config.keys);
  const fn = weightedPick(rng, config.functions, (f) => practiceWeight(stats[f]));

  return {
    playback: [...cadence(key), { notes: functionChord(key, fn), beats: 3 }],
    prompt: 'Which chord of the key comes after the cadence?',
    choices: config.functions.map((value) => ({ value, label: FUNCTIONS[value].label })),
    answer: fn,
    reveal: `${FUNCTIONS[fn].label} in ${key}: ${functionSymbol(key, fn)}`,
    resolution: fn === 'I' ? undefined : [{ notes: functionChord(key, 'I'), beats: 2.5 }],
  };
}
