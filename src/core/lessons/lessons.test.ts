import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { DRILL_GROUPS, findDrill } from '../drills';
import { LESSONS, exampleLabel, examplePlayback, findLesson } from './index';

describe('lessons', () => {
  it('has exactly one lesson per section', () => {
    for (const g of DRILL_GROUPS) expect(findLesson(g.id), g.id).toBeDefined();
    expect(LESSONS.length).toBe(DRILL_GROUPS.length);
  });

  it('only links to levels of its own section', () => {
    for (const lesson of LESSONS) {
      const group = DRILL_GROUPS.find((g) => g.id === lesson.group)!;
      expect(lesson.practice.length).toBeGreaterThan(0);
      for (const p of lesson.practice) {
        const drill = findDrill(p.drill);
        expect(drill, p.drill).toBeDefined();
        expect(group.kinds).toContain(drill!.kind);
      }
    }
  });

  it('every example plays real notes and has a label', () => {
    for (const lesson of LESSONS) {
      for (const section of lesson.sections) {
        for (const ex of section.examples ?? []) {
          const steps = examplePlayback(ex);
          expect(steps.length).toBeGreaterThan(0);
          for (const s of steps) {
            for (const n of [...s.notes, ...(s.held?.notes ?? [])]) expect(Note.midi(n), n).not.toBeNull();
            expect(s.beats).toBeGreaterThan(0);
          }
          expect(exampleLabel(ex).length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('builds the expected sounds', () => {
    expect(examplePlayback({ kind: 'interval', interval: '3m' }).at(-1)!.notes).toEqual(['C4', 'Eb4']);
    expect(examplePlayback({ kind: 'chord', quality: 'maj7' }).at(-1)!.notes).toEqual(['C4', 'E4', 'G4', 'B4']);
    const scale = examplePlayback({ kind: 'scale', scale: 'dorian', root: 'D4' });
    expect(scale.map((s) => s.notes[0])).toEqual(['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4']);
    expect(scale[0]!.held!.notes).toEqual(['D3']);
    // A degree: cadence, the note, then its walk home (6 goes up to 8).
    const six = examplePlayback({ kind: 'degree', degree: '6', key: 'C' });
    expect(six.slice(-3).map((s) => s.notes[0])).toEqual(['A4', 'B4', 'C5']);
  });

  it('labels examples the way a chart would', () => {
    expect(exampleLabel({ kind: 'chord', quality: 'm7b5', root: 'B3' })).toBe('Bm7b5 · Half-dim (m7♭5)');
    expect(exampleLabel({ kind: 'progression', progression: 'ii-V-I', key: 'F' })).toBe('Gm7 – C7 – Fmaj7');
    expect(exampleLabel({ kind: 'scale', scale: 'altered', root: 'G3' })).toBe('G Altered');
    expect(exampleLabel({ kind: 'function', fn: 'ii', key: 'Bb' })).toBe('ii7 in Bb (Cm7)');
  });
});
