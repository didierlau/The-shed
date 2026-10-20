import { describe, expect, it } from 'vitest';
import { accuracy, practiceWeight, recordAnswer } from './stats';

describe('stats', () => {
  it('records answers immutably', () => {
    const a = {};
    const b = recordAnswer(a, '3m', true);
    const c = recordAnswer(b, '3m', false);
    expect(a).toEqual({});
    expect(c['3m']).toEqual({ asked: 2, correct: 1 });
    expect(accuracy(c['3m'])).toBe(0.5);
  });

  it('weights unseen and weak items above mastered ones', () => {
    const mastered = practiceWeight({ asked: 10, correct: 10 });
    const weak = practiceWeight({ asked: 10, correct: 3 });
    const unseen = practiceWeight(undefined);
    expect(weak).toBeGreaterThan(mastered);
    expect(unseen).toBeGreaterThan(mastered);
    expect(mastered).toBeGreaterThan(0);
  });
});
