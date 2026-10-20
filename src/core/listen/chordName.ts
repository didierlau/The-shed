import { Note } from 'tonal';

/**
 * Name the chord a set of notes forms, the way a jazz musician would write it.
 *
 * tonal's Chord.detect handles plain chords, but misses jazz staples (C E A D
 * comes out as "E7#5sus4/C" instead of C6/9) and doesn't weigh the bass note
 * or rootless voicings. So this scores jazz chord templates instead, using
 * tonal for note names.
 */

interface Template {
  symbol: string;
  /** Semitones above the root that must sound. */
  tones: number[];
  /** Extra tones that belong to the chord without being required. */
  optional?: number[];
  /** The perfect 5th clashes with this chord (♭5/♯5 chords), so it counts as a wrong note. */
  noFifth?: boolean;
  /** For "alt": at least this many of `optional` must sound. */
  minOptional?: number;
}

// Semitones: 1 ♭9 · 2 9 · 3 ♯9/m3 · 4 3 · 5 11 · 6 ♯11/♭5 · 8 ♭13/♯5 · 9 13/6 · 10 ♭7 · 11 maj7
const TEMPLATES: Template[] = [
  { symbol: '', tones: [4, 7] },
  { symbol: 'm', tones: [3, 7] },
  { symbol: 'dim', tones: [3, 6], noFifth: true },
  { symbol: 'aug', tones: [4, 8], noFifth: true },
  { symbol: 'sus4', tones: [5, 7] },
  { symbol: 'sus2', tones: [2, 7] },
  { symbol: 'add9', tones: [4, 2] },
  { symbol: '6', tones: [4, 9] },
  { symbol: '6/9', tones: [4, 9, 2] },
  { symbol: 'm6', tones: [3, 9] },
  { symbol: 'm6/9', tones: [3, 9, 2] },
  { symbol: 'maj7', tones: [4, 11] },
  { symbol: 'maj9', tones: [4, 11, 2], optional: [9] },
  { symbol: 'maj7♯11', tones: [4, 11, 6], optional: [2, 9] },
  { symbol: '7', tones: [4, 10] },
  { symbol: '9', tones: [4, 10, 2] },
  { symbol: '13', tones: [4, 10, 9], optional: [2] },
  { symbol: '7♭9', tones: [4, 10, 1] },
  { symbol: '7♯9', tones: [4, 10, 3] },
  { symbol: '7♯11', tones: [4, 10, 6], optional: [2, 9] },
  { symbol: '7♭13', tones: [4, 10, 8], noFifth: true, optional: [2] },
  { symbol: '13♭9', tones: [4, 10, 9, 1] },
  { symbol: '7alt', tones: [4, 10], optional: [1, 3, 6, 8], minOptional: 2, noFifth: true },
  { symbol: '7sus4', tones: [5, 10] },
  { symbol: '9sus4', tones: [5, 10, 2], optional: [9] },
  { symbol: 'm7', tones: [3, 10] },
  { symbol: 'm9', tones: [3, 10, 2] },
  { symbol: 'm11', tones: [3, 10, 5], optional: [2] },
  { symbol: 'm7♭5', tones: [3, 6, 10], noFifth: true, optional: [2, 5] },
  { symbol: 'dim7', tones: [3, 6, 9], noFifth: true },
  { symbol: 'm(maj7)', tones: [3, 11], optional: [2] },
  { symbol: 'maj7♯5', tones: [4, 8, 11], noFifth: true },
];

/** Root names as charts usually write them. */
const ROOT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export interface ChordGuess {
  /** e.g. "Dm7", "C6/9", "Cmaj7/E". */
  symbol: string;
  root: number;
  /** Higher is a better explanation of the notes. */
  score: number;
  /** The root isn't being played (e.g. a rootless voicing). */
  rootless: boolean;
  /** How many sounding pitch classes this name doesn't account for (0 = explains every note). */
  unexplained: number;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

function scoreTemplate(pcs: Set<number>, bass: number, root: number, t: Template): { score: number; wrong: number } | null {
  const rel = new Set([...pcs].map((pc) => mod12(pc - root)));
  if (!t.tones.every((tone) => rel.has(tone))) return null;
  const optionalHits = (t.optional ?? []).filter((o) => rel.has(o)).length;
  if (t.minOptional && optionalHits < t.minOptional) return null;

  const allowed = new Set([0, ...t.tones, ...(t.optional ?? []), ...(t.noFifth ? [] : [7])]);
  const wrong = [...rel].filter((r) => !allowed.has(r)).length;
  const rootPlayed = rel.has(0);

  let score = 10 * t.tones.length + 3 * optionalHits - 14 * wrong;
  if (rootPlayed) score += 6;
  if (mod12(bass) === root) score += 8;
  // Slash chords are less common than a chord over its own root.
  else if (rootPlayed) score -= 4;
  if (!t.noFifth && rel.has(7)) score += 1;
  // A chord with the root missing needs every tone to count: otherwise any three notes fit something.
  // Rootless readings only make sense where the 3rd defines the chord, so never for sus chords.
  if (!rootPlayed) {
    if (t.symbol.includes('sus')) return null;
    score -= 12;
  }
  return { score, wrong };
}

/**
 * Best names for the sounding notes (MIDI numbers), best first.
 * Needs at least three different pitch classes; returns [] otherwise.
 */
export function nameChord(midiNotes: number[], max = 3): ChordGuess[] {
  if (midiNotes.length === 0) return [];
  const pcs = new Set(midiNotes.map(mod12));
  if (pcs.size < 3) return [];
  const bass = Math.min(...midiNotes);

  const guesses: ChordGuess[] = [];
  for (let root = 0; root < 12; root++) {
    for (const t of TEMPLATES) {
      const result = scoreTemplate(pcs, bass, root, t);
      if (result === null) continue;
      const rootless = !pcs.has(root);
      const slash = !rootless && mod12(bass) !== root ? `/${ROOT_NAMES[mod12(bass)]}` : '';
      guesses.push({ symbol: ROOT_NAMES[root] + t.symbol + slash, root, score: result.score, rootless, unexplained: result.wrong });
    }
  }
  guesses.sort((a, b) => b.score - a.score || a.symbol.length - b.symbol.length);

  const seen = new Set<string>();
  return guesses.filter((g) => !seen.has(g.symbol) && seen.add(g.symbol)).slice(0, max);
}

/** Other names for exactly the same notes (e.g. F6/D for Dm7, or a rootless reading), best first. */
export function alternativeNames(guesses: ChordGuess[], max = 2): ChordGuess[] {
  return guesses.slice(1).filter((g) => g.unexplained === 0).slice(0, max);
}

/** Note names for display, lowest first, e.g. ["D3", "F3", "A3", "C4"]. */
export function noteNames(midiNotes: number[]): string[] {
  return [...midiNotes].sort((a, b) => a - b).map((m) => Note.fromMidi(m));
}
