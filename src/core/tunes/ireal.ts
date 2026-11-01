import { NO_CHORD, normaliseChord, parseKey, type Chart, type ChartBar, type ChartChord } from './chart';

/**
 * Reads iReal Pro exports: an "irealb://…" link (one tune or a whole playlist),
 * or the HTML file iReal Pro saves, which contains such a link.
 *
 * The chord data in irealb links is lightly scrambled; the scheme was worked out
 * by Stephen Irons' Accompaniser and is used by several open-source readers.
 */

const MUSIC_PREFIX = '1r34LbKcu7';

/** Every tune in the text (a link, several links, or an iReal Pro HTML export). */
export function parseIRealPro(text: string): Chart[] {
  const charts: Chart[] = [];
  for (const m of text.matchAll(/irealb(?:ook)?:\/\/[^"'\s<>]+/g)) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(m[0].replace(/^irealb(?:ook)?:\/\//, ''));
    } catch {
      continue;
    }
    const oldFormat = m[0].startsWith('irealbook');
    const songs = decoded.split('===');
    if (songs.length > 1) songs.pop(); // playlist name
    for (const song of songs) {
      const chart = oldFormat ? parseOldSong(song) : parseSong(song);
      if (chart && chart.bars.length > 0) charts.push(chart);
    }
  }
  return charts;
}

function parseSong(song: string): Chart | null {
  const parts = song.split('=');
  const music = parts[6] ?? '';
  const idx = music.indexOf(MUSIC_PREFIX);
  if (idx < 0) return null;
  return buildChart(parts[0] ?? '', parts[1] ?? '', parts[3] ?? '', parts[4] ?? '', unscramble(music.slice(idx + MUSIC_PREFIX.length)));
}

/** The older, unscrambled "irealbook://" format: title=composer=style=key=n=music. */
function parseOldSong(song: string): Chart | null {
  const parts = song.split('=');
  if (parts.length < 6) return null;
  return buildChart(parts[0] ?? '', parts[1] ?? '', parts[2] ?? '', parts[3] ?? '', parts[5] ?? '');
}

function buildChart(title: string, composer: string, style: string, key: string, music: string): Chart {
  const { bars, beatsPerBar } = parseMusic(music);
  return {
    title: tidyTitle(title.trim()),
    composer: tidyComposer(composer.trim()),
    style: style.trim(),
    key: parseKey(key),
    beatsPerBar,
    bars,
  };
}

/** "Gentle Rain, The" → "The Gentle Rain". */
function tidyTitle(title: string): string {
  return title.replace(/^(.*), (A|An|The)$/, '$2 $1');
}

/** iReal Pro stores two-word names surname first: "Coltrane John" → "John Coltrane". */
function tidyComposer(composer: string): string {
  const words = composer.split(/\s+/).filter(Boolean);
  return words.length === 2 ? `${words[1]} ${words[0]}` : composer;
}

/** Undo the irealb scrambling: each full 50-character block has its ends swapped around. */
export function unscramble(s: string): string {
  let out = '';
  while (s.length > 51) {
    out += obfusc50(s.slice(0, 50));
    s = s.slice(50);
  }
  out += s;
  return out.replace(/Kcl/g, '| x').replace(/LZ/g, ' |').replace(/XyQ/g, '   ');
}

function obfusc50(s: string): string {
  const c = s.split('');
  for (let i = 0; i < 5; i++) {
    c[49 - i] = s[i]!;
    c[i] = s[49 - i]!;
  }
  for (let i = 10; i < 24; i++) {
    c[49 - i] = s[i]!;
    c[i] = s[49 - i]!;
  }
  return c.join('');
}

/** A bar as written, before repeats are played out. */
interface WrittenBar {
  /** One entry per cell: a chord symbol, or null for an empty cell (the chord before keeps sounding). */
  cells: (ChartChord | null)[];
  section?: string;
  comment?: string;
  repeatStart?: boolean;
  repeatEnd?: boolean;
  ending?: number;
  /** "x": same chords as the bar before. "r": the two bars before. */
  copy?: 'x' | 'r1' | 'r2';
}

const SECTION_NAMES: Record<string, string> = { i: 'Intro', v: 'Verse' };

const CHORD_RE = /^([A-G][b#]?)((?:sus|alt|add|[+\-^\dhob#])*)(\*[^*]*\*)?(\/[A-G][b#]?)?(\([^)]*\))?/;
const W_RE = /^W(\/[A-G][b#]?)?(\([^)]*\))?/;

export function parseMusic(music: string): { bars: ChartBar[]; beatsPerBar: number } {
  const written: WrittenBar[] = [];
  let bar: WrittenBar = { cells: [] };
  let beatsPerBar = 4;
  let lastChord: string | null = null;
  let pendingRepeatEnd = false;

  const hasContent = (b: WrittenBar) => b.cells.length > 0 || b.copy !== undefined;
  const closeBar = () => {
    if (hasContent(bar)) {
      written.push(bar);
      bar = { cells: [] };
    }
  };
  const lastBar = () => (hasContent(bar) ? bar : written.at(-1));

  let s = music;
  while (s.length > 0) {
    let m: RegExpExecArray | null;
    const ch = s[0]!;
    if ((m = /^\*(\w)/.exec(s))) {
      bar.section = SECTION_NAMES[m[1]!] ?? m[1]!;
      s = s.slice(m[0].length);
    } else if ((m = /^T(\d)(\d)/.exec(s))) {
      const top = m[1] === '1' && m[2] === '2' ? 12 : Number(m[1]);
      if (written.length === 0 && !hasContent(bar)) beatsPerBar = top;
      s = s.slice(m[0].length);
    } else if ((m = /^<([^>]*)>/.exec(s))) {
      const text = m[1]!.trim();
      const target = lastBar() ?? bar;
      if (text) target.comment = target.comment ? `${target.comment} ${text}` : text;
      s = s.slice(m[0].length);
    } else if ((m = /^N(\d)/.exec(s))) {
      bar.ending = Number(m[1]);
      s = s.slice(m[0].length);
    } else if ((m = CHORD_RE.exec(s))) {
      const symbol = normaliseChord(m[1]! + m[2]! + (m[4] ?? ''));
      const alt = m[5] ? normaliseChord(m[5].slice(1, -1)) ?? undefined : undefined;
      if (symbol) {
        bar.cells.push({ symbol, beats: 1, ...(alt ? { alt } : {}) });
        lastChord = symbol.replace(/\/.*$/, '');
      } else {
        bar.cells.push(null);
      }
      s = s.slice(m[0].length);
    } else if ((m = W_RE.exec(s))) {
      // Invisible root: the chord before, over a new bass note.
      const symbol = lastChord ? normaliseChord(lastChord + (m[1] ?? '')) : null;
      bar.cells.push(symbol ? { symbol, beats: 1 } : null);
      s = s.slice(m[0].length);
    } else {
      switch (ch) {
        case '{':
          closeBar();
          bar.repeatStart = true;
          break;
        case '}': {
          const target = lastBar();
          if (target) target.repeatEnd = true;
          else pendingRepeatEnd = true;
          closeBar();
          break;
        }
        case '|':
        case '[':
        case ']':
        case 'Z':
          closeBar();
          break;
        case 'x':
          bar.copy = 'x';
          break;
        case 'r':
          bar.copy = 'r1';
          closeBar();
          bar.copy = 'r2';
          break;
        case 'n':
          bar.cells.push({ symbol: NO_CHORD, beats: 1 });
          break;
        case 'p': {
          // Slash: the chord before, one more beat.
          const prev = [...bar.cells].reverse().find((c) => c !== null);
          bar.cells.push(prev ? { ...prev, beats: 1 } : null);
          break;
        }
        case ' ':
          if (bar.cells.length > 0) bar.cells.push(null);
          break;
        default:
          // Layout and playback marks with no harmonic meaning: , Y s l f U S Q …
          break;
      }
      s = s.slice(1);
    }
    if (pendingRepeatEnd && written.length > 0) {
      written.at(-1)!.repeatEnd = true;
      pendingRepeatEnd = false;
    }
  }
  closeBar();

  resolveCopies(written);
  return { bars: playOut(written).map((b) => toChartBar(b, beatsPerBar)), beatsPerBar };
}

/** Fill in "x" and "r" bars with the chords they repeat. */
function resolveCopies(written: WrittenBar[]): void {
  for (let i = 0; i < written.length; i++) {
    const b = written[i]!;
    const from = b.copy === 'x' ? written[i - 1] : b.copy === 'r1' ? written[i - 2] : b.copy === 'r2' ? written[i - 2] : undefined;
    if (b.copy && from && b.cells.every((c) => c === null)) b.cells = from.cells.map((c) => c && { ...c });
  }
}

/** Play the written bars in order: repeats taken once, first and second endings honoured. */
function playOut(written: WrittenBar[]): WrittenBar[] {
  const out: WrittenBar[] = [];
  const opened = new Set<number>();
  const repeated = new Set<number>();
  let start = 0;
  let pass = 1;
  let i = 0;
  while (i < written.length && out.length < 2000) {
    const b = written[i]!;
    if (b.repeatStart && !opened.has(i)) {
      opened.add(i);
      start = i;
      pass = 1;
    }
    if (b.ending !== undefined && b.ending !== pass) {
      // Skip this ending: up to and including the bar that closes it.
      let j = i;
      while (j < written.length && !written[j]!.repeatEnd && (j === i || written[j]!.ending === undefined)) j++;
      i = j < written.length && written[j]!.repeatEnd ? j + 1 : j;
      continue;
    }
    out.push(b);
    if (b.repeatEnd) {
      const lastEnding = highestEnding(written, start);
      if (pass < lastEnding || (lastEnding === 0 && !repeated.has(i))) {
        repeated.add(i);
        pass++;
        i = start;
        continue;
      }
      start = i + 1;
    }
    i++;
  }
  return out;
}

/** The highest numbered ending in the repeat that starts at `start` (0 if it has none). */
function highestEnding(written: WrittenBar[], start: number): number {
  let max = 0;
  for (let j = start; j < written.length; j++) {
    if (j > start && written[j]!.repeatStart) break;
    max = Math.max(max, written[j]!.ending ?? 0);
  }
  return max;
}

/** Turn a bar's cells into chords with beat counts that add up to the bar. */
function toChartBar(b: WrittenBar, beatsPerBar: number): ChartBar {
  const chords: ChartChord[] = [];
  const weights: number[] = [];
  for (const cell of b.cells) {
    if (cell) {
      chords.push({ ...cell });
      weights.push(1);
    } else if (weights.length > 0) {
      weights[weights.length - 1]! += 1;
    }
  }
  const beats = distributeBeats(weights, beatsPerBar);
  chords.forEach((c, i) => (c.beats = beats[i]!));
  const bar: ChartBar = { chords: mergeRepeated(chords) };
  if (b.section) bar.section = b.section;
  if (b.comment) bar.comment = b.comment;
  return bar;
}

/** Share a bar's beats out in proportion to the cells each chord takes (largest remainder, at least one beat each). */
export function distributeBeats(weights: number[], beatsPerBar: number): number[] {
  if (weights.length === 0) return [];
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === beatsPerBar) return [...weights];
  const n = weights.length;
  if (n >= beatsPerBar) return weights.map((_, i) => (i < beatsPerBar ? 1 : 0)).map((x) => Math.max(x, 1));
  const exact = weights.map((w) => (w / total) * beatsPerBar);
  const out = exact.map((x) => Math.max(1, Math.floor(x)));
  let left = beatsPerBar - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; left > 0; k = (k + 1) % n, left--) out[order[k]!.i]! += 1;
  for (let k = n - 1; left < 0; k = (k - 1 + n) % n) {
    if (out[k]! > 1) {
      out[k]! -= 1;
      left++;
    }
  }
  return out;
}

/** "C / / /" written as slashes becomes one chord lasting the whole bar. */
function mergeRepeated(chords: ChartChord[]): ChartChord[] {
  const out: ChartChord[] = [];
  for (const c of chords) {
    const prev = out.at(-1);
    if (prev && prev.symbol === c.symbol && !c.alt) prev.beats += c.beats;
    else out.push(c);
  }
  return out;
}
