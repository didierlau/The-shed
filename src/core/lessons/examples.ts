import { Note } from 'tonal';
import { CHORD_QUALITIES, chordSemitones, spellChord, type ChordQuality } from '../chords';
import { INTERVALS, semitones, type IntervalName } from '../intervals';
import { cadence, DEGREES, FUNCTIONS, functionChord, functionSymbol, resolutionPath, type Degree, type HarmonicFunction, type MajorKey } from '../keys';
import { progressionPlayback, progressionSymbols, type ProgressionName } from '../progressions';
import { SCALES, scaleSemitones, spellScale, type ScaleName } from '../scales';
import { buildVoicing, VOICINGS, type VoicingQuality, type VoicingType } from '../voicings';
import type { PlaybackStep } from '../types';

/**
 * A sound inside a lesson, described as data. `examplePlayback` turns it into
 * notes for the player; `exampleLabel` gives the text on its play button.
 * Roots are notes with an octave ("C4"); keys are pitch classes ("F").
 */
export type LessonExample =
  | { kind: 'interval'; interval: IntervalName; root?: string; label?: string }
  | { kind: 'chord'; quality: ChordQuality; root?: string; label?: string }
  | { kind: 'scale'; scale: ScaleName; root?: string; label?: string }
  | { kind: 'progression'; progression: ProgressionName; key?: MajorKey; label?: string }
  | { kind: 'voicing'; voicing: VoicingType; quality: VoicingQuality; root?: string; label?: string }
  | { kind: 'degree'; degree: Degree; key?: MajorKey; label?: string }
  | { kind: 'function'; fn: HarmonicFunction; key?: MajorKey; label?: string }
  /** Hand-written notes, e.g. a guide-tone line. Each step is [notes, beats]. */
  | { kind: 'steps'; label: string; steps: [string[], number][] };

const midi = (note: string): number => {
  const m = Note.midi(note);
  if (m === null) throw new Error(`Bad note "${note}" in a lesson example`);
  return m;
};
const name = (m: number) => Note.fromMidi(m);

export function examplePlayback(ex: LessonExample): PlaybackStep[] {
  switch (ex.kind) {
    case 'interval': {
      // Melodic, then both notes together.
      const low = midi(ex.root ?? 'C4');
      const high = low + semitones(ex.interval);
      return [
        { notes: [name(low)], beats: 1 },
        { notes: [name(high)], beats: 1 },
        { notes: [name(low), name(high)], beats: 2.5 },
      ];
    }
    case 'chord': {
      // Arpeggiated bottom-up, then struck as a block.
      const notes = chordSemitones(ex.quality).map((o) => name(midi(ex.root ?? 'C4') + o));
      return [...notes.map((n) => ({ notes: [n], beats: 0.5 })), { notes, beats: 3 }];
    }
    case 'scale': {
      // Up to the octave and back, over a root drone an octave below.
      const root = midi(ex.root ?? 'C4');
      const up = [...scaleSemitones(ex.scale), 12].map((o) => name(root + o));
      const line = [...up, ...up.slice(0, -1).reverse()];
      return line.map((n, i) => ({
        notes: [n],
        beats: i === line.length - 1 ? 1.5 : 0.5,
        held: i === 0 ? { notes: [name(root - 12)], beats: line.length * 0.5 + 1 } : undefined,
      }));
    }
    case 'progression':
      return progressionPlayback(ex.key ?? 'C', ex.progression);
    case 'voicing':
      return [{ notes: buildVoicing(midi(ex.root ?? 'C3'), ex.quality, ex.voicing).map(name), beats: 3.5 }];
    case 'degree': {
      const key = ex.key ?? 'C';
      const tonic = midi(key + '4');
      const path = resolutionPath(ex.degree);
      return [
        ...cadence(key),
        { notes: [name(tonic + DEGREES[ex.degree].semitones)], beats: 2 },
        ...path.slice(1).map((s, i) => ({ notes: [name(tonic + s)], beats: i === path.length - 2 ? 1.5 : 0.6 })),
      ];
    }
    case 'function': {
      const key = ex.key ?? 'C';
      return [...cadence(key), { notes: functionChord(key, ex.fn), beats: 3 }];
    }
    case 'steps':
      return ex.steps.map(([notes, beats]) => {
        notes.forEach(midi);
        return { notes, beats };
      });
  }
}

export function exampleLabel(ex: LessonExample): string {
  if (ex.label) return ex.label;
  switch (ex.kind) {
    case 'interval':
      return INTERVALS[ex.interval].label;
    case 'chord':
      return `${spellChord(midi(ex.root ?? 'C4'), ex.quality, [0]).symbol} · ${CHORD_QUALITIES[ex.quality].label}`;
    case 'scale':
      return `${spellScale(midi(ex.root ?? 'C4'), ex.scale).root} ${SCALES[ex.scale].label}`;
    case 'progression':
      return progressionSymbols(ex.key ?? 'C', ex.progression)
        .filter((s, i, all) => i === 0 || s !== all[i - 1])
        .join(' – ');
    case 'voicing':
      return `${Note.pitchClass(ex.root ?? 'C3')}${ex.quality} · ${VOICINGS[ex.voicing].label}`;
    case 'degree':
      return `Degree ${DEGREES[ex.degree].label} in ${ex.key ?? 'C'}`;
    case 'function':
      return `${FUNCTIONS[ex.fn].label} in ${ex.key ?? 'C'} (${functionSymbol(ex.key ?? 'C', ex.fn)})`;
    case 'steps':
      return ex.label;
  }
}
