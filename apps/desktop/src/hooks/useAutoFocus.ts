import { useEffect } from 'react';
import type { RefObject } from 'react';

/** Focuses the `data-autofocus` control on mount and restores the previous focus on unmount. */
export function useAutoFocus(container: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const previous = document.activeElement;
    container.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [container]);
}
