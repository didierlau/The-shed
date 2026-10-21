import { describe, expect, it } from 'vitest';
import { LiveVoices } from './liveVoices';

const on = (n: number, v = 100) => [0x90, n, v];
const off = (n: number) => [0x80, n, 0];
const pedal = (down: boolean) => [0xb0, 64, down ? 127 : 0];

describe('LiveVoices', () => {
  it('starts on key down and stops on key up', () => {
    const v = new LiveVoices();
    expect(v.handleMessage(on(60, 90))).toEqual([{ type: 'start', note: 60, velocity: 90 }]);
    expect(v.handleMessage(off(60))).toEqual([{ type: 'stop', note: 60 }]);
    // Note-on with velocity 0 is a note-off.
    v.handleMessage(on(62));
    expect(v.handleMessage([0x90, 62, 0])).toEqual([{ type: 'stop', note: 62 }]);
  });

  it('keeps released notes ringing while the pedal is down, across chords', () => {
    const v = new LiveVoices();
    v.handleMessage(pedal(true));
    v.handleMessage(on(60));
    expect(v.handleMessage(off(60))).toEqual([]);
    v.handleMessage(on(64));
    expect(v.handleMessage(off(64))).toEqual([]);
    v.handleMessage(on(67)); // still held when the pedal comes up
    const released = v.handleMessage(pedal(false));
    expect(released.map((a) => a.note).sort()).toEqual([60, 64]);
    expect(v.handleMessage(off(67))).toEqual([{ type: 'stop', note: 67 }]);
  });

  it('re-strikes a note that is still ringing', () => {
    const v = new LiveVoices();
    v.handleMessage(pedal(true));
    v.handleMessage(on(60));
    v.handleMessage(off(60));
    expect(v.handleMessage(on(60, 50))).toEqual([
      { type: 'stop', note: 60 },
      { type: 'start', note: 60, velocity: 50 },
    ]);
  });

  it('silences everything on all-notes-off', () => {
    const v = new LiveVoices();
    v.handleMessage(on(60));
    v.handleMessage(on(64));
    expect(v.handleMessage([0xb0, 123, 0]).map((a) => a.note).sort()).toEqual([60, 64]);
    expect(v.handleMessage(off(60))).toEqual([]);
  });

  it('ignores the MIDI channel and other messages', () => {
    const v = new LiveVoices();
    expect(v.handleMessage([0x93, 60, 80])).toEqual([{ type: 'start', note: 60, velocity: 80 }]);
    expect(v.handleMessage([0xe0, 0, 64])).toEqual([]);
  });
});
