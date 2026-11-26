import { useEffect, useState } from 'react';
import { loadThemePreference, resolveTheme, saveThemePreference } from '../lib/theme.ts';
import type { ThemePreference } from '../lib/theme.ts';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(loadThemePreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(query.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const theme = resolveTheme(preference, systemDark);
  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
  }, [theme]);
  useEffect(() => saveThemePreference(preference), [preference]);

  return { preference, setPreference, theme };
}
