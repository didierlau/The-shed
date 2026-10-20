import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { decompose, modelDictionary, unit, type NoteDictionary } from './decompose';
import { VEC_LOW, VEC_SIZE, type SemitoneVector } from './semitones';
import { OnsetDetector } from './onset';
import { seededRng } from '../random';

const m = (notes: string) => notes.split(' ').map((n) => Note.midi(n)!);

/**
 * A stand-in for a real piano through a phone mic: every key has its own overtone
 * balance, the strings are stiffer than the model assumes, and the bass fundamentals
 * are very weak. Deterministic per key.
 */
function realPianoNote(midi: number): SemitoneVector {
  const rng = seededRng(1000 + midi);
  const v = new Float64Array(VEC_SIZE);
  const inharmonicity = midi < 48 ? 0.0002 : 0.0009;
  for (let h = 1; h <= 12; h++) {
    const k = Math.round(midi + 12 * Math.log2(h * Math.sqrt(1 + inharmonicity * h * h))) - VEC_LOW;
    if (k < 0 || k >= VEC_SIZE) continue;
    let amp = (1 / h) * (0.6 + 0.8 * rng());
    if (h === 1 && midi < 50) amp *= 0.12; // phone mics barely hear low fundamentals
    v[k]! += amp;
  }
  return v;
}

function mix(notes: number[], seed = 1, noise = 0.01): SemitoneVector {
  const rng = seededRng(seed);
  const power = new Float64Array(VEC_SIZE);
  for (const n of notes) {
    const v = realPianoNote(n);
    const vel = 0.6 + 0.4 * rng();
    for (let k = 0; k < VEC_SIZE; k++) power[k]! += (v[k]! * vel) ** 2;
  }
  for (let k = 0; k < VEC_SIZE; k++) power[k]! += (noise * rng()) ** 2; // room noise
  return power.map(Math.sqrt);
}

/** What calibration produces: each key recorded on its own. */
function calibratedDictionary(low: number, high: number): NoteDictionary {
  const notes: number[] = [];
  for (let n = low; n <= high; n++) notes.push(n);
  return { notes, templates: notes.map((n) => unit(realPianoNote(n))), calibrated: true };
}

const CHORDS = [
  'D3 F3 A3 C4',
  'G2 B2 D3 F3',
  'C3 E3 G3 B3',
  'A2 C3 E3 G3',
  'D2 F3 A3 C4 E4',
  'G2 F3 B3 E4',
  'C3 E3 Bb3 D4',
  'F2 A3 C4 E4 G4',
  'E3 G3 Bb3 D4',
  'Bb2 Ab3 D4 G4',
];

describe('decompose with a calibrated piano', () => {
  const dict = calibratedDictionary(Note.midi('C2')!, Note.midi('C6')!);

  it('finds every note of common jazz voicings, including weak bass notes', () => {
    CHORDS.forEach((chord, i) => {
      expect(decompose(mix(m(chord), i), dict), chord).toEqual(m(chord));
    });
  });

  it('finds single melody notes without their overtones', () => {
    for (const n of m('C2 G2 C3 A3 E4 B4 F#5')) expect(decompose(mix([n], n), dict)).toEqual([n]);
  });

  it('copes with a noisy room', () => {
    let right = 0;
    CHORDS.forEach((chord, i) => {
      if (decompose(mix(m(chord), i, 0.08), dict).join() === m(chord).join()) right++;
    });
    expect(right).toBeGreaterThanOrEqual(8);
  });

  it('finds nothing in silence', () => {
    expect(decompose(new Float64Array(VEC_SIZE), dict)).toEqual([]);
  });
});

describe('decompose without calibration (modelled piano)', () => {
  const dict = modelDictionary(Note.midi('C2')!, Note.midi('C6')!);

  it('gets the pitch classes of most chords right on an unfamiliar piano', () => {
    let right = 0;
    CHORDS.forEach((chord, i) => {
      const pcs = (ns: number[]) => [...new Set(ns.map((n) => n % 12))].sort();
      if (pcs(decompose(mix(m(chord), i), dict)).join() === pcs(m(chord)).join()) right++;
    });
    // Calibration exists because the model can't match every piano; it should still do well.
    expect(right).toBeGreaterThanOrEqual(7);
  });
});

describe('OnsetDetector', () => {
  it('fires on each strike, not on the decay or in silence', () => {
    const d = new OnsetDetector();
    const onsets: number[] = [];
    let level = 0;
    for (let t = 0; t < 3000; t += 30) {
      if (t === 300 || t === 1500 || t === 1530) level = 0.3; // two strikes; 1530 is a bounce
      else level *= 0.93; // piano decay
      if (t > 2400) level = 0.001;
      if (d.push(t, level)) onsets.push(t);
    }
    expect(onsets).toEqual([300, 1500]);
  });

  it('listens to the room briefly before the first strike can count', () => {
    const d = new OnsetDetector();
    expect(d.push(0, 0.2)).toBe(false);
  });

  it('catches quiet high notes in a quiet room', () => {
    const d = new OnsetDetector();
    const onsets: number[] = [];
    let level = 0.0003; // quiet room
    for (let t = 0; t < 3000; t += 30) {
      if (t === 1200) level = 0.004; // a soft C6: well under the old fixed threshold
      else level = Math.max(0.0003, level * 0.85); // high notes die away fast
      if (d.push(t, level)) onsets.push(t);
    }
    expect(onsets).toEqual([1200]);
  });

  it('ignores a noisy room until something is actually played', () => {
    const d = new OnsetDetector();
    const onsets: number[] = [];
    for (let t = 0; t < 3000; t += 30) {
      const noise = 0.006 + 0.003 * Math.sin(t / 37) * Math.sin(t / 11); // fan, traffic
      const level = t === 2400 ? 0.08 : noise;
      if (d.push(t, level)) onsets.push(t);
    }
    expect(onsets).toEqual([2400]);
  });

  it('fires when a new chord is struck over a ringing one', () => {
    const d = new OnsetDetector();
    const onsets: number[] = [];
    let level = 0;
    for (let t = 0; t < 1800; t += 30) {
      if (t === 300) level = 0.4;
      else if (t === 1200) level = Math.max(level, 0.3) + 0.25;
      else level *= 0.95;
      if (d.push(t, level)) onsets.push(t);
    }
    expect(onsets).toEqual([300, 1200]);
  });
});
