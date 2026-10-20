import type { StatsTable } from '../stats';
import type { Question, Rng } from '../types';
import type { DrillConfig } from './catalog';
import { generateIntervalQuestion } from './intervals';
import { generateChordQuestion } from './chords';
import { generateDegreeQuestion, generateFunctionQuestion } from './functional';
import { generateProgressionQuestion } from './progressions';
import { generateVoicingQuestion } from './voicings';

export { DRILLS, DRILL_GROUPS, findDrill, type DrillConfig } from './catalog';

/**
 * Single entry point the UI uses to get a question for any drill.
 * When a new drill kind is added, add a case here — the UI stays unchanged.
 */
export function generateQuestion(config: DrillConfig, rng: Rng, stats?: StatsTable): Question {
  switch (config.kind) {
    case 'intervals':
      return generateIntervalQuestion(config, rng, stats);
    case 'chords':
      return generateChordQuestion(config, rng, stats);
    case 'degrees':
      return generateDegreeQuestion(config, rng, stats);
    case 'functions':
      return generateFunctionQuestion(config, rng, stats);
    case 'progressions':
      return generateProgressionQuestion(config, rng, stats);
    case 'voicings':
      return generateVoicingQuestion(config, rng, stats);
  }
}
