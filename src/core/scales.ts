import { Interval, Note, Scale } from 'tonal';

/**
 * Scales a jazz musician uses, keyed by tonal scale names. `detail` is the
 * nickname or the chord it's usually played over, shown next to the name.
 */
export const SCALES = {
  major: { label: 'Major (Ionian)', detail: 'maj7' },
  dorian: { label: 'Dorian', detail: 'm7, the ii chord' },
  phrygian: { label: 'Phrygian', detail: 'm7, dark ♭2' },
  lydian: { label: 'Lydian', detail: 'maj7♯11' },
  mixolydian: { label: 'Mixolydian', detail: '7, the V chord' },
  aeolian: { label: 'Aeolian (natural minor)', detail: 'm7, the vi chord' },
  locrian: { label: 'Locrian', detail: 'm7♭5' },
  'melodic minor': { label: 'Melodic minor', detail: 'm(maj7), m6' },
  'harmonic minor': { label: 'Harmonic minor', detail: 'minor ii–V–i' },
  'locrian #2': { label: 'Locrian ♮2', detail: 'm7♭5, ♮9' },
  'lydian dominant': { label: 'Lydian dominant', detail: '7♯11' },
  altered: { label: 'Altered', detail: '7alt' },
  'phrygian dominant': { label: 'Phrygian dominant', detail: '7♭9♭13' },
  'half-whole diminished': { label: 'Half-whole diminished', detail: '7♭9♯9♯11 13' },
  diminished: { label: 'Whole-half diminished', detail: 'dim7' },
  'whole tone': { label: 'Whole tone', detail: '7♯5' },
  'major pentatonic': { label: 'Major pentatonic', detail: '5 notes' },
  'minor pentatonic': { label: 'Minor pentatonic', detail: '5 notes' },
  blues: { label: 'Blues', detail: 'minor pentatonic + ♭5' },
  bebop: { label: 'Bebop dominant', detail: 'Mixolydian + maj7' },
  'bebop major': { label: 'Bebop major', detail: 'major + ♯5' },
} as const;

export type ScaleName = keyof typeof SCALES;

export const SCALE_ORDER = Object.keys(SCALES) as ScaleName[];

/** Semitones above the root, ascending, e.g. dorian → [0, 2, 3, 5, 7, 9, 10]. */
export function scaleSemitones(name: ScaleName): number[] {
  const s = Scale.get(`C ${name}`);
  if (s.empty) throw new Error(`Unknown scale "${name}"`);
  return s.intervals.map((i) => Interval.semitones(i) ?? 0);
}

/**
 * The scale's note names on a root, spelled the way it's usually written: of the
 * flat and sharp names for the root, the one needing fewer accidentals wins
 * (F# Dorian rather than Gb Dorian with its double flats).
 */
export function spellScale(rootMidi: number, name: ScaleName): { root: string; notes: string[] } {
  const roots = [...new Set([Note.pitchClass(Note.fromMidi(rootMidi)), Note.pitchClass(Note.fromMidiSharps(rootMidi))])];
  const options = roots.map((root) => {
    const notes = Scale.get(`${root} ${name}`).notes;
    return { root, notes, cost: notes.reduce((sum, n) => sum + Note.get(n).acc.length, 0) };
  });
  options.sort((a, b) => a.cost - b.cost);
  return { root: options[0]!.root, notes: options[0]!.notes };
}
