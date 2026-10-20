import type { StatsTable } from '../core/stats';

/**
 * Progress storage. Everything that persists goes through this module,
 * so moving to IndexedDB or adding cloud sync later only touches this file.
 */
const KEY = 'the-shed:progress:v1';

export interface Progress {
  /** Stats per drill id, then per item (e.g. interval). */
  drills: Record<string, StatsTable>;
}

const EMPTY: Progress = { drills: {} };

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw) as Progress;
    return parsed && typeof parsed.drills === 'object' ? parsed : structuredClone(EMPTY);
  } catch {
    return structuredClone(EMPTY);
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* storage full or disabled: practice still works, just isn't remembered */
  }
}

export function resetDrill(progress: Progress, drillId: string): Progress {
  const drills = { ...progress.drills };
  delete drills[drillId];
  return { ...progress, drills };
}
