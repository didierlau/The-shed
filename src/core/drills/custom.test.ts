import { describe, expect, it } from 'vitest';
import {
  buildCustomDrill,
  CUSTOM_SPECS,
  customDrillId,
  customKindFromId,
  defaultSelection,
  normaliseSelection,
  type DrillKind,
} from './custom';
import { generateQuestion } from './index';
import { seededRng } from '../random';
import { CHORD_QUALITIES } from '../chords';

const KINDS = Object.keys(CUSTOM_SPECS) as DrillKind[];

describe('custom practice', () => {
  it('round-trips drill ids', () => {
    for (const k of KINDS) expect(customKindFromId(customDrillId(k))).toBe(k);
    expect(customKindFromId('chords-all')).toBeNull();
    expect(customKindFromId('custom-nonsense')).toBeNull();
  });

  it('builds a working drill from the defaults of every kind', () => {
    const rng = seededRng(51);
    for (const k of KINDS) {
      const drill = buildCustomDrill(k, defaultSelection(k));
      expect(drill.kind).toBe(k);
      for (let i = 0; i < 20; i++) expect(defaultSelection(k).items).toContain(generateQuestion(drill, rng).answer);
    }
  });

  it('builds a working drill with every item ticked and every option value', () => {
    const rng = seededRng(52);
    for (const k of KINDS) {
      const spec = CUSTOM_SPECS[k];
      const optionSets = spec.options.length === 0 ? [{}] : spec.options[0]!.choices.map((c) => ({ [spec.options[0]!.id]: [c.value] }));
      for (const options of optionSets) {
        const drill = buildCustomDrill(k, { items: spec.items.map((i) => i.value), options });
        for (let i = 0; i < 30; i++) expect(() => generateQuestion(drill, rng)).not.toThrow();
      }
    }
  });

  it('only asks about the items you picked', () => {
    const drill = buildCustomDrill('chords', { items: ['m7b5', 'dim7'], options: { playback: ['block'] } });
    const rng = seededRng(53);
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion(drill, rng);
      expect(['m7b5', 'dim7']).toContain(q.answer);
      expect(q.choices.map((c) => c.value)).toEqual(['m7b5', 'dim7']);
      expect(q.playback).toHaveLength(1);
    }
  });

  it('cleans up stored selections: unknown values, order, too few items, single-choice options', () => {
    const sel = normaliseSelection('intervals', {
      items: ['5P', 'bogus', '3m'],
      options: { directions: ['harmonic', 'sideways', 'up'] },
    });
    expect(sel.items).toEqual(['3m', '5P']);
    expect(sel.options.directions).toEqual(['up', 'harmonic']);

    expect(normaliseSelection('chords', { items: ['maj7'], options: {} }).items).toEqual(defaultSelection('chords').items);
    expect(normaliseSelection('chords', { items: ['M', 'm'], options: { playback: ['block', 'arpeggio'] } }).options.playback).toEqual([
      'arpeggio',
    ]);
    expect(normaliseSelection('voicings', undefined)).toEqual(defaultSelection('voicings'));
  });

  it('lists items in musical order and offers every catalogue entry once', () => {
    expect(CUSTOM_SPECS.chords.items.slice(0, 6).map((i) => i.value)).toEqual(['M', 'm', 'dim', 'aug', 'maj7', '7']);
    expect(CUSTOM_SPECS.degrees.items.map((i) => i.value)).toEqual(['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']);
    expect(CUSTOM_SPECS.intervals.items[0]!.value).toBe('2m');
    expect(CUSTOM_SPECS.chords.items).toHaveLength(Object.keys(CHORD_QUALITIES).length);
    for (const k of KINDS) {
      const values = CUSTOM_SPECS[k].items.map((i) => i.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('uses all twelve keys only when asked', () => {
    const easy = buildCustomDrill('progressions', { items: ['ii-V-I', 'backdoor'], options: { keys: ['easy'] } });
    const all = buildCustomDrill('progressions', { items: ['ii-V-I', 'backdoor'], options: { keys: ['all'] } });
    expect(easy.kind === 'progressions' && easy.keys.length).toBe(4);
    expect(all.kind === 'progressions' && all.keys.length).toBe(12);
  });
});
