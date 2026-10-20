import { PROGRESSIONS, progressionPlayback, progressionSymbols, type ProgressionName } from '../progressions';
import type { MajorKey } from '../keys';
import { pick, weightedPick } from '../random';
import { practiceWeight, type StatsTable } from '../stats';
import type { Question, Rng } from '../types';

/** Hear a whole progression in a random key and name it. */
export interface ProgressionDrillConfig {
  kind: 'progressions';
  id: string;
  title: string;
  description: string;
  progressions: ProgressionName[];
  keys: readonly MajorKey[];
}

export function generateProgressionQuestion(
  config: ProgressionDrillConfig,
  rng: Rng,
  stats: StatsTable = {},
): Question {
  if (config.progressions.length === 0) throw new Error(`Drill "${config.id}" has no progressions`);
  const key = pick(rng, config.keys);
  const name = weightedPick(rng, config.progressions, (p) => practiceWeight(stats[p]));

  return {
    playback: progressionPlayback(key, name),
    prompt: 'Which progression did you hear?',
    choices: config.progressions.map((value) => {
      const p: { label: string; detail?: string } = PROGRESSIONS[value];
      return { value, label: p.label, detail: p.detail };
    }),
    answer: name,
    reveal: `In ${key}: ${progressionSymbols(key, name).join(' | ')}`,
  };
}
