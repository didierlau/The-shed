import { Chord, Interval, Note } from 'tonal';

/**
 * Chord-quality catalogue, keyed by tonal chord symbols.
 * `label` is what the user sees on answer buttons.
 */
export const CHORD_QUALITIES = {
  M: { label: 'Major' },
  m: { label: 'Minor' },
  dim: { label: 'Diminished' },
  aug: { label: 'Augmented' },
  maj7: { label: 'Major 7' },
  '7': { label: 'Dominant 7' },
  m7: { label: 'Minor 7' },
  m7b5: { label: 'Half-dim (m7♭5)' },
  dim7: { label: 'Diminished 7' },
  mMaj7: { label: 'Minor-major 7' },
  '6': { label: 'Major 6' },
  m6: { label: 'Minor 6' },
  '7sus4': { label: '7sus4' },
} as const;

export type ChordQuality = keyof typeof CHORD_QUALITIES;

/** Semitone offsets from the root for a quality, in close root position, e.g. m7 → [0, 3, 7, 10]. */
export function chordSemitones(quality: ChordQuality): number[] {
  const chord = Chord.getChord(quality, 'C');
  if (chord.empty) throw new Error(`Unknown chord quality "${quality}"`);
  return chord.intervals.map((i) => Interval.semitones(i) ?? 0);
}

/**
 * Shell voicing offsets: root plus guide tones (3rd and 7th, or 6th), the way
 * jazz pianists comp with the left hand. Falls back to the full chord for triads.
 */
export function shellSemitones(quality: ChordQuality): number[] {
  const chord = Chord.getChord(quality, 'C');
  const guide = chord.intervals.filter((i) => /^[34]/.test(i) || /^[67]/.test(i));
  const hasSeventhOrSixth = guide.some((i) => /^[67]/.test(i));
  if (!hasSeventhOrSixth) return chordSemitones(quality);
  return [0, ...guide.map((i) => Interval.semitones(i) ?? 0)];
}

/**
 * Spell a chord the way a jazz chart would: of the flat and sharp names for the root,
 * pick the one that needs the fewest accidentals (F#m7 rather than Gb–Bbb–Db–Fb).
 * Returns the symbol (e.g. "F#m7") and pitch classes of the given voicing.
 */
export function spellChord(rootMidi: number, quality: ChordQuality, offsets: number[]): { symbol: string; notes: string[] } {
  const candidates = [...new Set([Note.pitchClass(Note.fromMidi(rootMidi)), Note.pitchClass(Note.fromMidiSharps(rootMidi))])];
  const spelled = candidates.map((root) => {
    const chord = Chord.getChord(quality, root);
    const bySemitone = new Map(chord.intervals.map((iv, i) => [Interval.semitones(iv) ?? 0, chord.notes[i]!]));
    const notes = offsets.map((o) => bySemitone.get(o) ?? Note.pitchClass(Note.fromMidi(rootMidi + o)));
    const cost = notes.reduce((sum, n) => sum + Note.get(n).acc.length, 0);
    return { symbol: root + (quality === 'M' ? '' : quality), notes, cost };
  });
  spelled.sort((a, b) => a.cost - b.cost);
  const best = spelled[0]!;
  return { symbol: best.symbol, notes: best.notes };
}
