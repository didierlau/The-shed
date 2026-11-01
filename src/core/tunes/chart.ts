import { Chord, Note } from 'tonal';

/**
 * A tune's chord chart, in the order it is played (repeats and endings written out).
 * Chord symbols are stored in a form tonal understands, e.g. "Ebmaj7", "Fm7b5", "Bb7alt".
 */
export interface ChartChord {
  symbol: string;
  beats: number;
  /** Alternative chord printed above, e.g. a reharmonisation in iReal Pro's "(Db7)". Display only. */
  alt?: string;
}

export interface ChartBar {
  chords: ChartChord[];
  /** Section label starting at this bar, e.g. "A", "B", "Intro". */
  section?: string;
  /** Printed remarks, e.g. "D.C. al Coda". */
  comment?: string;
}

export interface TuneKey {
  tonic: string;
  mode: 'major' | 'minor';
}

export interface Chart {
  title: string;
  composer: string;
  style: string;
  /** The key the chart says it is in, if it says. */
  key?: TuneKey;
  beatsPerBar: number;
  bars: ChartBar[];
}

/** "No chord" in a chart. */
export const NO_CHORD = 'N.C.';

/**
 * Turn a chord as written on a chart (iReal Pro "C-7", "Bh7", "F^7", "Eb-^7",
 * or plain "Cm7", "Bø7", "C△7", "Edim7") into a symbol tonal understands.
 * Returns null when it isn't a chord.
 */
export function normaliseChord(written: string): string | null {
  const s = written.trim().replace(/♭/g, 'b').replace(/♯/g, '#').replace(/[△Δ]/g, '^').replace(/ø/g, 'h').replace(/°/g, 'o');
  const m = /^([A-Ga-g][b#]?)([^/]*)(?:\/([A-Ga-g][b#]?))?$/.exec(s);
  if (!m) return null;
  const root = m[1]![0]!.toUpperCase() + m[1]!.slice(1);
  const bass = m[3] ? m[3][0]!.toUpperCase() + m[3].slice(1) : '';
  let q = m[2]!.replace(/[()]/g, '');

  // iReal Pro / Real Book shorthand → tonal names.
  q = q
    .replace(/^-\^/, 'mMaj')
    .replace(/^mi?n?\^|^m\(?maj|^mM(?!aj)/, 'mMaj')
    .replace(/^h9/, 'm9b5')
    .replace(/^h7?/, 'm7b5')
    .replace(/^o7?$/, (x) => (x === 'o' ? 'dim' : 'dim7'))
    .replace(/^o/, 'dim')
    .replace(/^-/, 'm')
    .replace(/^mi(?!n)/, 'm')
    .replace(/^min/, 'm')
    .replace(/^\^$/, 'maj7')
    .replace(/^\^/, 'maj')
    .replace(/^ma(?!j)/, 'maj')
    .replace(/^M(?=[79]|1[13])/, 'maj')
    .replace(/^\+$/, 'aug')
    .replace(/^\+(7|9)/, '$1#5')
    .replace(/^aug7/, '7#5')
    .replace(/^majMaj/, 'maj')
    .replace(/7susadd3$/, '7sus')
    .replace(/sus$/, 'sus4')
    .replace(/sus4?(b9|#9|b13)$/, '$1sus');
  if (q === 'mMaj') q = 'mMaj7';

  // Keep dropping trailing tensions until tonal recognises the chord (e.g. an exotic "7#9#11b13").
  let quality = q;
  while (true) {
    const symbol = root + quality + (bass ? '/' + bass : '');
    if (!Chord.get(symbol).empty) return symbol;
    const shorter = quality.replace(/(?:[b#]?\d+|alt|add\d+|sus\d?|[\^+\-])$/, '');
    if (shorter === quality) return null;
    quality = shorter;
  }
}

/** A chart's key field: "Eb", "C-", "Gm", "F# minor" → a key. */
export function parseKey(text: string): TuneKey | undefined {
  const m = /^\s*([A-Ga-g][b#♭♯]?)\s*(-|m|min|minor|major|maj)?\s*$/i.exec(text);
  if (!m) return undefined;
  const raw = m[1]!.replace('♭', 'b').replace('♯', '#');
  const tonic = raw[0]!.toUpperCase() + raw.slice(1);
  const suffix = (m[2] ?? '').toLowerCase();
  const minor = suffix === '-' || suffix === 'm' || suffix === 'min' || suffix === 'minor';
  if (Note.get(tonic).empty) return undefined;
  return { tonic, mode: minor ? 'minor' : 'major' };
}

export function keyName(key: TuneKey): string {
  return pretty(key.tonic) + (key.mode === 'minor' ? ' minor' : ' major');
}

/** Short key label: "E♭", "G minor" → "Gm". */
export function shortKeyName(key: TuneKey): string {
  return pretty(key.tonic) + (key.mode === 'minor' ? 'm' : '');
}

/** Flats and sharps as musical symbols. */
export function pretty(text: string): string {
  return text.replace(/b/g, '♭').replace(/#/g, '♯');
}

/**
 * A chord symbol the way a jazz chart prints it: "Ebmaj7" → "E♭maj7",
 * "Fm7b5" → "Fm7♭5", "Bdim7" → "B°7", "Bb7#5#9" → "B♭7♯5♯9".
 */
export function displayChord(symbol: string): string {
  if (symbol === NO_CHORD) return symbol;
  const m = /^([A-G][b#]?)([^/]*)(?:\/(.+))?$/.exec(symbol);
  if (!m) return symbol;
  const quality = m[2]!
    .replace(/^dim7$/, '°7')
    .replace(/^dim$/, '°')
    .replace(/^M$/, '')
    .replace(/^aug$/, '+')
    .replace(/^mMaj7$/, 'mΔ7');
  return pretty(m[1]!) + pretty(quality) + (m[3] ? '/' + pretty(m[3]) : '');
}
