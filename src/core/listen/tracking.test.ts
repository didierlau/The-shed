import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { MidiNotes } from './midiNotes';
import { ChordTracker } from './tracker';
import { midiToFrequency, NoteSmoother, spectrumToNotes } from './spectrum';

const m = (notes: string) => notes.split(' ').map((n) => Note.midi(n)!);

describe('MidiNotes', () => {
  it('follows note on and off, including note-on with velocity 0', () => {
    const k = new MidiNotes();
    k.handleMessage([0x90, 60, 100]);
    k.handleMessage([0x91, 64, 90]); // channel 2 counts too
    expect(k.sounding()).toEqual([60, 64]);
    k.handleMessage([0x80, 60, 0]);
    k.handleMessage([0x90, 64, 0]);
    expect(k.sounding()).toEqual([]);
  });

  it('keeps released notes sounding while the pedal is down', () => {
    const k = new MidiNotes();
    k.handleMessage([0xb0, 64, 127]);
    for (const n of m('C3 E3 G3')) k.noteOn(n);
    for (const n of m('C3 E3 G3')) k.noteOff(n);
    expect(k.sounding()).toEqual(m('C3 E3 G3'));
    k.handleMessage([0xb0, 64, 0]);
    expect(k.sounding()).toEqual([]);
  });

  it('starts a new chord when you press keys again with the pedal still down', () => {
    const k = new MidiNotes();
    k.setPedal(true);
    for (const n of m('D3 F3 A3 C4')) k.noteOn(n);
    for (const n of m('D3 F3 A3 C4')) k.noteOff(n);
    for (const n of m('G2 B2 F3')) k.noteOn(n);
    expect(k.sounding()).toEqual(m('G2 B2 F3'));
  });

  it('lets a melody ring over a held chord', () => {
    const k = new MidiNotes();
    for (const n of m('C3 E3 G3')) k.noteOn(n);
    k.noteOn(Note.midi('B4')!);
    expect(k.sounding()).toEqual(m('C3 E3 G3 B4'));
  });

  it('clears everything on "all notes off" and ignores other messages', () => {
    const k = new MidiNotes();
    k.noteOn(60);
    expect(k.handleMessage([0xe0, 0, 64])).toBe(false); // pitch bend
    expect(k.handleMessage([0xb0, 123, 0])).toBe(true);
    expect(k.sounding()).toEqual([]);
  });
});

describe('ChordTracker', () => {
  it('reports a chord once it has settled, and only when it changes', () => {
    const t = new ChordTracker(80);
    const dm7 = m('D3 F3 A3 C4');
    expect(t.update(0, dm7).changed).toBeNull();
    expect(t.update(50, dm7).changed).toBeNull();
    expect(t.update(100, dm7).changed?.symbol).toBe('Dm7');
    expect(t.update(200, dm7).changed).toBeNull();
    const g7 = m('G2 B2 D3 F3');
    t.update(300, g7);
    const ev = t.update(400, g7).changed!;
    expect(ev.symbol).toBe('G7');
    expect(ev.time).toBe(300);
  });

  it('ignores the half-chord you pass through while rolling a chord', () => {
    const t = new ChordTracker(80);
    const events: string[] = [];
    const roll = [m('C3 E3'), m('C3 E3 G3'), m('C3 E3 G3 B3')];
    let time = 0;
    for (const notes of roll) {
      for (let i = 0; i < 3; i++, time += 20) {
        const ev = t.update(time, notes).changed;
        if (ev) events.push(ev.symbol);
      }
    }
    for (let i = 0; i < 5; i++, time += 20) {
      const ev = t.update(time, m('C3 E3 G3 B3')).changed;
      if (ev) events.push(ev.symbol);
    }
    expect(events).toEqual(['Cmaj7']);
  });

  it('shows live names immediately, before the chord settles', () => {
    const t = new ChordTracker(80);
    expect(t.update(0, m('A2 C3 E3 G3')).current[0]?.symbol).toBe('Am7');
  });
});

/** A fake piano spectrum: each note with decaying overtones, as an AnalyserNode would report in dB. */
function fakeSpectrum(notes: number[], sampleRate = 48000, fftSize = 16384, loudness: number[] = []): Float32Array {
  const bins = fftSize / 2;
  const lin = new Float32Array(bins);
  const binHz = sampleRate / fftSize;
  notes.forEach((n, idx) => {
    const amp = loudness[idx] ?? 1;
    for (let h = 1; h <= 6; h++) {
      const f = midiToFrequency(n) * h;
      const centre = f / binHz;
      for (let i = Math.floor(centre) - 2; i <= Math.ceil(centre) + 2; i++) {
        if (i < 0 || i >= bins) continue;
        lin[i]! += (amp / h) * Math.exp(-((i - centre) ** 2) / 0.8);
      }
    }
  });
  return lin.map((v) => 20 * Math.log10(v + 1e-6) - 30);
}

describe('spectrumToNotes', () => {
  it('finds a single note without its overtones', () => {
    expect(spectrumToNotes(fakeSpectrum(m('A3')), 48000)).toEqual(m('A3'));
    expect(spectrumToNotes(fakeSpectrum(m('C3')), 48000)).toEqual(m('C3'));
  });

  it('finds the notes of a chord, close or spread', () => {
    expect(spectrumToNotes(fakeSpectrum(m('C3 E3 G3 B3')), 48000)).toEqual(m('C3 E3 G3 B3'));
    expect(spectrumToNotes(fakeSpectrum(m('D2 F3 A3 C4 E4')), 48000)).toEqual(m('D2 F3 A3 C4 E4'));
  });

  it('is silent on silence', () => {
    expect(spectrumToNotes(new Float32Array(8192).fill(-120), 48000)).toEqual([]);
  });

  it('ignores much quieter background notes', () => {
    expect(spectrumToNotes(fakeSpectrum(m('C3 E3 G3 F#5'), 48000, 16384, [1, 1, 1, 0.02]), 48000)).toEqual(m('C3 E3 G3'));
  });
});

describe('NoteSmoother', () => {
  it('keeps notes heard in most recent frames and drops one-frame blips', () => {
    const s = new NoteSmoother(4, 3);
    s.push([60, 64, 67]);
    s.push([60, 64, 67, 90]);
    expect(s.push([60, 67])).toEqual([60, 67]);
    expect(s.push([60, 64, 67])).toEqual([60, 64, 67]);
    // Fading out: E has now been heard in only 2 of the last 4 frames, C and G in 3.
    expect(s.push([])).toEqual([60, 67]);
    expect(s.push([])).toEqual([]);
  });
});
