import { useCallback, useEffect, useState } from 'react';

export type MotionPreference = 'system' | 'reduce' | 'normal';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const STORAGE_KEY = 'agents-office:motion';

export function resolveReducedMotion(
  preference: MotionPreference,
  systemReducedMotion: boolean,
): boolean {
  return preference === 'system' ? systemReducedMotion : preference === 'reduce';
}

function readStoredPreference(): MotionPreference {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY);
    return value === 'reduce' || value === 'normal' ? value : 'system';
  } catch {
    return 'system';
  }
}

function readSystemPreference(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function useMotionPreference() {
  const [preference, setPreferenceState] = useState<MotionPreference>(readStoredPreference);
  const [systemReducedMotion, setSystemReducedMotion] = useState(readSystemPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    setSystemReducedMotion(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setSystemReducedMotion(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const setPreference = useCallback((value: MotionPreference) => {
    setPreferenceState(value);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, value);
    } catch {
      // Storage is a convenience only; private windows may refuse it.
    }
  }, []);

  return {
    preference,
    setPreference,
    reducedMotion: resolveReducedMotion(preference, systemReducedMotion),
  };
}
