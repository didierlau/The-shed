import { normaliseSettings, type Settings } from '../core/settings';

/** App-wide settings, remembered on this device. */
const KEY = 'the-shed:settings:v1';

export function loadSettings(): Settings {
  try {
    return normaliseSettings(JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? undefined);
  } catch {
    return normaliseSettings(undefined);
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(normaliseSettings(settings)));
  } catch {
    /* storage unavailable: the setting lasts until the app is closed */
  }
}
