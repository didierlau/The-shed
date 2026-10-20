/**
 * Shared types for the core layer.
 *
 * The core layer is pure TypeScript: no DOM, no audio, no storage.
 * Everything here must be deterministic given an Rng, so it can be unit-tested.
 */

/** Random number generator returning a float in [0, 1). Injected so tests are deterministic. */
export type Rng = () => number;

/** One moment in a playback sequence: all `notes` sound together for `beats` beats. */
export interface PlaybackStep {
  /** Scientific pitch notation, e.g. "C4", "F#3". */
  notes: string[];
  beats: number;
  /** Extra notes struck with this step that keep sounding longer, e.g. a drone under a scale. */
  held?: { notes: string[]; beats: number };
}

export interface Choice {
  /** Stable machine value, e.g. "3m". */
  value: string;
  /** Human label, e.g. "Minor 3rd". */
  label: string;
  /** Optional secondary text shown next to the label, e.g. "tritone sub". */
  detail?: string;
}

/** A single question produced by a drill. The UI shows it, the audio layer plays it. */
export interface Question {
  playback: PlaybackStep[];
  /** Instruction shown while waiting for an answer, e.g. "Name the interval you hear." */
  prompt: string;
  choices: Choice[];
  /** The `value` of the correct choice. */
  answer: string;
  /** Short description of what was played, revealed after answering. */
  reveal: string;
  /** Optional sound played right after answering, e.g. a degree resolving to the tonic. */
  resolution?: PlaybackStep[];
}
