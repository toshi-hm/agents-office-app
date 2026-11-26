import { useEffect, useId, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
import { isSubmitKey } from '../lib/shortcuts.ts';

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select, textarea, [tabindex="0"]';

/** Sheet-style form dialog. Escape is handled by the app so IME composition is respected. */
export function Modal({
  title,
  submitLabel,
  canSubmit,
  error,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  submitLabel: string;
  canSubmit: boolean;
  error: string | null;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (canSubmit) onSubmit();
  };

  return (
    <div className="modal">
      <form
        ref={panel}
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
        onKeyDown={(event) => {
          if (isSubmitKey(event.nativeEvent)) {
            event.preventDefault();
            submit();
            return;
          }
          if (event.key !== 'Tab') return;
          const items = [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
          const first = items[0];
          const last = items.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <header className="modal__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" aria-label="閉じる" onClick={onClose}>
            <X size={15} aria-hidden="true" />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        <footer className="modal__footer">
          <button type="button" className="button" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="button button--primary" disabled={!canSubmit}>
            {submitLabel}
            <kbd>⌘↵</kbd>
          </button>
        </footer>
      </form>
    </div>
  );
}
