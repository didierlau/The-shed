import { accuracy, type StatsTable } from '../core/stats';

/** Totals across several stats tables (e.g. all drills in a section). */
export function totals(tables: (StatsTable | undefined)[]): { asked: number; correct: number } {
  let asked = 0;
  let correct = 0;
  for (const table of tables) {
    for (const s of Object.values(table ?? {})) {
      asked += s.asked;
      correct += s.correct;
    }
  }
  return { asked, correct };
}

/** "72% of 40", or "Not started". */
export function summary(tables: (StatsTable | undefined)[]): string {
  const t = totals(tables);
  const acc = accuracy(t);
  return acc === null ? 'Not started' : `${Math.round(acc * 100)}% of ${t.asked}`;
}
