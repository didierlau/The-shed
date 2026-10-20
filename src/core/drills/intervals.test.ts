import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { generateIntervalQuestion, spellInterval, type IntervalDrillConfig } from './intervals';
import { semitones } from '../intervals';
import { seededRng } from '../random';

const base: IntervalDrillConfig = {
  kind: 'intervals',
  id: 'test',
  title: 'Test',
  description: '',
  intervals: ['3m', '3M', '5P'],
  directions: ['up', 'down', 'harmonic'],
};

function allNotes(q: ReturnType<typeof generateIntervalQuestion>): number[] {
  return q.playback.flatMap((s) => s.notes).map((n) => Note.midi(n)!);
}

describe('generateIntervalQuestion', () => {
  it('plays exactly the interval it asks for', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 500; i++) {
      const q = generateIntervalQuestion(base, rng);
      const midis = allNotes(q);
      const distance = Math.max(...midis) - Math.min(...midis);
      expect(distance).toBe(semitones(q.answer as '3m'));
    }
  });

  it('stays inside the given range, and uses all of it', () => {
    const rng = seededRng(2);
    const low = Note.midi('A1')!;
    const high = Note.midi('C7')!;
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      for (const m of allNotes(generateIntervalQuestion(base, rng, {}, { low, high }))) {
        seen.add(m);
        expect(m).toBeGreaterThanOrEqual(low);
        expect(m).toBeLessThanOrEqual(high);
      }
    }
    expect(Math.min(...seen)).toBe(low);
    expect(Math.max(...seen)).toBe(high);
  });

  it('orders notes according to direction', () => {
    const rng = seededRng(3);
    const up = generateIntervalQuestion({ ...base, directions: ['up'] }, rng);
    expect(Note.midi(up.playback[0]!.notes[0]!)!).toBeLessThan(Note.midi(up.playback[1]!.notes[0]!)!);
    const down = generateIntervalQuestion({ ...base, directions: ['down'] }, rng);
    expect(Note.midi(down.playback[0]!.notes[0]!)!).toBeGreaterThan(Note.midi(down.playback[1]!.notes[0]!)!);
    const harm = generateIntervalQuestion({ ...base, directions: ['harmonic'] }, rng);
    expect(harm.playback).toHaveLength(1);
    expect(harm.playback[0]!.notes).toHaveLength(2);
  });

  it('offers every interval of the drill as a choice, including the answer', () => {
    const q = generateIntervalQuestion(base, seededRng(4));
    expect(q.choices.map((c) => c.value)).toEqual(base.intervals);
    expect(base.intervals).toContain(q.answer);
  });

  it('asks weak intervals more often when stats are given', () => {
    const rng = seededRng(5);
    const stats = { '3m': { asked: 20, correct: 2 }, '3M': { asked: 20, correct: 20 }, '5P': { asked: 20, correct: 20 } };
    const counts: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) {
      const a = generateIntervalQuestion(base, rng, stats).answer;
      counts[a] = (counts[a] ?? 0) + 1;
    }
    expect(counts['3m']!).toBeGreaterThan(counts['3M']! * 2);
  });

  it('rejects a range too small for the interval', () => {
    expect(() =>
      generateIntervalQuestion({ ...base, intervals: ['8P'] }, seededRng(6), {}, { low: Note.midi('C4')!, high: Note.midi('E4')! }),
    ).toThrow();
  });
});

describe('spellInterval', () => {
  it('spells the interval that was asked, with the simplest names', () => {
    expect(spellInterval(Note.midi('A3')!, '6M')).toEqual({ bottom: 'A3', top: 'F#4' });
    expect(spellInterval(Note.midi('Bb3')!, '3M')).toEqual({ bottom: 'Bb3', top: 'D4' });
    expect(spellInterval(Note.midi('C4')!, '4A')).toEqual({ bottom: 'C4', top: 'F#4' });
    expect(spellInterval(Note.midi('E4')!, '2m')).toEqual({ bottom: 'E4', top: 'F4' });
    expect(spellInterval(Note.midi('B3')!, '8P')).toEqual({ bottom: 'B3', top: 'B4' });
  });
});
