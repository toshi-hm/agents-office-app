import {
  Minimize2,
  Monitor,
  Moon,
  Pin,
  PinOff,
  Play,
  Plus,
  ShieldAlert,
  Sun,
  UserPlus,
} from 'lucide-react';
import type { OfficeHealth } from '@agents-office-app/domain';
import { THEME_LABELS, nextTheme } from '../lib/theme.ts';
import type { ThemePreference } from '../lib/theme.ts';
import { formatSlotMeter } from '../lib/view-helpers.ts';

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

export function TitleBar({
  health,
  pendingApprovals,
  ready,
  demoBusy,
  pinned,
  theme,
  onShowApprovals,
  onDemo,
  onNewTask,
  onNewAgent,
  onTogglePin,
  onMini,
  onThemeChange,
}: {
  health: OfficeHealth | null;
  pendingApprovals: number;
  ready: boolean;
  demoBusy: boolean;
  pinned: boolean;
  theme: ThemePreference;
  onShowApprovals: () => void;
  onDemo: () => void;
  onNewTask: () => void;
  onNewAgent: () => void;
  onTogglePin: () => void;
  onMini: () => void;
  onThemeChange: (theme: ThemePreference) => void;
}) {
  const ThemeIcon = THEME_ICONS[theme];
  const PinIcon = pinned ? Pin : PinOff;
  // Tauri drags only from the element carrying the attribute, so passive children repeat it.
  return (
    <header className="titlebar" data-tauri-drag-region>
      <h1 className="titlebar__title" data-tauri-drag-region>
        Agents Office
      </h1>
      <div
        className="slot-meter"
        data-tauri-drag-region
        title="同時に実行できる仕事は4件までです"
        aria-label={`実行枠 ${formatSlotMeter(health)}`}
      >
        <span className="slot-meter__dots" data-tauri-drag-region aria-hidden="true">
          {[0, 1, 2, 3].map((slot) => (
            <i
              key={slot}
              data-tauri-drag-region
              data-used={slot < (health?.slotsUsed ?? 0)}
            />
          ))}
        </span>
        <span data-tauri-drag-region>{formatSlotMeter(health)}</span>
      </div>
      {pendingApprovals > 0 && (
        <button type="button" className="approval-badge" onClick={onShowApprovals}>
          <ShieldAlert size={14} aria-hidden="true" />
          承認待ち {pendingApprovals}
        </button>
      )}
      <div className="titlebar__spacer" data-tauri-drag-region />
      <button
        type="button"
        className="button button--quiet"
        disabled={!ready || demoBusy}
        onClick={onDemo}
        title="デモ社員に仕事を割り当てて、オフィスの動きを確認します"
      >
        <Play size={14} aria-hidden="true" />
        <span className="titlebar__label">デモ実行</span>
      </button>
      <button
        type="button"
        className="button button--primary"
        disabled={!ready}
        onClick={onNewTask}
        title="仕事を依頼 (⌘N)"
      >
        <Plus size={15} aria-hidden="true" />
        <span>仕事を依頼</span>
        <kbd className="titlebar__label">⌘N</kbd>
      </button>
      <button
        type="button"
        className="button button--quiet"
        disabled={!ready}
        onClick={onNewAgent}
        title="社員を追加"
      >
        <UserPlus size={14} aria-hidden="true" />
        <span className="titlebar__label">社員追加</span>
      </button>
      <button
        type="button"
        className="icon-button"
        aria-pressed={pinned}
        aria-label="常に手前に表示"
        title={pinned ? '常に手前に表示: オン' : '常に手前に表示: オフ'}
        onClick={onTogglePin}
      >
        <PinIcon size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="button button--quiet"
        onClick={onMini}
        title="小さなオフィス (⌘M)"
      >
        <Minimize2 size={14} aria-hidden="true" />
        <span className="titlebar__label">小さなオフィス</span>
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={`テーマ: ${THEME_LABELS[theme]}。クリックで切り替え`}
        title={`テーマ: ${THEME_LABELS[theme]}`}
        onClick={() => onThemeChange(nextTheme(theme))}
      >
        <ThemeIcon size={15} aria-hidden="true" />
      </button>
    </header>
  );
}
