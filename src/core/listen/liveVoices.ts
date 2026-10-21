/**
 * Decides when a note played live on a MIDI keyboard should start and stop
 * sounding, the way a real piano does: a note rings while its key is down, and
 * after release while the sustain pedal is held. Pure logic; the player makes
 * the sound.
 *
 * Unlike MidiNotes (which drops pedalled notes at each new chord so the chord
 * name stays readable), the sound keeps every pedalled note ringing.
 */
export type VoiceAction = { type: 'start'; note: number; velocity: number } | { type: 'stop'; note: number };

export class LiveVoices {
  private down = new Set<number>();
  private ringing = new Set<number>();
  private pedal = false;

  noteOn(note: number, velocity: number): VoiceAction[] {
    const actions: VoiceAction[] = [];
    // Striking a key that is still ringing re-strikes it, as on a piano.
    if (this.ringing.has(note)) actions.push({ type: 'stop', note });
    this.down.add(note);
    this.ringing.add(note);
    actions.push({ type: 'start', note, velocity });
    return actions;
  }

  noteOff(note: number): VoiceAction[] {
    this.down.delete(note);
    if (this.pedal || !this.ringing.delete(note)) return [];
    return [{ type: 'stop', note }];
  }

  setPedal(on: boolean): VoiceAction[] {
    this.pedal = on;
    if (on) return [];
    const released = [...this.ringing].filter((n) => !this.down.has(n));
    for (const n of released) this.ringing.delete(n);
    return released.map((note) => ({ type: 'stop', note }));
  }

  /** Silence everything (all-notes-off message, or the session ends). */
  reset(): VoiceAction[] {
    const actions = [...this.ringing].map((note): VoiceAction => ({ type: 'stop', note }));
    this.down.clear();
    this.ringing.clear();
    this.pedal = false;
    return actions;
  }

  /** Apply one raw MIDI message (status, data, data). Channel is ignored. */
  handleMessage(data: ArrayLike<number>): VoiceAction[] {
    const status = (data[0] ?? 0) & 0xf0;
    const a = data[1] ?? 0;
    const b = data[2] ?? 0;
    if (status === 0x90 && b > 0) return this.noteOn(a, b);
    if (status === 0x80 || (status === 0x90 && b === 0)) return this.noteOff(a);
    if (status === 0xb0 && a === 64) return this.setPedal(b >= 64);
    if (status === 0xb0 && (a === 120 || a === 123)) return this.reset();
    return [];
  }
}
