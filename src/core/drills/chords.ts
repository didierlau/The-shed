import { Note } from 'tonal';
import { CHORD_QUALITIES, chordSemitones, shellSemitones, spellChord, type ChordQuality } from '../chords';
import { randomInt, weightedPick } from '../random';
import { practiceWeight, type StatsTable } from '../stats';
import type { PlaybackStep, Question, Rng } from '../types';

export type ChordVoicing = 'close' | 'shell';
export type ChordPlayback = 'block' | 'arpeggio';

/** Configuration for a chord-quality drill. New levels are new configs in `catalog.ts`. */
export interface ChordDrillConfig {
  kind: 'chords';
  id: string;
  title: string;
  description: string;
  qualities: ChordQuality[];
  voicing: ChordVoicing;
  /** 'arpeggio' plays the notes one by one, then together. */
  playback: ChordPlayback;
  /** Range the chord root is chosen from, e.g. ["C3", "G3"]. */
  rootRange: [string, string];
}

export function generateChordQuestion(config: ChordDrillConfig, rng: Rng, stats: StatsTable = {}): Question {
  if (config.qualities.length === 0) throw new Error(`Drill "${config.id}" has no chord qualities`);

  const quality = weightedPick(rng, config.qualities, (q) => practiceWeight(stats[q]));
  const low = Note.midi(config.rootRange[0]);
  const high = Note.midi(config.rootRange[1]);
  if (low === null || high === null || high < low) {
    throw new Error(`Drill "${config.id}" has an invalid root range ${config.rootRange.join('–')}`);
  }

  const rootMidi = randomInt(rng, low, high);
  const offsets = config.voicing === 'shell' ? shellSemitones(quality) : chordSemitones(quality);
  const notes = offsets.map((o) => Note.fromMidi(rootMidi + o));

  const block: PlaybackStep = { notes, beats: 3 };
  const playback: PlaybackStep[] =
    config.playback === 'arpeggio' ? [...notes.map((n) => ({ notes: [n], beats: 0.5 })), block] : [block];

  const spelled = spellChord(rootMidi, quality, offsets);
  return {
    playback,
    prompt: 'Name the chord quality you hear.',
    choices: config.qualities.map((value) => ({ value, label: CHORD_QUALITIES[value].label })),
    answer: quality,
    reveal: `${CHORD_QUALITIES[quality].label}: ${spelled.symbol} (${spelled.notes.join(' ')})`,
  };
}
