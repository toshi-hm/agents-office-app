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
  m: 'toggle-mini',
  r: 'refresh',
};

export function matchShortcut(event: KeyLike): ShortcutAction | null {
  // While a Japanese IME is composing, Escape and Enter belong to the input method.
  if (event.isComposing || event.keyCode === 229) return null;
  if (event.key === 'Escape') {
    return event.metaKey || event.ctrlKey || event.altKey ? null : 'escape';
  }
  if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return null;
  return COMMAND_KEYS[event.key.toLowerCase()] ?? null;
}

/** Cmd+Enter submits a multi-line prompt. */
export function isSubmitKey(event: KeyLike): boolean {
  return (
    event.key === 'Enter' && event.metaKey && !event.isComposing && event.keyCode !== 229
  );
}

export function isTextField(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}
