import { NO_CHORD, normaliseChord, parseKey, type Chart, type ChartBar, type TuneKey } from './chart';
import { distributeBeats } from './ireal';

/**
 * Changes typed by hand, bar by bar:
 *
 *   A: Fm7 | Bbm7 | Eb7 | Abmaj7 |
 *      Dbmaj7 | Dm7 G7 | Cmaj7 | % |
 *   B: Cm7 | …
 *
 * Bars are separated by "|"; chords in a bar by spaces and share its beats
 * ("/" adds a beat to the chord before). "%" or "x" repeats the bar before.
 * A line may start with a section label ("A:", "[B]", "Intro:").
 * "Key: Eb" and "Time: 3/4" lines set the key and metre. Real Book and
 * iReal Pro shorthand both work: Cm7 C-7, Cmaj7 C^7 CΔ7, Cø7 Ch7, C°7 Co7.
 */
export interface TypedChart {
  chart: Chart;
  /** Words that could not be read as chords. */
  unknown: string[];
}

export function parseTypedChart(text: string, meta: { title?: string; composer?: string; key?: string } = {}): TypedChart {
  let beatsPerBar = 4;
  let key: TuneKey | undefined = meta.key ? parseKey(meta.key) : undefined;
  const bars: ChartBar[] = [];
  const unknown: string[] = [];
  let pendingSection: string | undefined;

  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;
    const setting = /^(key|time)\s*[:=]\s*(.+)$/i.exec(line);
    if (setting) {
      if (setting[1]!.toLowerCase() === 'key') key = parseKey(setting[2]!) ?? key;
      else {
        const t = /^(\d+)\s*\/\s*\d+/.exec(setting[2]!);
        if (t) beatsPerBar = Math.max(1, Math.min(12, Number(t[1])));
      }
      continue;
    }
    const label = /^(?:\[([A-Za-z][\w ]{0,11})\]|\*?([A-Z]\d?|Intro|Verse|Bridge|Coda|Outro|Ending|Tag)\s*:)\s*/i.exec(line);
    if (label) {
      pendingSection = (label[1] ?? label[2]!).trim();
      pendingSection = pendingSection[0]!.toUpperCase() + pendingSection.slice(1);
      line = line.slice(label[0].length);
    }
    for (const cell of line.split('|')) {
      const words = cell
        .replace(/[[\]{}:]/g, ' ')
        .split(/[\s,]+/)
        .filter(Boolean);
      if (words.length === 0) continue;
      let chords: { symbol: string; weight: number }[] = [];
      if (words.length === 1 && /^(%|x|\.\/\.)$/i.test(words[0]!)) {
        const before = bars.at(-1);
        if (before) bars.push({ chords: before.chords.map((c) => ({ ...c })), ...(pendingSection ? { section: pendingSection } : {}) });
        pendingSection = undefined;
        continue;
      }
      for (const w of words) {
        if (w === '/' || w === '-') {
          const last = chords.at(-1);
          if (last) last.weight++;
          continue;
        }
        if (/^n\.?c\.?$/i.test(w)) {
          chords.push({ symbol: NO_CHORD, weight: 1 });
          continue;
        }
        const symbol = normaliseChord(w);
        if (symbol) chords.push({ symbol, weight: 1 });
        else unknown.push(w);
      }
      if (chords.length === 0) continue;
      const beats = distributeBeats(chords.map((c) => c.weight), beatsPerBar);
      chords = chords.map((c, i) => ({ ...c, weight: beats[i]! }));
      const bar: ChartBar = { chords: chords.map((c) => ({ symbol: c.symbol, beats: c.weight })) };
      if (pendingSection) bar.section = pendingSection;
      pendingSection = undefined;
      bars.push(bar);
    }
  }

  return {
    chart: {
      title: meta.title?.trim() || 'Untitled',
      composer: meta.composer?.trim() ?? '',
      style: '',
      ...(key ? { key } : {}),
      beatsPerBar,
      bars,
    },
    unknown,
  };
}

/** A chart written back out in the typed format, so it can be edited. */
export function chartToText(chart: Chart): string {
  const lines: string[] = [];
  if (chart.key) lines.push(`Key: ${chart.key.tonic}${chart.key.mode === 'minor' ? 'm' : ''}`);
  if (chart.beatsPerBar !== 4) lines.push(`Time: ${chart.beatsPerBar}/4`);
  let row: string[] = [];
  let label = '';
  const flush = () => {
    if (row.length) lines.push((label ? `${label}: ` : '') + row.join(' | ') + ' |');
    row = [];
    label = '';
  };
  chart.bars.forEach((bar) => {
    if (bar.section || row.length === 4) flush();
    if (bar.section) label = bar.section;
    const even = bar.chords.every((c) => c.beats === chart.beatsPerBar / bar.chords.length);
    row.push(
      bar.chords
        .map((c) => (even ? c.symbol : [c.symbol, ...Array(Math.max(0, c.beats - 1)).fill('/')].join(' ')))
        .join(' '),
    );
  });
  flush();
  return lines.join('\n');
}
