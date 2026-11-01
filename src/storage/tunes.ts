import { chartToText, parseTypedChart, type Chart } from '../core/tunes';

/**
 * The user's tunes, remembered on this device. Each chart is kept in the plain
 * typed-changes format (a few hundred characters a tune), so even a whole
 * iReal Pro playlist fits comfortably in local storage.
 */
const KEY = 'the-shed:tunes:v1';

export interface SavedTune {
  id: string;
  title: string;
  composer: string;
  style: string;
  /** The changes, in the typed format. */
  text: string;
  added: number;
}

export function loadTunes(): SavedTune[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((t) => t && typeof t.id === 'string' && typeof t.text === 'string') : [];
  } catch {
    return [];
  }
}

/** False if the device refused to store them (storage full or unavailable). */
function saveAll(tunes: SavedTune[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(tunes));
    return true;
  } catch {
    return false;
  }
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function findTune(id: string): SavedTune | undefined {
  return loadTunes().find((t) => t.id === id);
}

export function tuneChart(t: SavedTune): Chart {
  const { chart } = parseTypedChart(t.text, { title: t.title, composer: t.composer });
  return { ...chart, style: t.style };
}

/**
 * Add imported charts. A tune already saved with the same title and composer is
 * replaced, so importing a playlist again doesn't create duplicates.
 * Returns how many were stored, or null if storage refused.
 */
export function addCharts(charts: Chart[]): { added: number; replaced: number; ids: string[] } | null {
  const tunes = loadTunes();
  let replaced = 0;
  const ids: string[] = [];
  for (const chart of charts) {
    const entry = { title: chart.title, composer: chart.composer, style: chart.style, text: chartToText(chart) };
    const existing = tunes.find((t) => t.title === chart.title && t.composer === chart.composer);
    if (existing) {
      Object.assign(existing, entry);
      replaced++;
      ids.push(existing.id);
    } else {
      const id = newId();
      tunes.push({ id, ...entry, added: Date.now() });
      ids.push(id);
    }
  }
  return saveAll(tunes) ? { added: charts.length - replaced, replaced, ids } : null;
}

/** Save a typed tune (new when `id` is undefined). Returns its id, or null if storage refused. */
export function saveTypedTune(id: string | undefined, fields: { title: string; composer: string; text: string }): string | null {
  const tunes = loadTunes();
  const existing = id ? tunes.find((t) => t.id === id) : undefined;
  if (existing) Object.assign(existing, fields);
  else tunes.push({ id: (id = newId()), style: '', added: Date.now(), ...fields });
  return saveAll(tunes) ? id! : null;
}

export function deleteTune(id: string): void {
  saveAll(loadTunes().filter((t) => t.id !== id));
}
