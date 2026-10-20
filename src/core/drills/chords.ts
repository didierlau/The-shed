import { Note } from 'tonal';
import { CHORD_QUALITIES, chordSemitones, shellSemitones, spellChord, type ChordQuality } from '../chords';
import { randomInt, weightedPick } from '../random';
import { practiceWeight, type StatsTable } from '../stats';
import type { PlaybackStep, Question, Rng } from '../types';
import { DEFAULT_SETTINGS, type NoteRange } from '../settings';

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
}

/** The whole chord is played inside `range`; its root anywhere that leaves room for the top note. */
export function generateChordQuestion(
  config: ChordDrillConfig,
  rng: Rng,
  stats: StatsTable = {},
  range: NoteRange = DEFAULT_SETTINGS.range,
): Question {
  if (config.qualities.length === 0) throw new Error(`Drill "${config.id}" has no chord qualities`);

  const quality = weightedPick(rng, config.qualities, (q) => practiceWeight(stats[q]));
  const offsets = config.voicing === 'shell' ? shellSemitones(quality) : chordSemitones(quality);
  const span = Math.max(...offsets);
  if (range.high - range.low < span) throw new Error(`Range is too small for ${quality}`);
  const rootMidi = randomInt(rng, range.low, range.high - span);
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
