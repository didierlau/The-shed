/**
 * Which notes are sounding on a MIDI keyboard, including the sustain pedal.
 *
 * A note sounds while its key is down, or after release while the pedal is
 * held. Pressing a key when no keys are down starts a new gesture: notes only
 * held by the pedal from the previous chord are let go, so comping with the
 * pedal down still shows each new chord rather than piling them up.
 */
export class MidiNotes {
  private down = new Set<number>();
  private sustained = new Set<number>();
  private pedal = false;

  noteOn(note: number): void {
    if (this.down.size === 0) this.sustained.clear();
    this.down.add(note);
    this.sustained.delete(note);
  }

  noteOff(note: number): void {
    if (!this.down.delete(note)) return;
    if (this.pedal) this.sustained.add(note);
  }

  setPedal(on: boolean): void {
    this.pedal = on;
    if (!on) this.sustained.clear();
  }

  /** Everything sounding right now, lowest first. */
  sounding(): number[] {
    return [...new Set([...this.down, ...this.sustained])].sort((a, b) => a - b);
  }

  reset(): void {
    this.down.clear();
    this.sustained.clear();
    this.pedal = false;
  }

  /**
   * Apply one raw MIDI message (status byte, data, data). Returns true if the
   * sounding notes may have changed. Channel is ignored.
   */
  handleMessage(data: ArrayLike<number>): boolean {
    const status = (data[0] ?? 0) & 0xf0;
    const a = data[1] ?? 0;
    const b = data[2] ?? 0;
    if (status === 0x90 && b > 0) this.noteOn(a);
    else if (status === 0x80 || (status === 0x90 && b === 0)) this.noteOff(a);
    else if (status === 0xb0 && a === 64) this.setPedal(b >= 64);
    else if (status === 0xb0 && (a === 120 || a === 123)) this.reset();
    else return false;
    return true;
  }
}
