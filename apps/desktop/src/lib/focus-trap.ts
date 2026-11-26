const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select, textarea, [tabindex="0"]';

type TabEvent = Readonly<{ key: string; shiftKey: boolean; preventDefault: () => void }>;

/** Wraps Tab and Shift+Tab around the focusable controls inside `container`. */
export function trapTabFocus(event: TabEvent, container: HTMLElement | null): void {
  if (event.key !== 'Tab') return;
  const items = [...(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
  const first = items[0];
  const last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
