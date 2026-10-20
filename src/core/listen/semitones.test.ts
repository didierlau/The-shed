import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { at, measureCents, newEnergy, spectrumToSemitones, VEC_SIZE } from './semitones';
import { midiToFrequency } from './spectrum';

const SR = 48000;
const FFT = 16384;

/** dB spectrum with sine peaks at the given frequencies (as an AnalyserNode would show). */
function peaks(freqs: { hz: number; amp: number }[]): Float32Array {
  const bins = FFT / 2;
  const lin = new Float32Array(bins);
  const binHz = SR / FFT;
  for (const { hz, amp } of freqs) {
    const c = hz / binHz;
    for (let i = Math.floor(c) - 3; i <= Math.ceil(c) + 3; i++) {
      if (i >= 0 && i < bins) lin[i]! += amp * Math.exp(-((i - c) ** 2) / 0.8);
    }
  }
  return lin.map((v) => 20 * Math.log10(v + 1e-6));
}

describe('spectrumToSemitones', () => {
  it('puts each peak in its key', () => {
    const v = spectrumToSemitones(peaks([{ hz: 440, amp: 1 }, { hz: midiToFrequency(48), amp: 0.5 }]), SR);
    expect(v).toHaveLength(VEC_SIZE);
    const loudest = [...v].indexOf(Math.max(...v));
    expect(at(v, 69)).toBe(v[loudest]);
    expect(at(v, 48)).toBeGreaterThan(at(v, 47) * 5);
    expect(at(v, 48)).toBeGreaterThan(at(v, 49) * 5);
  });

  it('shifts key boundaries for a piano that is out of tune', () => {
    // A piano 45 cents flat: its A4 is at 428.8 Hz, close to the G#/A boundary.
    const flatA = 440 * 2 ** (-45 / 1200);
    const asIs = spectrumToSemitones(peaks([{ hz: flatA, amp: 1 }]), SR, 0);
    const tuned = spectrumToSemitones(peaks([{ hz: flatA, amp: 1 }]), SR, -45);
    expect(at(tuned, 69) / (at(tuned, 68) + 1e-9)).toBeGreaterThan(at(asIs, 69) / (at(asIs, 68) + 1e-9));
  });
});

describe('newEnergy', () => {
  it('keeps what appeared and ignores what faded', () => {
    const before = new Float64Array(VEC_SIZE);
    const after = new Float64Array(VEC_SIZE);
    before[10] = 1; // fading note
    after[10] = 0.6;
    after[20] = 0.8; // new note
    const d = newEnergy(after, before);
    expect(d[10]).toBe(0);
    expect(d[20]).toBeCloseTo(0.8);
  });
});

describe('measureCents', () => {
  it('reads how far a note is from equal temperament', () => {
    const a4 = Note.midi('A4')!;
    expect(measureCents(peaks([{ hz: 440, amp: 1 }]), SR, a4)!).toBeCloseTo(0, 0);
    expect(measureCents(peaks([{ hz: 440 * 2 ** (12 / 1200), amp: 1 }]), SR, a4)!).toBeCloseTo(12, -0.5);
    expect(measureCents(peaks([{ hz: 440 * 2 ** (-20 / 1200), amp: 1 }]), SR, a4)!).toBeCloseTo(-20, -0.5);
  });

  it('uses the 2nd partial when the fundamental is missing (low notes on a phone)', () => {
    const c2 = Note.midi('C2')!;
    const f = midiToFrequency(c2) * 2 ** (8 / 1200);
    const cents = measureCents(peaks([{ hz: f * 2, amp: 1 }, { hz: f * 3, amp: 0.6 }]), SR, c2);
    expect(cents!).toBeCloseTo(8, -0.5);
  });

  it('returns null when there is nothing there', () => {
    expect(measureCents(new Float32Array(FFT / 2).fill(-100), SR, 60)).toBeNull();
  });
});
