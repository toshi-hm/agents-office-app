import { useEffect, useRef } from 'react';
import { isTextField, matchShortcut } from '../lib/shortcuts.ts';
import type { ShortcutAction } from '../lib/shortcuts.ts';
import type { TauriBridge, TrayAction } from '../lib/tauri/types.ts';

/** Routes keyboard shortcuts and tray menu items to one command handler. */
export function useShortcuts(
  bridge: TauriBridge,
  onCommand: (command: ShortcutAction | TrayAction) => void,
): void {
  // Listeners are registered once and always call the latest handler.
  const command = useRef(onCommand);
  command.current = onCommand;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const action = matchShortcut(event);
      if (!action) return;
      event.preventDefault();
      // Escape first leaves a text field, so a draft is not lost with the selection.
      const field = event.target;
      if (action === 'escape' && isTextField(field) && !field.closest('[role=dialog]')) {
        field.blur();
        return;
      }
      if (!event.repeat) command.current(action);
    };
    window.addEventListener('keydown', handleKey);
    const stopTray = bridge.onTrayAction((action) => command.current(action));
    return () => {
      window.removeEventListener('keydown', handleKey);
      stopTray();
    };
  }, [bridge]);
}
