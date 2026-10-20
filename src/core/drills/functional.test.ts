import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import {
  generateDegreeQuestion,
  generateFunctionQuestion,
  type DegreeDrillConfig,
  type FunctionDrillConfig,
} from './functional';
import { DEGREES, FUNCTIONS, MAJOR_KEYS, degreeNote } from '../keys';
import { chordSemitones } from '../chords';
import { seededRng } from '../random';

const degrees: DegreeDrillConfig = {
  kind: 'degrees',
  id: 'test-degrees',
  title: 'Test',
  description: '',
  degrees: ['1', 'b3', '3', '5', 'b7'],
  keys: MAJOR_KEYS,
  range: ['A3', 'A4'],
};

const functions: FunctionDrillConfig = {
  kind: 'functions',
  id: 'test-functions',
  title: 'Test',
  description: '',
  functions: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'],
  keys: MAJOR_KEYS,
};

/** Key of a question: the bass of the last cadence chord (the I). */
const tonicChroma = (q: { playback: { notes: string[] }[] }) => Note.chroma(q.playback[2]!.notes[0]!)!;

describe('generateDegreeQuestion', () => {
  it('plays a cadence, then a note that is the asked degree of that key, in range', () => {
    const rng = seededRng(21);
    for (let i = 0; i < 300; i++) {
      const q = generateDegreeQuestion(degrees, rng);
      expect(q.playback).toHaveLength(5);
      const note = q.playback.at(-1)!.notes;
      expect(note).toHaveLength(1);
      const midi = Note.midi(note[0]!)!;
      expect((midi - tonicChroma(q) + 12) % 12).toBe(DEGREES[q.answer as '1'].semitones);
      expect(midi).toBeGreaterThanOrEqual(Note.midi('A3')!);
      expect(midi).toBeLessThanOrEqual(Note.midi('A4')!);
    }
  });

  it('resolves from the question note to the tonic', () => {
    const rng = seededRng(22);
    for (let i = 0; i < 100; i++) {
      const q = generateDegreeQuestion(degrees, rng);
      const path = q.resolution!.map((s) => Note.midi(s.notes[0]!)!);
      expect(path[0]).toBe(Note.midi(q.playback.at(-1)!.notes[0]!));
      expect(path.at(-1)! % 12).toBe(tonicChroma(q));
    }
  });

  it('names the note in the key in the reveal', () => {
    const q = generateDegreeQuestion({ ...degrees, keys: ['Eb'], degrees: ['b7'] }, seededRng(23));
    expect(q.reveal).toBe(`♭7 in Eb: ${degreeNote('Eb', 'b7')}`);
  });
});

describe('generateFunctionQuestion', () => {
  it('plays a cadence, then the diatonic chord it asks for', () => {
    const rng = seededRng(24);
    for (let i = 0; i < 300; i++) {
      const q = generateFunctionQuestion(functions, rng);
      const [bass, ...upper] = q.playback.at(-1)!.notes.map((n) => Note.midi(n)!);
      const f = FUNCTIONS[q.answer as 'ii'];
      const root = (tonicChroma(q) + DEGREES[f.degree].semitones) % 12;
      expect(bass! % 12).toBe(root);
      const expected = chordSemitones(f.quality).map((o) => (root + o) % 12).sort();
      expect(upper.map((m) => m % 12).sort()).toEqual(expected);
    }
  });

  it('resolves to the tonic chord unless it already is the tonic', () => {
    const rng = seededRng(25);
    for (let i = 0; i < 100; i++) {
      const q = generateFunctionQuestion(functions, rng);
      if (q.answer === 'I') expect(q.resolution).toBeUndefined();
      else expect(Note.chroma(q.resolution![0]!.notes[0]!)).toBe(tonicChroma(q));
    }
  });
});
