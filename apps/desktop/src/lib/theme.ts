export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'agents-office:theme';

export const THEME_ORDER: readonly ThemePreference[] = ['light', 'dark', 'system'];
export const THEME_LABELS: Readonly<Record<ThemePreference, string>> = {
  light: 'ライト',
  dark: 'ダーク',
  system: 'システム',
};

/** The warm light theme is the default (D-018). */
export function parseThemePreference(value: unknown): ThemePreference {
  return value === 'dark' || value === 'system' ? value : 'light';
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}

export function nextTheme(preference: ThemePreference): ThemePreference {
  return THEME_ORDER[(THEME_ORDER.indexOf(preference) + 1) % THEME_ORDER.length]!;
}

export function loadThemePreference(): ThemePreference {
  try {
    return parseThemePreference(globalThis.localStorage?.getItem(STORAGE_KEY));
  } catch {
    return 'light';
  }
}

export function saveThemePreference(preference: ThemePreference): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage is a convenience only.
  }
}
