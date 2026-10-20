import type { Calibration } from '../core/listen/calibration';

/** The piano calibration, remembered on this device. */
const KEY = 'the-shed:calibration:v1';

export function loadCalibration(): Calibration | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (parsed?.version === 1 && Array.isArray(parsed.keys) && parsed.keys.length > 0) return parsed as Calibration;
  } catch {
    /* unreadable: treat as not calibrated */
  }
  return null;
}

export function saveCalibration(calibration: Calibration): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(calibration));
    return true;
  } catch {
    return false;
  }
}

export function clearCalibration(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
