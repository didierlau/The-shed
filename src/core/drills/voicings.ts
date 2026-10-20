import { Note } from 'tonal';
import { pick, weightedPick } from '../random';
import { practiceWeight, type StatsTable } from '../stats';
import type { Question, Rng } from '../types';
import {
  buildVoicing,
  spellVoicing,
  supports,
  VOICING_QUALITY_SYMBOL,
  VOICINGS,
  type VoicingQuality,
  type VoicingType,
} from '../voicings';

/** Hear one chord voiced a particular way and name the voicing. */
export interface VoicingDrillConfig {
  kind: 'voicings';
  id: string;
  title: string;
  description: string;
  voicings: VoicingType[];
  /** Chord qualities to voice. Each question uses one the chosen voicing supports. */
  qualities: VoicingQuality[];
}

export function generateVoicingQuestion(config: VoicingDrillConfig, rng: Rng, stats: StatsTable = {}): Question {
  const usable = config.voicings.filter((v) => config.qualities.some((q) => supports(v, q)));
  if (usable.length === 0) throw new Error(`Drill "${config.id}" has no usable voicings`);

  const type = weightedPick(rng, usable, (v) => practiceWeight(stats[v]));
  const quality = pick(rng, config.qualities.filter((q) => supports(type, q)));
  const rootMidi = Note.midi('C2')! + Math.floor(rng() * 12);
  const notes = buildVoicing(rootMidi, quality, type).map((m) => Note.fromMidi(m));
  const upper = notes.slice(1);
  const { root, spelled } = bestSpelling(rootMidi, quality, type);

  return {
    // Bass and voicing together, then the voicing rolled upwards so each note can be heard, then together again.
    playback: [
      { notes, beats: 2.5 },
      ...upper.map((n) => ({ notes: [n], beats: 0.5 })),
      { notes, beats: 3 },
    ],
    prompt: 'Which voicing is this?',
    choices: config.voicings.map((value) => ({ value, label: VOICINGS[value].label, detail: VOICINGS[value].detail })),
    answer: type,
    reveal: `${VOICINGS[type].label} on ${root}${VOICING_QUALITY_SYMBOL[quality]}: ${spelled.join(' ')}`,
  };
}

/** Name the root flat or sharp, whichever spells the voicing with fewer accidentals (F#m7, not Gbm7). */
function bestSpelling(rootMidi: number, quality: VoicingQuality, type: VoicingType) {
  const names = [...new Set([Note.pitchClass(Note.fromMidi(rootMidi)), Note.pitchClass(Note.fromMidiSharps(rootMidi))])];
  const options = names.map((root) => {
    const spelled = spellVoicing(root, quality, type);
    const cost = [root, ...spelled].reduce((sum, n) => sum + Note.get(n).acc.length, 0);
    return { root, spelled, cost };
  });
  options.sort((a, b) => a.cost - b.cost);
  return options[0]!;
}
