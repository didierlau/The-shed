import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { chartPlayback, chordVoicing, scalePlayback } from './playback';
import { parseTypedChart } from './typed';
import { scalesFor, chordFacts } from './harmony';

const pcs = (notes: string[]) => notes.map((n) => Note.chroma(n));

describe('tune playback', () => {
  it('voices a chord as bass plus guide tones and a colour tone', () => {
    const v = chordVoicing('G7');
    expect(Note.midi(v[0]!)).toBeLessThan(Note.midi('C3')!);
    expect(Note.chroma(v[0]!)).toBe(7);
    expect(new Set(pcs(v.slice(1)))).toEqual(new Set([11, 5, 2])); // B, F, D (5th as colour)
    expect(pcs(chordVoicing('Cm7/Bb')).slice(0, 1)).toEqual([10]);
    expect(chordVoicing('N.C.')).toEqual([]);
  });

  it('plays every chord for its beats', () => {
    const { chart } = parseTypedChart('Dm7 G7 | Cmaj7 |');
    expect(chartPlayback(chart).map((s) => s.beats)).toEqual([2, 2, 4]);
  });

  it('plays a scale up and down over its chord', () => {
    const f = chordFacts('Dm7')!;
    const dorian = scalesFor(f, { key: { tonic: 'C', mode: 'major' }, isII: true })[0]!;
    const steps = scalePlayback(dorian, 'Dm7');
    expect(steps).toHaveLength(15);
    expect(pcs(steps.map((s) => s.notes[0]!))).toEqual([2, 4, 5, 7, 9, 11, 0, 2, 0, 11, 9, 7, 5, 4, 2]);
    expect(steps[0]!.held!.notes.length).toBeGreaterThan(2);
  });
});
