import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { generateScaleQuestion, type ScaleDrillConfig } from './scales';
import { SCALE_ORDER, scaleSemitones, spellScale } from '../scales';
import { DRILLS } from './catalog';
import { seededRng } from '../random';

const base: ScaleDrillConfig = {
  kind: 'scales',
  id: 'test',
  title: 'Test',
  description: '',
  scales: SCALE_ORDER,
  direction: 'up',
  drone: false,
};

const melody = (q: ReturnType<typeof generateScaleQuestion>) => q.playback.map((s) => Note.midi(s.notes[0]!)!);

describe('scales', () => {
  it('knows the jazz scales', () => {
    expect(scaleSemitones('dorian')).toEqual([0, 2, 3, 5, 7, 9, 10]);
    expect(scaleSemitones('altered')).toEqual([0, 1, 3, 4, 6, 8, 10]);
    expect(scaleSemitones('half-whole diminished')).toEqual([0, 1, 3, 4, 6, 7, 9, 10]);
    expect(scaleSemitones('bebop')).toEqual([0, 2, 4, 5, 7, 9, 10, 11]);
    expect(scaleSemitones('blues')).toEqual([0, 3, 5, 6, 7, 10]);
  });

  it('every scale sounds different from every other', () => {
    const shapes = SCALE_ORDER.map((s) => scaleSemitones(s).join(','));
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it('spells scales without double flats', () => {
    expect(spellScale(Note.midi('F#3')!, 'dorian')).toEqual({ root: 'F#', notes: ['F#', 'G#', 'A', 'B', 'C#', 'D#', 'E'] });
    expect(spellScale(Note.midi('Bb3')!, 'mixolydian').notes).toEqual(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'Ab']);
  });
});

describe('generateScaleQuestion', () => {
  it('plays the asked scale from root to octave, inside the range', () => {
    const rng = seededRng(71);
    const range = { low: Note.midi('C3')!, high: Note.midi('C5')! };
    for (let i = 0; i < 300; i++) {
      const q = generateScaleQuestion(base, rng, {}, range);
      const line = melody(q);
      expect(line.map((m) => m - line[0]!)).toEqual([...scaleSemitones(q.answer as 'dorian'), 12]);
      expect(Math.min(...line)).toBeGreaterThanOrEqual(range.low);
      expect(Math.max(...line)).toBeLessThanOrEqual(range.high);
    }
  });

  it('comes back down when asked', () => {
    const q = generateScaleQuestion({ ...base, scales: ['major'], direction: 'updown' }, seededRng(72));
    const line = melody(q);
    expect(line).toHaveLength(15);
    expect(line[0]).toBe(line.at(-1));
    expect(line[7]! - line[0]!).toBe(12);
  });

  it('holds the root an octave below for the whole scale when the drone is on', () => {
    const q = generateScaleQuestion({ ...base, scales: ['lydian'], drone: true }, seededRng(73));
    const held = q.playback[0]!.held!;
    expect(Note.midi(q.playback[0]!.notes[0]!)! - Note.midi(held.notes[0]!)!).toBe(12);
    expect(held.beats).toBe(q.playback.reduce((s, p) => s + p.beats, 0));
    expect(q.playback.slice(1).every((p) => p.held === undefined && p.notes.length === 1)).toBe(true);
  });

  it('every scale level works and offers its answer', () => {
    const rng = seededRng(74);
    for (const d of DRILLS.filter((x) => x.kind === 'scales')) {
      for (let i = 0; i < 30; i++) {
        const q = generateScaleQuestion(d as ScaleDrillConfig, rng);
        expect(q.choices.map((c) => c.value)).toContain(q.answer);
      }
    }
  });
});
