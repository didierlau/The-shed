import type { StatsTable } from '../stats';
import type { Question, Rng } from '../types';
import { DEFAULT_SETTINGS, type Settings } from '../settings';
import type { DrillConfig } from './catalog';
import { generateIntervalQuestion } from './intervals';
import { generateChordQuestion } from './chords';
import { generateDegreeQuestion, generateFunctionQuestion } from './functional';
import { generateProgressionQuestion } from './progressions';
import { generateVoicingQuestion } from './voicings';

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
 * The note range applies to intervals, chord qualities and scale degrees;
 * functions, progressions and voicings stay in their comping register.
 */
export function generateQuestion(
  config: DrillConfig,
  rng: Rng,
  stats?: StatsTable,
  settings: Settings = DEFAULT_SETTINGS,
): Question {
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
  }
}
