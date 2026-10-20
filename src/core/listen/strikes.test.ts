import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { MicTranscriber, StrikeWatcher, type MicFrame } from './strikes';
import { unit, type NoteDictionary } from './decompose';
import { spectrumToSemitones } from './semitones';
import { midiToFrequency } from './spectrum';

const SR = 48000;
const FFT = 16384;
const m = (notes: string) => notes.split(' ').map((n) => Note.midi(n)!);

interface Played {
  notes: number[];
  at: number;
  /** Loudness, default 1. */
  vel?: number;
  /** Released (fades fast) at this time; otherwise rings with a slow decay, like with the pedal down. */
  until?: number;
}

/** Simulated mic frames for a performance: piano-like partials with attack and decay. */
function frames(played: Played[], endMs: number, step = 30): MicFrame[] {
  const out: MicFrame[] = [];
  const binHz = SR / FFT;
  for (let time = 0; time <= endMs; time += step) {
    const power = new Float32Array(FFT / 2);
    let rms = 0;
    for (const p of played) {
      if (time < p.at) continue;
      const age = (time - p.at) / 1000;
      const released = p.until !== undefined && time > p.until ? (time - p.until) / 1000 : 0;
      const env = (p.vel ?? 1) * Math.exp(-1.2 * age) * Math.exp(-12 * released);
      for (const n of p.notes) {
        for (let h = 1; h <= 8; h++) {
          const c = (midiToFrequency(n) * h * Math.sqrt(1 + 0.0004 * h * h)) / binHz;
          const amp = (env / h ** 0.9) * (h === 1 && n < 48 ? 0.35 : 1);
          for (let i = Math.floor(c) - 2; i <= Math.ceil(c) + 2; i++) {
            // Partials of different strings add up as power (their phases are unrelated).
            if (i > 0 && i < power.length) power[i]! += (amp * Math.exp(-((i - c) ** 2) / 0.8)) ** 2;
          }
        }
        rms += 0.05 * env;
      }
    }
    out.push({ time, rms, db: power.map((v) => 10 * Math.log10(v + 1e-10)), sampleRate: SR });
  }
  return out;
}

describe('StrikeWatcher', () => {
  it('reports each strike once, after it settles', () => {
    const w = new StrikeWatcher(0, 250);
    const strikes = frames([{ notes: m('C3 E3 G3'), at: 300 }, { notes: m('D3 F3 A3'), at: 1500 }], 3000)
      .map((f) => w.push(f))
      .filter((s) => s !== null);
    expect(strikes.map((s) => s!.time)).toEqual([300, 1500]);
    expect(strikes[0]!.frame.time).toBeGreaterThanOrEqual(550);
  });
});

/** What calibration would record on this simulated piano: each key on its own. */
function calibrated(): NoteDictionary {
  const notes: number[] = [];
  for (let n = 28; n <= 96; n++) notes.push(n);
  const templates = notes.map((n) => unit(spectrumToSemitones(frames([{ notes: [n], at: 0 }], 0)[0]!.db, SR)));
  return { notes, templates, calibrated: true };
}

describe('MicTranscriber', () => {
  const dict = calibrated();

  function transcribe(played: Played[], endMs: number): number[][] {
    const t = new MicTranscriber(dict);
    const changes: number[][] = [];
    // Half a second of room sound first, as when you press Start and then play.
    const LEAD = 500;
    const shifted = played.map((p) => ({ ...p, at: p.at + LEAD, until: p.until === undefined ? undefined : p.until + LEAD }));
    for (const f of frames(shifted, endMs + LEAD)) {
      const notes = t.push(f);
      if (notes) changes.push(notes);
    }
    return changes;
  }

  it('locks each chord after its attack instead of following the decay', () => {
    const changes = transcribe(
      [
        { notes: m('D3 F3 A3 C4'), at: 100, until: 1000 },
        { notes: m('G2 B2 D3 F3'), at: 1100, until: 2000 },
        { notes: m('C3 E3 G3 B3'), at: 2100 },
      ],
      3500,
    );
    expect(changes).toEqual([m('D3 F3 A3 C4'), m('G2 B2 D3 F3'), m('C3 E3 G3 B3')]);
  });

  it('shows the new chord, not a pile-up, when the old one rings on (pedal down)', () => {
    const changes = transcribe(
      [
        { notes: m('D3 F3 A3 C4'), at: 100 },
        { notes: m('G2 B2 D3 F3'), at: 1200 },
      ],
      2200,
    );
    expect(changes.at(-1)).toEqual(m('G2 B2 D3 F3'));
  });

  it('keeps a held bass note when only the right hand changes', () => {
    const changes = transcribe(
      [
        { notes: m('C2'), at: 100, vel: 3 },
        { notes: m('E3 G3 B3'), at: 100, until: 1000 },
        { notes: m('E3 G3 Bb3 D4'), at: 1100 },
      ],
      2200,
    );
    expect(changes.at(-1)).toEqual(m('C2 E3 G3 Bb3 D4'));
  });

  it("doesn't carry over the previous chord's bass once it has been released", () => {
    const changes = transcribe(
      [
        { notes: m('A2 G3 C#4 E4'), at: 100, until: 1050 },
        { notes: m('D3 F3 A3 C4'), at: 1100 },
      ],
      2200,
    );
    expect(changes.at(-1)).toEqual(m('D3 F3 A3 C4'));
  });

  it('clears after a moment of silence', () => {
    const changes = transcribe([{ notes: m('C3 E3 G3'), at: 100, until: 600 }], 2500);
    expect(changes.at(-1)).toEqual([]);
  });
});
