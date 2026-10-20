import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { cadence, degreeNote, functionChord, functionSymbol, MAJOR_KEYS, resolutionPath, voiceChord } from './keys';
import { chordSemitones } from './chords';

const pcs = (notes: string[]) => notes.map((n) => Note.chroma(n));

describe('keys', () => {
  it('spells degrees and functions the jazz way', () => {
    expect(degreeNote('Eb', 'b7')).toBe('Db');
    expect(degreeNote('D', '3')).toBe('F#');
    expect(degreeNote('C', 'b5')).toBe('Gb');
    expect(functionSymbol('Bb', 'ii')).toBe('Cm7');
    expect(functionSymbol('F', 'V')).toBe('C7');
    expect(functionSymbol('G', 'vii')).toBe('F#m7b5');
  });

  it('voices chords with the root in the bass and the right tones above', () => {
    for (const key of MAJOR_KEYS) {
      const chord = functionChord(key, 'V');
      const [bass, ...upper] = chord.map((n) => Note.midi(n)!);
      const root = Note.chroma(degreeNote(key, '5'));
      expect(bass! % 12).toBe(root);
      expect(bass!).toBeLessThan(Note.midi('C3')!);
      const expected = chordSemitones('7').map((o) => (root + o) % 12).sort();
      expect(upper.map((m) => m % 12).sort()).toEqual(expected);
      expect(Math.max(...upper) - Math.min(...upper)).toBeLessThan(12);
    }
  });

  it('voices any chord within one octave above G3', () => {
    const upper = voiceChord(Note.midi('A2')!, 'm7').slice(1).map((n) => Note.midi(n)!);
    for (const m of upper) {
      expect(m).toBeGreaterThanOrEqual(Note.midi('G3')!);
      expect(m).toBeLessThan(Note.midi('G4')!);
    }
  });

  it('plays a ii–V–I cadence ending on the tonic', () => {
    const steps = cadence('F');
    expect(pcs(steps[0]!.notes)[0]).toBe(Note.chroma('G'));
    expect(pcs(steps[1]!.notes)[0]).toBe(Note.chroma('C'));
    expect(pcs(steps[2]!.notes)[0]).toBe(Note.chroma('F'));
    expect(steps.at(-1)!.notes).toEqual([]);
  });

  it('resolves the lower degrees down and the upper degrees up', () => {
    expect(resolutionPath('1')).toEqual([0]);
    expect(resolutionPath('3')).toEqual([4, 2, 0]);
    expect(resolutionPath('b3')).toEqual([3, 2, 0]);
    expect(resolutionPath('4')).toEqual([5, 4, 2, 0]);
    expect(resolutionPath('5')).toEqual([7, 9, 11, 12]);
    expect(resolutionPath('7')).toEqual([11, 12]);
    expect(resolutionPath('b7')).toEqual([10, 11, 12]);
  });
});
