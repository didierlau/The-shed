import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { generateChordQuestion, type ChordDrillConfig } from './chords';
import { chordSemitones, shellSemitones, spellChord } from '../chords';
import { seededRng } from '../random';

const base: ChordDrillConfig = {
  kind: 'chords',
  id: 'test',
  title: 'Test',
  description: '',
  qualities: ['maj7', '7', 'm7', 'm7b5', 'dim7'],
  voicing: 'close',
  playback: 'block',
};

const offsets = (notes: string[]) => {
  const m = notes.map((n) => Note.midi(n)!);
  return m.map((x) => x - m[0]!);
};

describe('chord qualities', () => {
  it('builds the right close-position chords', () => {
    expect(chordSemitones('maj7')).toEqual([0, 4, 7, 11]);
    expect(chordSemitones('7')).toEqual([0, 4, 7, 10]);
    expect(chordSemitones('m7')).toEqual([0, 3, 7, 10]);
    expect(chordSemitones('m7b5')).toEqual([0, 3, 6, 10]);
    expect(chordSemitones('dim7')).toEqual([0, 3, 6, 9]);
  });

  it('builds shells from root, 3rd and 7th (or 6th)', () => {
    expect(shellSemitones('maj7')).toEqual([0, 4, 11]);
    expect(shellSemitones('7')).toEqual([0, 4, 10]);
    expect(shellSemitones('6')).toEqual([0, 4, 9]);
    expect(shellSemitones('7sus4')).toEqual([0, 5, 10]);
    expect(shellSemitones('M')).toEqual([0, 4, 7]);
  });
});

describe('spellChord', () => {
  it('picks the spelling with the fewest accidentals', () => {
    expect(spellChord(Note.midi('F#3')!, 'm7', [0, 3, 7, 10])).toEqual({ symbol: 'F#m7', notes: ['F#', 'A', 'C#', 'E'] });
    expect(spellChord(Note.midi('Bb3')!, '7', [0, 4, 7, 10])).toEqual({ symbol: 'Bb7', notes: ['Bb', 'D', 'F', 'Ab'] });
    expect(spellChord(Note.midi('C3')!, 'M', [0, 4, 7]).symbol).toBe('C');
  });

  it('spells only the notes of the voicing', () => {
    expect(spellChord(Note.midi('Eb3')!, 'maj7', [0, 4, 11]).notes).toEqual(['Eb', 'G', 'D']);
  });
});

describe('generateChordQuestion', () => {
  it('plays exactly the chord it asks for, every note inside the range', () => {
    const rng = seededRng(11);
    const range = { low: Note.midi('C2')!, high: Note.midi('C6')! };
    const roots = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const q = generateChordQuestion(base, rng, {}, range);
      const chord = q.playback.at(-1)!.notes.map((n) => Note.midi(n)!);
      expect(chord.map((m) => m - chord[0]!)).toEqual(chordSemitones(q.answer as 'maj7'));
      expect(Math.min(...chord)).toBeGreaterThanOrEqual(range.low);
      expect(Math.max(...chord)).toBeLessThanOrEqual(range.high);
      roots.add(chord[0]!);
    }
    // Roots spread across the range rather than sitting in one octave.
    expect(Math.max(...roots) - Math.min(...roots)).toBeGreaterThan(30);
  });

  it('arpeggiates note by note, then plays the block chord', () => {
    const q = generateChordQuestion({ ...base, playback: 'arpeggio' }, seededRng(12));
    const block = q.playback.at(-1)!.notes;
    expect(q.playback).toHaveLength(block.length + 1);
    expect(q.playback.slice(0, -1).map((s) => s.notes[0])).toEqual(block);
  });

  it('uses shell voicings when configured', () => {
    const rng = seededRng(13);
    const q = generateChordQuestion({ ...base, qualities: ['maj7', '7'], voicing: 'shell' }, rng);
    expect(offsets(q.playback.at(-1)!.notes)).toEqual(shellSemitones(q.answer as 'maj7'));
  });

  it('asks weak qualities more often when stats are given', () => {
    const rng = seededRng(14);
    const cfg: ChordDrillConfig = { ...base, qualities: ['maj7', '7'] };
    const stats = { maj7: { asked: 20, correct: 20 }, '7': { asked: 20, correct: 3 } };
    let dom = 0;
    for (let i = 0; i < 1000; i++) if (generateChordQuestion(cfg, rng, stats).answer === '7') dom++;
    expect(dom).toBeGreaterThan(650);
  });
});
