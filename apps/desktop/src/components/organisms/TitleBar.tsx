import { Minimize2, ShieldAlert } from 'lucide-react';
import type { OfficeHealth } from '@agents-office-app/domain';
import type { ThemePreference } from '../../lib/theme.ts';
import { PinButton } from '../atoms/PinButton.tsx';
import { OfficeCommandButtons } from '../molecules/OfficeCommandButtons.tsx';
import { SlotMeter } from '../molecules/SlotMeter.tsx';
import { ThemeToggle } from '../molecules/ThemeToggle.tsx';

export type TitleBarProps = {
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
};

export function TitleBar(props: TitleBarProps) {
  const { health, pendingApprovals, pinned, theme } = props;
  // Tauri drags only from the element carrying the attribute, so passive children repeat it.
  return (
    <header className="titlebar" data-tauri-drag-region>
      <h1 className="titlebar__title" data-tauri-drag-region>
        Agents Office
      </h1>
      <SlotMeter health={health} />
      {pendingApprovals > 0 && (
        <button type="button" className="approval-badge" onClick={props.onShowApprovals}>
          <ShieldAlert size={14} aria-hidden="true" />
          承認待ち {pendingApprovals}
        </button>
      )}
      <div className="titlebar__spacer" data-tauri-drag-region />
      <OfficeCommandButtons
        ready={props.ready}
        demoBusy={props.demoBusy}
        onDemo={props.onDemo}
        onNewTask={props.onNewTask}
        onNewAgent={props.onNewAgent}
      />
      <PinButton pinned={pinned} iconSize={15} onToggle={props.onTogglePin} />
      <button
        type="button"
        className="button button--quiet"
        onClick={props.onMini}
        title="小さなオフィス (⌘M)"
      >
        <Minimize2 size={14} aria-hidden="true" />
        <span className="titlebar__label">小さなオフィス</span>
      </button>
      <ThemeToggle theme={theme} onChange={props.onThemeChange} />
    </header>
  );
}
