/** Frequency ↔ MIDI note number conversions used by the listening code. */

export function frequencyToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
