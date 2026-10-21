import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { adjustRange, DEFAULT_SETTINGS, MIN_RANGE_SPAN, normaliseSettings, RANGE_LIMITS, RANGE_PRESETS, rangeLabel } from './settings';
import { DRILLS, generateQuestion } from './drills';
import { seededRng } from './random';

describe('settings', () => {
  it('defaults to C3–C5', () => {
    expect(rangeLabel(DEFAULT_SETTINGS.range)).toBe('C3–C5');
  });

  it('repairs bad stored settings', () => {
    expect(normaliseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normaliseSettings({ range: { low: NaN, high: 60 } })).toEqual(DEFAULT_SETTINGS);
    // Swapped ends are put back in order.
    expect(normaliseSettings({ range: { low: 84, high: 48 } }).range).toEqual({ low: 48, high: 84 });
    // Older saved settings without the mic option get the default.
    expect(normaliseSettings({ range: { low: 48, high: 84 } }).micUsesBass).toBe(false);
    expect(normaliseSettings({ range: { low: 48, high: 84 }, micUsesBass: true }).micUsesBass).toBe(true);
    // MIDI sound is on unless switched off.
    expect(normaliseSettings({ range: { low: 48, high: 84 } }).midiSound).toBe(true);
    expect(normaliseSettings({ range: { low: 48, high: 84 }, midiSound: false }).midiSound).toBe(false);
    // Too narrow: widened upwards to two octaves.
    expect(normaliseSettings({ range: { low: 60, high: 62 } }).range).toEqual({ low: 60, high: 60 + MIN_RANGE_SPAN });
    // Out of bounds: clamped.
    expect(normaliseSettings({ range: { low: 0, high: 127 } }).range).toEqual(RANGE_LIMITS);
    expect(normaliseSettings({ range: { low: 120, high: 127 } }).range).toEqual({
      low: RANGE_LIMITS.high - MIN_RANGE_SPAN,
      high: RANGE_LIMITS.high,
    });
  });

  it('adjusts one end at a time without breaking the rules', () => {
    const r = DEFAULT_SETTINGS.range;
    expect(adjustRange(r, 'low', -12)).toEqual({ low: r.low - 12, high: r.high });
    expect(adjustRange(r, 'low', +1)).toEqual(r); // would make it narrower than two octaves
    expect(adjustRange({ low: RANGE_LIMITS.low, high: 80 }, 'low', -1).low).toBe(RANGE_LIMITS.low);
    expect(adjustRange(r, 'high', +7)).toEqual({ low: r.low, high: r.high + 7 });
  });

  it('every drill works at the narrowest and the widest range', () => {
    const rng = seededRng(61);
    const narrow = { range: { low: Note.midi('C4')!, high: Note.midi('C4')! + MIN_RANGE_SPAN }, micUsesBass: false };
    for (const settings of [narrow, ...RANGE_PRESETS.map((p) => ({ range: p.range, micUsesBass: false, midiSound: true }))]) {
      for (const d of DRILLS) {
        for (let i = 0; i < 20; i++) expect(() => generateQuestion(d, rng, {}, settings)).not.toThrow();
      }
    }
  });
});
