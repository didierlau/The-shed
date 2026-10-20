import { describe, expect, it } from 'vitest';
import { DRILLS, DRILL_GROUPS, generateQuestion } from './index';
import { chordSemitones, shellSemitones } from '../chords';
import { seededRng } from '../random';

describe('drill catalog', () => {
  it('has unique ids and every drill can generate questions', () => {
    const ids = DRILLS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const rng = seededRng(7);
    for (const d of DRILLS) {
      for (let i = 0; i < 50; i++) {
        const q = generateQuestion(d, rng);
        expect(q.choices.map((c) => c.value)).toContain(q.answer);
      }
    }
  });

  it('shows every drill kind on the home screen', () => {
    const kinds = new Set(DRILL_GROUPS.map((g) => g.kind));
    for (const d of DRILLS) expect(kinds).toContain(d.kind);
  });

  it('never asks to tell apart chords that sound identical in that drill', () => {
    // e.g. m7 and m7b5 shells are both root + m3 + m7, so they can't share a shell drill.
    for (const d of DRILLS) {
      if (d.kind !== 'chords') continue;
      const voice = d.voicing === 'shell' ? shellSemitones : chordSemitones;
      const sounds = d.qualities.map((q) => voice(q).join(','));
      expect(new Set(sounds).size, `drill ${d.id}`).toBe(sounds.length);
    }
  });
});
