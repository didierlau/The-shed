import { Chord, Interval, Note, Scale } from 'tonal';
import type { ScaleName } from '../scales';
import { NO_CHORD, type TuneKey } from './chart';

/** The broad sound of a chord, which decides how it behaves in a key. */
export type Family = 'major' | 'dominant' | 'minor' | 'half-diminished' | 'diminished' | 'augmented' | 'sus';

export interface ChordFacts {
  symbol: string;
  root: string;
  pc: number;
  family: Family;
  /** Suspended dominant (7sus4, 9sus4, 13sus…). */
  sus: boolean;
  /** Pitch-class names of the chord, root first (no slash bass). */
  notes: string[];
  /** Intervals from the root, as tonal names. */
  intervals: string[];
  bass?: string;
}

export function chordFacts(symbol: string): ChordFacts | null {
  if (symbol === NO_CHORD) return null;
  const [main = '', bass] = symbol.split('/');
  const chord = Chord.get(main);
  if (chord.empty || !chord.tonic) return null;
  const iv = chord.intervals;
  const has = (i: string) => iv.includes(i);
  let family: Family;
  let sus = false;
  if (has('3M')) family = has('7m') ? 'dominant' : has('5A') && !has('7M') ? 'augmented' : 'major';
  else if (has('3m')) family = has('5d') ? (has('7m') ? 'half-diminished' : 'diminished') : 'minor';
  else if (has('4P') || has('2M')) {
    sus = true;
    family = has('7m') ? 'dominant' : 'sus';
  } else family = 'major';
  return {
    symbol,
    root: chord.tonic,
    pc: Note.chroma(chord.tonic)!,
    family,
    sus,
    notes: chord.notes.map(simplifyDouble),
    intervals: iv,
    ...(bass ? { bass } : {}),
  };
}

function simplifyDouble(n: string): string {
  return Note.get(n).acc.length > 1 ? Note.simplify(n) : n;
}

/** 3rd and 7th (or 6th) of a chord: the notes that define it, the way pianists voice it. */
export function guideTones(f: ChordFacts): string[] {
  const pick = (want: RegExp) => {
    const i = f.intervals.findIndex((x) => want.test(x));
    return i >= 0 ? f.notes[i] : undefined;
  };
  const third = pick(/^3[mM]$/) ?? pick(/^4P$/);
  const seventh = pick(/^7[mMd]$/) ?? pick(/^6M$/);
  return [third, seventh].filter((n): n is string => !!n);
}

export const semis = (from: number, to: number) => (((to - from) % 12) + 12) % 12;

export function keyPc(key: TuneKey): number {
  return Note.chroma(key.tonic)!;
}

