import { Note } from 'tonal';

/**
 * Jazz piano voicings, described as chord tones stacked from the bottom up.
 * A bass note (the root, low) is always played under them, like a bassist would.
 */

export type VoicingQuality = 'maj7' | 'm7' | '7' | 'm7b5';
export type Tone = '1' | '3' | '5' | '7' | '9' | '11' | '#11' | '13';

/** Semitones above the root and interval name, per tone and quality. Missing = not available. */
const TONES: Record<VoicingQuality, Partial<Record<Tone, [number, string]>>> = {
  maj7: { '1': [0, '1P'], '3': [4, '3M'], '5': [7, '5P'], '7': [11, '7M'], '9': [14, '9M'], '13': [21, '13M'] },
  m7: { '1': [0, '1P'], '3': [3, '3m'], '5': [7, '5P'], '7': [10, '7m'], '9': [14, '9M'], '11': [17, '11P'], '13': [21, '13M'] },
  '7': { '1': [0, '1P'], '3': [4, '3M'], '5': [7, '5P'], '7': [10, '7m'], '9': [14, '9M'], '#11': [18, '11A'], '13': [21, '13M'] },
  m7b5: { '1': [0, '1P'], '3': [3, '3m'], '5': [6, '5d'], '7': [10, '7m'], '9': [14, '9M'], '11': [17, '11P'] },
};

export const VOICINGS = {
  close: { label: 'Close position', detail: '1 3 5 7', tones: ['1', '3', '5', '7'] },
  shell: { label: 'Shell', detail: '3 7 over the root', tones: ['3', '7'] },
  drop2: { label: 'Drop-2', detail: '5 1 3 7', tones: ['5', '1', '3', '7'] },
  rootlessA: { label: 'Rootless A', detail: '3 5 7 9', tones: ['3', '5', '7', '9'] },
  rootlessB: { label: 'Rootless B', detail: '7 9 3 5', tones: ['7', '9', '3', '5'] },
  soWhat: { label: 'So What', detail: 'stacked 4ths + 3rd', tones: ['9', '5', '1', '11', '13'] },
  upperStructure: { label: 'Upper structure II', detail: 'II triad over 3 7', tones: ['3', '7', '9', '#11', '13'] },
} as const satisfies Record<string, { label: string; detail: string; tones: readonly Tone[] }>;

export type VoicingType = keyof typeof VOICINGS;

export const VOICING_QUALITY_SYMBOL: Record<VoicingQuality, string> = { maj7: 'maj7', m7: 'm7', '7': '7', m7b5: 'm7b5' };

/** Whether a voicing type can be built on a quality (So What needs an 11th, upper structure II a #11). */
export function supports(type: VoicingType, quality: VoicingQuality): boolean {
  return VOICINGS[type].tones.every((t) => TONES[quality][t] !== undefined);
}

// The bass sits in C2–B2. The voicing is moved by octaves so its middle lands
// as close as possible to middle C, then up an octave if it would crowd the bass.
const BASS_WINDOW = Note.midi('C2')!;
const VOICING_START = Note.midi('E3')!;
const VOICING_CENTRE = Note.midi('C4')!;
const LOWEST_UPPER_NOTE = Note.midi('C3')!;

/**
 * Build a voicing: root low in the bass, then each tone placed on the
 * nearest pitch above the previous one. Returns MIDI numbers, bass first.
 */
export function buildVoicing(rootMidi: number, quality: VoicingQuality, type: VoicingType): number[] {
  if (!supports(type, quality)) throw new Error(`${type} voicing is not available on ${quality}`);
  const rootChroma = ((rootMidi % 12) + 12) % 12;
  const bass = BASS_WINDOW + rootChroma;
  const notes: number[] = [];
  let floor = VOICING_START - 1;
  for (const tone of VOICINGS[type].tones) {
    const chroma = (rootChroma + TONES[quality][tone]![0]) % 12;
    let m = floor + 1;
    while (((m % 12) + 12) % 12 !== chroma) m++;
    notes.push(m);
    floor = m;
  }
  const middle = (Math.min(...notes) + Math.max(...notes)) / 2;
  let shift = 12 * Math.round((VOICING_CENTRE - middle) / 12);
  if (Math.min(...notes) + shift < LOWEST_UPPER_NOTE) shift += 12;
  return [bass, ...notes.map((m) => m + shift)];
}

/** Note names of the voicing's tones from the bottom up, spelled from the root, e.g. "A D F C". */
export function spellVoicing(root: string, quality: VoicingQuality, type: VoicingType): string[] {
  return VOICINGS[type].tones.map((t) => Note.pitchClass(Note.transpose(root, TONES[quality][t]![1])));
}
