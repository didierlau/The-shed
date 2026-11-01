import { Note } from 'tonal';
import type { PlaybackStep } from '../types';
import type { Chart } from './chart';
import { chordFacts, type ScaleChoice } from './harmony';

// Bass in C2–B2, chord tones in G3–F#4: every chord lands in the same window, so changes move smoothly.
const BASS_WINDOW = Note.midi('C2')!;
const CHORD_WINDOW = Note.midi('G3')!;
const place = (pc: number, start: number) => start + ((((pc - start) % 12) + 12) % 12);

/**
 * A comping voicing for a chord symbol: the bass note, then the 3rd and 7th
 * (or 6th) with one colour tone (9th, 13th or 5th) in the middle register.
 */
export function chordVoicing(symbol: string): string[] {
  const f = chordFacts(symbol);
  if (!f) return [];
  const byInterval = new Map(f.intervals.map((iv, i) => [iv, f.notes[i]!]));
  const pick = (...ivs: string[]) => ivs.map((iv) => byInterval.get(iv)).find((n) => n !== undefined);
  const upper = [
    pick('3M', '3m', '4P', '2M'),
    pick('7m', '7M', '7d', '6M'),
    pick('9m', '9A', '9M', '13M', '13m', '5A', '5d', '11A', '5P', '6M'),
  ].filter((n): n is string => !!n);
  const bass = place(Note.chroma(f.bass ?? f.root)!, BASS_WINDOW);
  const tones = [...new Set(upper.map((n) => place(Note.chroma(n)!, CHORD_WINDOW)))].sort((a, b) => a - b);
  return [bass, ...tones].map((m) => Note.fromMidi(m));
}

/** The whole chart, bar by bar, as comping chords. */
export function chartPlayback(chart: Chart): PlaybackStep[] {
  return chart.bars.flatMap((bar) => bar.chords.map((c) => ({ notes: chordVoicing(c.symbol), beats: c.beats })));
}

/** A scale up and down over its chord, which rings underneath. */
export function scalePlayback(scale: ScaleChoice, chordSymbol: string): PlaybackStep[] {
  const rootPc = Note.chroma(scale.root)!;
  const start = place(rootPc, Note.midi('C4')!) > Note.midi('F#4')! ? place(rootPc, Note.midi('C4')!) - 12 : place(rootPc, Note.midi('C4')!);
  const up = scale.notes.map((n) => start + ((((Note.chroma(n)! - rootPc) % 12) + 12) % 12));
  const line = [...up, start + 12, ...[...up].reverse()];
  const chord = chordVoicing(chordSymbol);
  return line.map((m, i) => ({
    notes: [Note.fromMidi(m)],
    beats: i === line.length - 1 ? 2 : 0.5,
    ...(i === 0 && chord.length ? { held: { notes: chord, beats: line.length * 0.5 + 1.5 } } : {}),
  }));
}