export function sameKey(a: TuneKey, b: TuneKey): boolean {
  return keyPc(a) === keyPc(b) && a.mode === b.mode;
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const BY_SEMITONE = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♯IV', 'V', '♭VI', 'VI', '♭VII', 'VII'];

/** Degree of a root in a key, relative to the major scale: "IV", "♭VI", "♯IV". */
export function degreeNumeral(key: TuneKey, root: string): string {
  const s = semis(keyPc(key), Note.chroma(root)!);
  const iv = Interval.get(Interval.distance(key.tonic, Note.pitchClass(root)));
  if (!iv.empty && iv.num) {
    const step = ((((iv.num > 0 ? iv.num : -iv.num) - 1) % 7) + 7) % 7;
    const alt = ((s - MAJOR_SCALE[step]! + 18) % 12) - 6;
    if (alt === 0) return NUMERALS[step]!;
    if (alt === -1) return '♭' + NUMERALS[step]!;
    if (alt === 1) return '♯' + NUMERALS[step]!;
  }
  return BY_SEMITONE[s]!;
}

/** Roman numeral with the chord's quality: "ii7", "V7", "♭VImaj7", "viiø7", "♯iv°7". */
export function romanFor(key: TuneKey, f: ChordFacts): string {
  const deg = degreeNumeral(key, f.root);
  const lower = f.family === 'minor' || f.family === 'half-diminished' || f.family === 'diminished';
  return (lower ? deg.toLowerCase() : deg) + qualitySuffix(f);
}

function qualitySuffix(f: ChordFacts): string {
  const has = (i: string) => f.intervals.includes(i);
  switch (f.family) {
    case 'major':
      return has('7M') ? 'maj7' : has('6M') ? '6' : '';
    case 'dominant':
      return f.sus ? '7sus' : '7';
    case 'minor':
      return has('7M') ? '(maj7)' : has('7m') ? '7' : has('6M') ? '6' : '';
    case 'half-diminished':
      return 'ø7';
    case 'diminished':
      return has('7d') ? '°7' : '°';
    case 'augmented':
      return '+';
    case 'sus':
      return 'sus';
  }
}

/** Which chord families are at home on each degree (semitones above the tonic). */
const DIATONIC: Record<TuneKey['mode'], Record<number, Family[]>> = {
  major: { 0: ['major'], 2: ['minor', 'sus'], 4: ['minor'], 5: ['major'], 7: ['dominant', 'major', 'sus'], 9: ['minor'], 11: ['half-diminished'] },
  minor: {
    0: ['minor'],
    2: ['half-diminished', 'minor'],
    3: ['major', 'augmented'],
    5: ['minor', 'dominant'],
    7: ['dominant', 'minor', 'sus'],
    8: ['major'],
    9: ['half-diminished'],
    10: ['dominant', 'major'],
    11: ['diminished'],
  },
};

export function isDiatonic(f: ChordFacts, key: TuneKey): boolean {
  return DIATONIC[key.mode][semis(keyPc(key), f.pc)]?.includes(f.family) ?? false;
}

/** Is this root one of the key's scale degrees (major scale, or natural/harmonic minor)? */
export function isScaleDegree(pc: number, key: TuneKey): boolean {
  const s = semis(keyPc(key), pc);
  return key.mode === 'major' ? MAJOR_SCALE.includes(s) : [0, 2, 3, 5, 7, 8, 10, 11].includes(s);
}

/** Case a degree the way its diatonic chord would be: in C, "D" → "ii", "G" → "V". */
export function targetNumeral(key: TuneKey, f: ChordFacts): string {
  const deg = degreeNumeral(key, f.root);
  const home = DIATONIC[key.mode][semis(keyPc(key), f.pc)];
  const family = home?.[0] ?? f.family;
  const lower = family === 'minor' || family === 'half-diminished' || family === 'diminished';
  return lower ? deg.toLowerCase() : deg;
}

interface Borrowed {
  role: string;
  explanation: string;
}

/** Chords a major key borrows from its parallel minor. */
const BORROWED: Record<number, Partial<Record<Family, Borrowed>>> = {
  0: { minor: { role: 'Parallel minor', explanation: 'The tonic turned minor, borrowed from the parallel minor key.' } },
  1: { major: { role: 'Neapolitan', explanation: 'A major chord a half step above the tonic, borrowed from Phrygian; usually leads to V or I.' } },
  2: { 'half-diminished': { role: 'Borrowed iiø', explanation: 'The minor-key ii, borrowed from the parallel minor; often leads to V7♭9.' } },
  3: { major: { role: 'Borrowed ♭III', explanation: 'Borrowed from the parallel minor; a bright detour a minor 3rd up.' } },
  5: { minor: { role: 'Borrowed iv', explanation: 'The minor iv from the parallel minor: a bittersweet subdominant, usually on its way back to I.' } },
  8: { major: { role: 'Borrowed ♭VI', explanation: 'Borrowed from the parallel minor; often moves to V or back to I.' } },
  10: {
    major: { role: 'Borrowed ♭VII', explanation: 'Borrowed from the parallel minor (Mixolydian colour).' },
    dominant: { role: 'Backdoor dominant', explanation: 'Borrowed from the parallel minor; resolves up a whole step to I, the "backdoor" cadence.' },
  },
};

export function borrowedFromMinor(f: ChordFacts, key: TuneKey): Borrowed | undefined {
  if (key.mode !== 'major') return undefined;
  return BORROWED[semis(keyPc(key), f.pc)]?.[f.family];
}

interface DiatonicRole {
  role: string;
  explanation: string;
}

const MAJOR_ROLES: Record<number, DiatonicRole> = {
  0: { role: 'Tonic', explanation: 'Home: the chord the key resolves to.' },
  2: { role: 'Pre-dominant', explanation: 'The ii: sets up the V7.' },
  4: { role: 'Tonic substitute', explanation: 'Shares three notes with I; often replaces it or starts a turnaround.' },
  5: { role: 'Subdominant', explanation: 'Moves away from home; often followed by iv, ♭VII7 or a ii–V back.' },
  7: { role: 'Dominant', explanation: 'Tension that wants to resolve to I.' },
  9: { role: 'Tonic substitute', explanation: 'The relative minor: shares three notes with I.' },
  11: { role: 'Dominant function', explanation: 'Sounds like a V9 without its root; leads to I or iii.' },
};

const MINOR_ROLES: Record<number, DiatonicRole> = {
  0: { role: 'Tonic', explanation: 'Home: the minor chord the key resolves to.' },
  2: { role: 'Pre-dominant', explanation: 'The minor-key ii: sets up the V7.' },
  3: { role: 'Relative major', explanation: 'The tonic of the relative major; minor tunes often visit it.' },
  5: { role: 'Subdominant', explanation: 'The iv of the minor key.' },
  7: { role: 'Dominant', explanation: 'Pulls back to the minor tonic; usually played with ♭9 and ♭13.' },
  8: { role: 'Submediant', explanation: 'Often moves on to the iiø–V or straight to V.' },
  9: { role: 'From melodic minor', explanation: 'The half-diminished vi of melodic minor.' },
  10: { role: 'Subtonic', explanation: 'The V7 of the relative major.' },
  11: { role: 'Leading-tone diminished', explanation: 'Acts like a V7♭9 without its root; resolves to i.' },
};

export function diatonicRole(f: ChordFacts, key: TuneKey): DiatonicRole | undefined {
  if (!isDiatonic(f, key)) return undefined;
  const s = semis(keyPc(key), f.pc);
  return (key.mode === 'major' ? MAJOR_ROLES : MINOR_ROLES)[s];
}

export interface ScaleChoice {
  name: ScaleName;
  root: string;
  notes: string[];
  why: string;
}

function scale(name: ScaleName, root: string, why: string): ScaleChoice {
  return { name, root, notes: Scale.get(`${root} ${name}`).notes.map(simplifyDouble), why };
}

/** How a chord is working, as far as the scale choice is concerned. */
export interface ScaleContext {
  key: TuneKey;
  /** For a dominant: where it resolves, if it does. */
  resolvesTo?: { facts: ChordFacts; by: 'fifth' | 'half-step' };
  /** For a minor or half-diminished chord: it is the ii of a ii–V. */
  isII?: boolean;
  /** …and that ii–V goes to a minor chord. */
  iiOfMinor?: boolean;
  backdoor?: boolean;
}

/**
 * Scales that fit a chord in its context, best first. Extensions written on the
 * chart win (a written ♭9 or ♯11 says which scale is meant); otherwise the chord's
 * function in the key decides.
 */
export function scalesFor(f: ChordFacts, ctx: ScaleContext): ScaleChoice[] {
  const r = f.root;
  const has = (i: string) => f.intervals.includes(i);
  const s = semis(keyPc(ctx.key), f.pc);
  const major = ctx.key.mode === 'major';
  switch (f.family) {
    case 'major': {
      if (has('11A')) return [scale('lydian', r, 'The chart asks for ♯11.')];
      if (s === 0 && isDiatonic(f, ctx.key))
        return [scale('major', r, 'The tonic: the key’s own scale.'), scale('major pentatonic', r, 'Safe, avoids the 4th.'), scale('bebop major', r, 'For eighth-note lines.')];
      if (major && s === 7) return [scale('mixolydian', r, 'V triad: the key’s scale from 5.')];
      return [scale('lydian', r, s === 5 && major ? 'The IV chord: the key’s scale from 4.' : 'A major chord away from the tonic: ♯4 avoids the clash with the 3rd.'), scale('major', r, 'Plainer sound.')];
    }
    case 'sus':
      return [scale('mixolydian', r, 'Suspended sound: the 4th is part of the chord.')];
    case 'augmented':
      return [scale('whole tone', r, 'Augmented 5th, no 7th.')];
    case 'diminished':
      return has('7d')
        ? [scale('diminished', r, 'Whole-half: every chord tone plus a note a whole step above each.')]
        : [scale('locrian', r, 'Diminished triad.')];
    case 'half-diminished':
      if (major && s === 11) return [scale('locrian', r, 'viiø7 in the key: the key’s scale from 7.'), scale('locrian #2', r, 'Smoother ♮9.')];
      return [scale('locrian #2', r, 'Half-diminished with a ♮9: the usual jazz choice.'), scale('locrian', r, 'With ♭9, more tension; fits a minor key.')];
    case 'minor': {
      if (has('7M')) return [scale('melodic minor', r, 'Minor with a major 7th.')];
      const isTonic = s === 0 && !major;
      if (has('6M') && !has('7m')) return [scale('melodic minor', r, 'Minor 6: the major 6th points to melodic minor.'), scale('dorian', r, 'Also has the major 6th.')];
      if (ctx.isII && !isTonic) return [scale('dorian', r, 'The ii of a ii–V: Dorian.'), scale('minor pentatonic', r, 'Simple, always fits.')];
      if (isTonic) return [scale('dorian', r, 'Minor tonic: Dorian is the jazz default.'), scale('aeolian', r, 'Darker ♭6.'), scale('melodic minor', r, 'Brighter, with a major 7th.')];
      if (major && s === 4) return [scale('phrygian', r, 'iii in the key: the key’s scale from 3.'), scale('dorian', r, 'Brighter ♮2 and ♮6.')];
      if (major && s === 9) return [scale('aeolian', r, 'vi in the key: the key’s scale from 6.'), scale('dorian', r, 'Brighter ♮6.')];
      return [scale('dorian', r, ctx.iiOfMinor ? 'The ii of a ii–V: Dorian.' : 'Minor 7th chord: Dorian.'), scale('minor pentatonic', r, 'Simple, always fits.')];
    }
    case 'dominant': {
      if (f.sus) return [scale('mixolydian', r, 'Suspended dominant: Mixolydian, 4th included.')];
      const flat9 = has('9m') || has('2m');
      const sharp9 = has('9A');
      const sharp5 = has('5A') || has('13m');
      if ((sharp9 && sharp5) || (sharp9 && has('5d')) || (flat9 && has('5A'))) return [scale('altered', r, 'The chart asks for altered tensions.')];
      if (has('11A') || (has('5d') && !flat9 && !sharp9)) return [scale('lydian dominant', r, 'The chart asks for ♯11.'), ...(has('5d') ? [scale('whole tone', r, '♭5 also fits whole tone.')] : [])];
      if (has('5A') && !flat9 && !sharp9) return [scale('whole tone', r, 'The chart asks for ♯5.')];
      const toMinor = ctx.resolvesTo && ctx.resolvesTo.by === 'fifth' && ['minor', 'half-diminished', 'diminished'].includes(ctx.resolvesTo.facts.family);
      if (flat9 && has('13m')) return [scale('phrygian dominant', r, '♭9 and ♭13: harmonic minor from the 5th.'), scale('altered', r, 'More tension.')];
      if (flat9) return toMinor
        ? [scale('phrygian dominant', r, 'Resolves to minor: harmonic minor from the 5th.'), scale('half-whole diminished', r, 'Written ♭9 with ♮13.')]
        : [scale('half-whole diminished', r, 'Written ♭9: half-whole diminished (♭9, ♯9, ♯11, 13).'), scale('phrygian dominant', r, 'Darker ♭13.')];
      if (sharp9) return [scale('altered', r, 'Written ♯9: altered.'), scale('half-whole diminished', r, '♯9 with ♮5 and 13.')];
      if (has('13m')) return [scale(toMinor ? 'phrygian dominant' : 'altered', r, 'Written ♭13.'), scale('mixolydian', r, 'Plain sound.')];
      if (ctx.resolvesTo?.by === 'half-step') return [scale('lydian dominant', r, 'Tritone sub: Lydian dominant, the usual choice.'), scale('mixolydian', r, 'Plainer.')];
      if (toMinor) return [scale('phrygian dominant', r, 'Resolves to a minor chord: harmonic minor from the 5th.'), scale('altered', r, 'More tension.'), scale('half-whole diminished', r, '♭9 with ♮13.')];
      if (ctx.resolvesTo) return [scale('mixolydian', r, 'Resolves to a major chord: Mixolydian.'), scale('bebop', r, 'For eighth-note lines.'), scale('altered', r, 'For tension before the resolution.')];
      if (ctx.backdoor || (major && (s === 10 || s === 8 || s === 2))) return [scale('lydian dominant', r, 'Non-resolving dominant: ♯11 keeps it floating.'), scale('mixolydian', r, 'Bluesier.')];
      if (major && (s === 0 || s === 5)) return [scale('mixolydian', r, 'Bluesy dominant.'), scale('blues', r, 'The blues scale.')];
      return [scale('mixolydian', r, 'Dominant 7th: Mixolydian.'), scale('lydian dominant', r, 'Brighter ♯11.')];
    }
  }
}
