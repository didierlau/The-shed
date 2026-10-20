import { nameChord, type ChordGuess } from './chordName';

/** A chord that was held long enough to count, for the history (and later, improv analysis). */
export interface ChordEvent {
  /** Milliseconds, on the same clock as `update`. */
  time: number;
  symbol: string;
  notes: number[];
}

export interface TrackerUpdate {
  /** Live names for what is sounding right now (may flicker while a chord is being played). */
  current: ChordGuess[];
  /** Set when a new chord has settled and differs from the last one. */
  changed: ChordEvent | null;
}

/**
 * Watches the sounding notes over time and reports chord changes once they settle,
 * so rolling a chord or a slightly late finger doesn't log a string of half-chords.
 */
export class ChordTracker {
  private pendingKey = '';
  private pendingSince = 0;
  private pendingNotes: number[] = [];
  private lastSymbol: string | null = null;

  /** @param settleMs how long the same notes must sound before they count as a chord */
  constructor(private settleMs = 80) {}

  update(time: number, notes: number[]): TrackerUpdate {
    const key = notes.join(',');
    if (key !== this.pendingKey) {
      this.pendingKey = key;
      this.pendingSince = time;
      this.pendingNotes = notes;
    }
    const current = nameChord(notes, 8);
    let changed: ChordEvent | null = null;
    const best = current[0];
    if (best && time - this.pendingSince >= this.settleMs && best.symbol !== this.lastSymbol) {
      this.lastSymbol = best.symbol;
      changed = { time: this.pendingSince, symbol: best.symbol, notes: this.pendingNotes };
    }
    return { current, changed };
  }

  reset(): void {
    this.pendingKey = '';
    this.lastSymbol = null;
  }
}
