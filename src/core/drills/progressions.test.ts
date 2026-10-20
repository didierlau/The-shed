import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { generateProgressionQuestion, type ProgressionDrillConfig } from './progressions';
import { PROGRESSIONS, progressionPlayback, progressionSymbols, type ProgressionName } from '../progressions';
import { chordSemitones } from '../chords';
import { DEGREES, MAJOR_KEYS } from '../keys';
import { DRILLS } from './catalog';
import { seededRng } from '../random';

const all = Object.keys(PROGRESSIONS) as ProgressionName[];

const config: ProgressionDrillConfig = {
  kind: 'progressions',
  id: 'test',
  title: 'Test',
  description: '',
  progressions: all,
  keys: MAJOR_KEYS,
};

describe('progressions', () => {
  it('spells progressions like a lead sheet', () => {
    expect(progressionSymbols('F', 'ii-V-I')).toEqual(['Gm7', 'C7', 'Fmaj7', 'Fmaj7']);
    expect(progressionSymbols('C', 'I-vi-ii-bII7')).toEqual(['Cmaj7', 'Am7', 'Dm7', 'Db7']);
    expect(progressionSymbols('C', 'dameron')).toEqual(['Cmaj7', 'Eb7', 'Ab7', 'Db7']);
    expect(progressionSymbols('Bb', 'backdoor')).toEqual(['Ebm7', 'Ab7', 'Bbmaj7', 'Bbmaj7']);
    // No double flats: ♭III of G♭ is written A, not B♭♭.
    expect(progressionSymbols('Gb', 'dameron')[1]).toBe('A7');
  });

  it('plays every chord with the right bass and chord tones, in every key', () => {
    for (const key of MAJOR_KEYS) {
      for (const name of all) {
        const steps = progressionPlayback(key, name);
        steps.forEach((step, i) => {
          const ch = PROGRESSIONS[name].chords[i]!;
          const [bass, ...upper] = step.notes.map((n) => Note.midi(n)!);
          const root = (Note.chroma(key)! + DEGREES[ch.degree].semitones) % 12;
          expect(bass! % 12).toBe(root);
          const expected = [...new Set(chordSemitones(ch.quality).map((o) => (root + o) % 12))].sort();
          expect([...new Set(upper.map((m) => m % 12))].sort()).toEqual(expected);
        });
      }
    }
  });

  it('every progression in the catalogue sounds different from the others', () => {
    const sound = (n: ProgressionName) => PROGRESSIONS[n].chords.map((c) => c.degree + c.quality).join(' ');
    expect(new Set(all.map(sound)).size).toBe(all.length);
  });

  it('every progression is used by at least one level', () => {
    const used = new Set(DRILLS.flatMap((d) => (d.kind === 'progressions' ? d.progressions : [])));
    for (const n of all) expect(used).toContain(n);
  });
});

describe('generateProgressionQuestion', () => {
  it('plays the progression it asks about and reveals it in the key', () => {
    const rng = seededRng(31);
    for (let i = 0; i < 100; i++) {
      const q = generateProgressionQuestion(config, rng);
      expect(q.playback).toHaveLength(PROGRESSIONS[q.answer as ProgressionName].chords.length);
      expect(q.reveal).toMatch(/^In [A-G][b#]?: /);
      expect(q.choices.map((c) => c.value)).toContain(q.answer);
    }
  });
});
