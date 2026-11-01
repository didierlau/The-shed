import { describe, expect, it } from 'vitest';
import { MAJOR_KEYS } from '../keys';
import { seededRng } from '../random';
import { buildCustomDrill, DRILLS, generateQuestion } from './index';
import type { Question } from '../types';

describe('key variety', () => {
  it('never repeats the previous key or root, in any drill', () => {
    const rng = seededRng(11);
    for (const d of DRILLS) {
      let prev: Question | undefined;
      for (let i = 0; i < 200; i++) {
        const q = generateQuestion(d, rng, {}, undefined, prev);
        expect(q.key, d.id).toBeTypeOf('number');
        if (prev) expect(q.key, d.id).not.toBe(prev.key);
        prev = q;
      }
    }
  });

  it('still uses every key over time', () => {
    const rng = seededRng(3);
    const drill = DRILLS.find((d) => d.id === 'degrees-triad')!;
    const seen = new Set<number>();
    let prev: Question | undefined;
    for (let i = 0; i < 300; i++) {
      prev = generateQuestion(drill, rng, {}, undefined, prev);
      seen.add(prev.key!);
    }
    expect(seen.size).toBe(12);
  });

  it('uses all 12 keys in every level and, by default, in every custom mix', () => {
    for (const d of DRILLS) {
      if ('keys' in d) expect(d.keys, d.id).toEqual(MAJOR_KEYS);
    }
    for (const kind of ['degrees', 'functions', 'progressions'] as const) {
      const drill = buildCustomDrill(kind, undefined);
      expect('keys' in drill && drill.keys).toEqual(MAJOR_KEYS);
    }
  });
});
