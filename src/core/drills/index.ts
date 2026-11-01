import type { StatsTable } from '../stats';
import type { Question, Rng } from '../types';
import { DEFAULT_SETTINGS, type Settings } from '../settings';
import type { DrillConfig } from './catalog';
import { generateIntervalQuestion } from './intervals';
import { generateChordQuestion } from './chords';
import { generateDegreeQuestion, generateFunctionQuestion } from './functional';
import { generateProgressionQuestion } from './progressions';
import { generateVoicingQuestion } from './voicings';
import { generateScaleQuestion } from './scales';

export { DRILLS, DRILL_GROUPS, findDrill, findGroup, groupOfKind, type DrillConfig, type DrillGroup } from './catalog';
export {
  buildCustomDrill,
  CUSTOM_SPECS,
  customDrillId,
  customKindFromId,
  MIN_ITEMS,
  normaliseSelection,
  type CustomSelection,
  type CustomSpec,
  type DrillKind,
} from './custom';

/**
 * Single entry point the UI uses to get a question for any drill.
 * When a new drill kind is added, add a case here — the UI stays unchanged.
 * The note range applies to intervals, chord qualities, scale degrees and scales;
 * functions, progressions and voicings stay in their comping register.
 *
 * Pass the `previous` question and the new one won't be in the same key (or on
 * the same root) unless the drill leaves no other choice.
 */
export function generateQuestion(
  config: DrillConfig,
  rng: Rng,
  stats?: StatsTable,
  settings: Settings = DEFAULT_SETTINGS,
  previous?: Question,
): Question {
  let q = generateOnce(config, rng, stats, settings);
  for (let tries = 0; tries < MAX_TRIES && previous?.key !== undefined && q.key === previous.key; tries++) {
    q = generateOnce(config, rng, stats, settings);
  }
  return q;
}

/** Enough retries that a repeat is practically impossible whenever another key exists (1 in 4^20 with 4 keys). */
const MAX_TRIES = 20;

function generateOnce(config: DrillConfig, rng: Rng, stats: StatsTable | undefined, settings: Settings): Question {
  switch (config.kind) {
    case 'intervals':
      return generateIntervalQuestion(config, rng, stats, settings.range);
    case 'chords':
      return generateChordQuestion(config, rng, stats, settings.range);
    case 'degrees':
      return generateDegreeQuestion(config, rng, stats, settings.range);
    case 'functions':
      return generateFunctionQuestion(config, rng, stats);
    case 'progressions':
      return generateProgressionQuestion(config, rng, stats);
    case 'voicings':
      return generateVoicingQuestion(config, rng, stats);
    case 'scales':
      return generateScaleQuestion(config, rng, stats, settings.range);
  }
}
