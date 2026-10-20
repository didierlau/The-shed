import { normaliseSelection, type CustomSelection, type DrillKind } from '../core/drills';

/** Remembers each section's "Build your own" selection between visits. */
const KEY = 'the-shed:custom:v1';

function readAll(): Record<string, Partial<CustomSelection>> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function loadCustomSelection(kind: DrillKind): CustomSelection {
  return normaliseSelection(kind, readAll()[kind]);
}

export function saveCustomSelection(kind: DrillKind, selection: CustomSelection): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [kind]: selection }));
  } catch {
    /* storage unavailable: the selection just isn't remembered */
  }
}
