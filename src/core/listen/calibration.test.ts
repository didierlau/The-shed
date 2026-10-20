import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { buildDictionary, CalibrationSession, CALIBRATION_RANGES } from './calibration';
import { decompose } from './decompose';
import { VEC_LOW, VEC_SIZE, type SemitoneVector } from './semitones';
import { seededRng } from '../random';

const m = (notes: string) => notes.split(' ').map((n) => Note.midi(n)!);

/** Same stand-in piano as the decomposition tests: own overtone mix per key, weak bass fundamentals. */
function pianoNote(midi: number, gain = 1): SemitoneVector {
  const rng = seededRng(2000 + midi);
  const v = new Float64Array(VEC_SIZE);
  const B = midi < 48 ? 0.0002 : 0.0009;
  for (let h = 1; h <= 12; h++) {
    const k = Math.round(midi + 12 * Math.log2(h * Math.sqrt(1 + B * h * h))) - VEC_LOW;
    if (k < 0 || k >= VEC_SIZE) continue;
    let amp = (1 / h) * (0.6 + 0.8 * rng());
    if (h === 1 && midi < 50) amp *= 0.12;
    v[k]! += amp * gain;
  }
  return v;
}

function mix(...vs: SemitoneVector[]): SemitoneVector {
  const out = new Float64Array(VEC_SIZE);
  for (let k = 0; k < VEC_SIZE; k++) out[k] = Math.sqrt(vs.reduce((s, v) => s + v[k]! ** 2, 0));
  return out;
}

const silence: SemitoneVector = new Float64Array(VEC_SIZE);

/** Play a chromatic run into a session the way a person would: each key over the previous one's decay. */
function runThrough(session: CalibrationSession) {
  let ringing: SemitoneVector = silence;
  while (session.expected !== null) {
    const n = session.expected;
    const after = mix(pianoNote(n), pianoNote(n - 1, 0.4)); // previous key still fading
    session.offer(after, ringing, 3);
    ringing = mix(pianoNote(n, 0.5));
  }
}

describe('CalibrationSession', () => {
  it('walks through the keys in order and accepts each when played', () => {
    const s = new CalibrationSession(CALIBRATION_RANGES.quick.low, CALIBRATION_RANGES.quick.high);
    expect(s.total).toBe(25);
    expect(s.expected).toBe(Note.midi('C3'));
    runThrough(s);
    expect(s.done).toBe(25);
    expect(s.expected).toBeNull();
  });

  it('accepts weak-fundamental bass keys through their 2nd partial', () => {
    const s = new CalibrationSession(Note.midi('C2')!, Note.midi('E2')!);
    runThrough(s);
    expect(s.done).toBe(5);
  });

  it('accepts a faint bass key from its upper partials when the lower ones are lost in noise', () => {
    const s = new CalibrationSession(Note.midi('Eb2')!, Note.midi('Eb2')!);
    const n = Note.midi('Eb2')!;
    const v = pianoNote(n);
    // Wash out the fundamental and 2nd partial with low-frequency rumble.
    for (const k of [n, n + 1, n - 1, n + 12, n + 11, n + 13]) v[k - VEC_LOW] = 0.6;
    expect(s.offer(v, silence, null).accepted).toBe(true);
  });

  it('rejects the wrong key and says what it heard', () => {
    const s = new CalibrationSession(60, 72);
    const r = s.offer(pianoNote(62), silence, 0);
    expect(r).toEqual({ accepted: false, heard: 62 });
    expect(s.done).toBe(0);
  });

  it('can undo the last key', () => {
    const s = new CalibrationSession(60, 72);
    s.offer(pianoNote(60), silence, 0);
    s.offer(pianoNote(61), silence, 0);
    s.undo();
    expect(s.expected).toBe(61);
  });

  it('can skip a key it cannot hear, and stop early with what it has', () => {
    const s = new CalibrationSession(60, 72);
    s.offer(pianoNote(60), silence, 0);
    s.skip();
    expect(s.expected).toBe(62);
    s.offer(pianoNote(62), silence, 0);
    expect(s.done).toBe(2);
    expect(s.position).toBe(3);
    expect(s.skipped).toEqual([61]);
    s.undo(); // back over 62
    s.undo(); // back over the skip
    expect(s.expected).toBe(61);
    expect(s.done).toBe(1);
    // Finishing early keeps the recorded keys; the dictionary fills the rest from neighbours.
    s.offer(pianoNote(61), silence, 0);
    const cal = s.result('2026-10-20');
    expect(cal.keys.map((k) => k.midi)).toEqual([60, 61]);
    expect(buildDictionary(cal).notes).toContain(72);
  });

  it('measures tuning as the median, ignoring keys it could not measure', () => {
    const s = new CalibrationSession(60, 65);
    [-10, -12, null, -11, 40, -11].forEach((c, i) => s.offer(pianoNote(60 + i), silence, c));
    const cal = s.result('2026-10-20');
    expect(cal.tuningCents).toBe(-11);
    expect(cal.keys).toHaveLength(6);
  });
});

describe('buildDictionary', () => {
  it('falls back to modelled notes without a calibration', () => {
    expect(buildDictionary(null).calibrated).toBe(false);
  });

  it('after a quick calibration, names chords inside and below the recorded range', () => {
    const s = new CalibrationSession(CALIBRATION_RANGES.quick.low, CALIBRATION_RANGES.quick.high);
    runThrough(s);
    const dict = buildDictionary(s.result('2026-10-20'));
    expect(dict.calibrated).toBe(true);
    expect(dict.notes[0]).toBe(VEC_LOW);
    for (const chord of ['D3 F3 A3 C4', 'C3 E3 G3 B3', 'E3 G3 Bb3 D4']) {
      expect(decompose(mix(...m(chord).map((n) => pianoNote(n))), dict), chord).toEqual(m(chord));
    }
  });

  it('after a full calibration, also gets low bass notes right', () => {
    const s = new CalibrationSession(CALIBRATION_RANGES.full.low, CALIBRATION_RANGES.full.high);
    runThrough(s);
    const dict = buildDictionary(s.result('2026-10-20'));
    for (const chord of ['G2 F3 B3 E4', 'D2 F3 A3 C4 E4', 'A2 C3 E3 G3']) {
      expect(decompose(mix(...m(chord).map((n) => pianoNote(n))), dict), chord).toEqual(m(chord));
    }
  });
});
