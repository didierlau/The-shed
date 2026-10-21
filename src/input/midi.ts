import { MidiNotes } from '../core/listen/midiNotes';
import { LiveVoices, type VoiceAction } from '../core/listen/liveVoices';

/**
 * The only code that talks to Web MIDI. Works in Chrome on Android with a USB
 * cable (OTG adapter) or a Bluetooth MIDI piano that's been paired.
 */

export interface MidiSession {
  stop(): void;
}

export interface MidiCallbacks {
  /** Sounding notes changed (MIDI numbers, lowest first). */
  onNotes(notes: number[]): void;
  /** Connected input devices changed. */
  onDevices(names: string[]): void;
  /** Optional: when each played note should start and stop sounding (follows the sustain pedal). */
  onVoices?(actions: VoiceAction[]): void;
}

export function midiSupported(): boolean {
  return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
}

export async function startMidi(callbacks: MidiCallbacks): Promise<MidiSession> {
  const access = await navigator.requestMIDIAccess();
  const notes = new MidiNotes();
  const voices = new LiveVoices();

  const onMessage = (e: MIDIMessageEvent) => {
    if (!e.data) return;
    if (callbacks.onVoices) {
      const actions = voices.handleMessage(e.data);
      if (actions.length) callbacks.onVoices(actions);
    }
    if (notes.handleMessage(e.data)) callbacks.onNotes(notes.sounding());
  };

  const wire = () => {
    const names: string[] = [];
    access.inputs.forEach((input) => {
      input.onmidimessage = onMessage;
      if (input.state === 'connected') names.push(input.name ?? 'MIDI device');
    });
    callbacks.onDevices(names);
  };

  wire();
  access.onstatechange = wire;

  return {
    stop() {
      access.onstatechange = null;
      access.inputs.forEach((input) => (input.onmidimessage = null));
      notes.reset();
      const actions = voices.reset();
      if (actions.length) callbacks.onVoices?.(actions);
    },
  };
}
