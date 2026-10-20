/**
 * Per-item practice statistics (e.g. per interval), used for progress display
 * and for adaptive practice: items you miss more often come up more often.
 */
export interface ItemStats {
  asked: number;
  correct: number;
}

export type StatsTable = Record<string, ItemStats>;

export function recordAnswer(table: StatsTable, item: string, wasCorrect: boolean): StatsTable {
  const prev = table[item] ?? { asked: 0, correct: 0 };
  return {
    ...table,
    [item]: { asked: prev.asked + 1, correct: prev.correct + (wasCorrect ? 1 : 0) },
  };
}

/** Accuracy in [0, 1], or null if never asked. */
export function accuracy(stats: ItemStats | undefined): number | null {
  if (!stats || stats.asked === 0) return null;
  return stats.correct / stats.asked;
}

/**
 * Weight for adaptive selection. Unseen items get a boost so they get introduced;
 * items with low accuracy come up more often, but nothing ever drops to zero.
 */
export function practiceWeight(stats: ItemStats | undefined): number {
  const acc = accuracy(stats);
  if (acc === null) return 2;
  return 0.5 + 2 * (1 - acc);
}
