import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { MidiNotes } from './midiNotes';
import { ChordTracker } from './tracker';

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
