import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { buildVoicing, spellVoicing, supports, VOICINGS, type VoicingQuality, type VoicingType } from './voicings';
import { DRILLS } from './drills/catalog';
import { generateVoicingQuestion, type VoicingDrillConfig } from './drills/voicings';
import { seededRng } from './random';

const QUALITIES: VoicingQuality[] = ['maj7', 'm7', '7', 'm7b5'];
const TYPES = Object.keys(VOICINGS) as VoicingType[];
const rel = (midis: number[]) => midis.slice(1).map((m) => m - midis[0]!);

describe('voicings', () => {
  it('builds the textbook shapes on C', () => {
    const c = Note.midi('C2')!;
    const names = (q: VoicingQuality, t: VoicingType) => buildVoicing(c, q, t).map((m) => Note.fromMidi(m));
    expect(names('maj7', 'close')).toEqual(['C2', 'C4', 'E4', 'G4', 'B4']);
    expect(names('7', 'shell')).toEqual(['C2', 'E3', 'Bb3']);
    expect(names('m7', 'drop2')).toEqual(['C2', 'G3', 'C4', 'Eb4', 'Bb4']);
    expect(names('7', 'rootlessA')).toEqual(['C2', 'E3', 'G3', 'Bb3', 'D4']);
    expect(names('7', 'rootlessB')).toEqual(['C2', 'Bb3', 'D4', 'E4', 'G4']);
  });

  it('builds the So What voicing as stacked 4ths with a 3rd on top', () => {
    const v = buildVoicing(Note.midi('D2')!, 'm7', 'soWhat').slice(1);
    expect(v.map((m) => Note.fromMidi(m))).toEqual(['E3', 'A3', 'D4', 'G4', 'B4']);
    expect(v.slice(1).map((m, i) => m - v[i]!)).toEqual([5, 5, 5, 4]);
  });

  it('spells voicings from the root', () => {
    expect(spellVoicing('D', 'm7', 'drop2')).toEqual(['A', 'D', 'F', 'C']);
    expect(spellVoicing('G', '7', 'upperStructure')).toEqual(['B', 'F', 'A', 'C#', 'E']);
  });

  it('only builds voicings a chord supports', () => {
    expect(supports('soWhat', 'm7')).toBe(true);
    expect(supports('soWhat', '7')).toBe(false);
    expect(supports('upperStructure', '7')).toBe(true);
    expect(supports('upperStructure', 'maj7')).toBe(false);
    expect(() => buildVoicing(48, 'maj7', 'soWhat')).toThrow();
  });

  it('keeps every voicing in a playable register, in all twelve keys', () => {
    for (let r = 0; r < 12; r++) {
      for (const q of QUALITIES) {
        for (const t of TYPES.filter((t) => supports(t, q))) {
          const [bass, ...upper] = buildVoicing(Note.midi('C2')! + r, q, t);
          expect(bass!).toBeLessThan(Note.midi('C3')!);
          expect(Math.max(...upper)).toBeLessThanOrEqual(Note.midi('F#5')!);
          expect(Math.min(...upper)).toBeGreaterThan(bass!);
        }
      }
    }
  });

  it('no level asks to tell apart two voicings that sound the same on a chord', () => {
    for (const d of DRILLS) {
      if (d.kind !== 'voicings') continue;
      for (const q of d.qualities) {
        const shapes = d.voicings.filter((t) => supports(t, q)).map((t) => rel(buildVoicing(Note.midi('C2')!, q, t)).join(','));
        expect(new Set(shapes).size, `${d.id} on ${q}`).toBe(shapes.length);
      }
    }
  });
});

describe('generateVoicingQuestion', () => {
  const config: VoicingDrillConfig = {
    kind: 'voicings',
    id: 'test',
    title: 'Test',
    description: '',
    voicings: TYPES,
    qualities: QUALITIES,
  };

  it('only asks voicings on chords they fit, and reveals them spelled', () => {
    const rng = seededRng(41);
    for (let i = 0; i < 300; i++) {
      const q = generateVoicingQuestion(config, rng);
      const chord = q.playback[0]!.notes;
      expect(chord.length).toBe(VOICINGS[q.answer as VoicingType].tones.length + 1);
      expect(q.reveal).toMatch(/^.+ on [A-G][b#]?(maj7|m7b5|m7|7): [A-G]/);
    }
  });

  it('prefers the simpler root spelling', () => {
    const rng = seededRng(42);
    for (let i = 0; i < 300; i++) {
      const q = generateVoicingQuestion(config, rng);
      expect(q.reveal).not.toMatch(/bb|##/);
    }
  });
});
