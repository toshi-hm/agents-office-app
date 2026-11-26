import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_LABELS, nextTheme } from '../../lib/theme.ts';
import type { ThemePreference } from '../../lib/theme.ts';
import { IconButton } from '../atoms/IconButton.tsx';

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

/** Cycles light → dark → system. */
export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: ThemePreference;
  onChange: (theme: ThemePreference) => void;
}) {
  const ThemeIcon = THEME_ICONS[theme];
  return (
    <IconButton
      aria-label={`テーマ: ${THEME_LABELS[theme]}。クリックで切り替え`}
      title={`テーマ: ${THEME_LABELS[theme]}`}
      onClick={() => onChange(nextTheme(theme))}
    >
      <ThemeIcon size={15} aria-hidden="true" />
    </IconButton>
  );
}
