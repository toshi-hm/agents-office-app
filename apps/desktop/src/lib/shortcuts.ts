export type ShortcutAction = 'new-task' | 'toggle-mini' | 'refresh' | 'escape';

export type KeyLike = Readonly<{
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing?: boolean | undefined;
  keyCode?: number | undefined;
}>;

const COMMAND_KEYS: Readonly<Record<string, ShortcutAction>> = {
  n: 'new-task',
  r: 'refresh',
};

export const matchShortcut = (event: KeyLike): ShortcutAction | null => {
  // While a Japanese IME is composing, Escape and Enter belong to the input method.
  if (event.isComposing || event.keyCode === 229) return null;
  if (event.key === 'Escape') {
    return event.metaKey || event.ctrlKey || event.altKey ? null : 'escape';
  }
  if (!event.metaKey || event.ctrlKey || event.altKey) return null;
  const lower = event.key.toLowerCase();
  // Use Cmd+Shift+M so macOS native Cmd+M (Minimize Window) is never shadowed.
  if (event.shiftKey) return lower === 'm' ? 'toggle-mini' : null;
  return COMMAND_KEYS[lower] ?? null;
};

/** Cmd+Enter submits a multi-line prompt. */
export const isSubmitKey = (event: KeyLike): boolean =>
  event.key === 'Enter' && event.metaKey && !event.isComposing && event.keyCode !== 229;

export const isTextField = (target: EventTarget | null): target is HTMLElement =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
