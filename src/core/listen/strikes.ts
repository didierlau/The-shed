import { decompose, type DecomposeOptions, type NoteDictionary } from './decompose';
import { OnsetDetector, type OnsetOptions } from './onset';
import { newEnergy, spectrumToSemitones, type SemitoneVector } from './semitones';

/** One analysis frame from the microphone. */
export interface MicFrame {
  /** Milliseconds. */
  time: number;
  /** Short-term loudness, 0–1. */
  rms: number;
  /** Long FFT frame in dB, as an AnalyserNode gives. */
  db: Float32Array;
  sampleRate: number;
}

/** A key (or chord) strike, with the sound just before it and once it has settled in. */
export interface Strike {
  time: number;
  before: SemitoneVector;
  after: SemitoneVector;
  /** The settled frame itself, e.g. for measuring pitch. */
  frame: MicFrame;
}

/**
 * Turns a stream of mic frames into strikes. A strike is reported a little after
 * the attack (`settleMs`), once the analysis window is mostly filled with the new
 * sound, so the chord is read at its clearest instead of while it decays.
 */
export class StrikeWatcher {
  private onsets: OnsetDetector;
  private previous: SemitoneVector | null = null;
  private pending: { time: number; before: SemitoneVector } | null = null;
  private quietSince: number | null = null;

  constructor(
    private tuningCents = 0,
    private settleMs = 250,
    onset: OnsetOptions = {},
  ) {
    this.onsets = new OnsetDetector(onset);
  }

  /** Feed a frame. Returns a strike when one has settled, or null. */
  push(frame: MicFrame): Strike | null {
    const vector = spectrumToSemitones(frame.db, frame.sampleRate, this.tuningCents);
    const before = this.previous ?? new Float64Array(vector.length);
    this.previous = vector;

    if (this.onsets.isSilent(frame.rms)) this.quietSince ??= frame.time;
    else this.quietSince = null;

    // A new attack restarts the wait, so fast repeated notes report the latest one.
    if (this.onsets.push(frame.time, frame.rms)) this.pending = { time: frame.time, before };

    if (this.pending && frame.time - this.pending.time >= this.settleMs) {
      const strike = { time: this.pending.time, before: this.pending.before, after: vector, frame };
      this.pending = null;
      return strike;
    }
    return null;
  }

  /** How long it has been silent, in ms (0 while sound is present). */
  silentFor(time: number): number {
    return this.quietSince === null ? 0 : time - this.quietSince;
  }
}

/**
 * Microphone → notes, locked per strike. The notes shown are those struck in the
 * last attack, plus a bass note held over from the previous chord (a left hand
 * holding the root while the right hand changes). They stay until the next
 * strike, or clear after a moment of silence.
 */
export class MicTranscriber {
  private watcher: StrikeWatcher;
  private locked: number[] = [];

  constructor(
    private dict: NoteDictionary,
    tuningCents = 0,
    private clearAfterMs = 600,
    private options: DecomposeOptions = {},
  ) {
    this.watcher = new StrikeWatcher(tuningCents);
  }

  /** Feed a frame. Returns the new notes when they change, otherwise null. */
  push(frame: MicFrame): number[] | null {
    const strike = this.watcher.push(frame);
    if (strike) {
      const struck = decompose(newEnergy(strike.after, strike.before), this.dict, this.options);
      if (struck.length === 0) return null;
      // A held bass must still be clearly sounding, not just the previous chord's bass dying away.
      const everything = decompose(strike.after, this.dict, { ...this.options, relativeThreshold: 0.3 });
      const heldBass = everything[0];
      const notes =
        heldBass !== undefined && heldBass < struck[0]! && this.locked.includes(heldBass) ? [heldBass, ...struck] : struck;
      return this.set(notes);
    }
    if (this.locked.length && this.watcher.silentFor(frame.time) >= this.clearAfterMs) return this.set([]);
    return null;
  }

  private set(notes: number[]): number[] | null {
    if (notes.join() === this.locked.join()) return null;
    this.locked = notes;
    return notes;
  }
}
