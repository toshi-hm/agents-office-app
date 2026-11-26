import type { WindowMode } from '@agents-office-app/domain';
import type { ShortcutAction } from './shortcuts.ts';
import type { TrayAction } from './tauri/types.ts';

export type CommandContext = Readonly<{
  mode: WindowMode;
  modalOpen: boolean;
  ready: boolean;
  closeModal: () => void;
  clearSelection: () => void;
  refresh: () => void;
  changeMode: (next: WindowMode, after: () => void) => void;
  openTaskModal: () => void;
}>;

/** What a keyboard shortcut or tray menu item does in the current screen. */
export function runCommand(command: ShortcutAction | TrayAction, context: CommandContext): void {
  const { mode, modalOpen, closeModal } = context;
  if (command === 'escape') {
    if (modalOpen) closeModal();
    else context.clearSelection();
    return;
  }
  if (command === 'refresh') {
    context.refresh();
    return;
  }
  // An open dialog holds typed text; only Escape or its own buttons may discard it.
  if (command === 'toggle-mini') {
    if (!modalOpen) context.changeMode(mode === 'full' ? 'mini' : 'full', closeModal);
    return;
  }
  if (modalOpen || !context.ready) return;
  if (mode === 'mini') context.changeMode('full', context.openTaskModal);
  else context.openTaskModal();
}
