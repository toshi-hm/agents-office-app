import { useId, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
import { useAutoFocus } from '../../hooks/useAutoFocus.ts';
import { trapTabFocus } from '../../lib/focus-trap.ts';
import { isSubmitKey } from '../../lib/shortcuts.ts';
import { IconButton } from '../atoms/IconButton.tsx';
import { ModalFooter } from './ModalFooter.tsx';

/** Sheet-style form dialog. Escape is handled by the app so IME composition is respected. */
export function ModalDialog({
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
  useAutoFocus(panel);

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
          trapTabFocus(event, panel.current);
        }}
      >
        <header className="modal__header">
          <h2 id={titleId}>{title}</h2>
          <IconButton aria-label="閉じる" onClick={onClose}>
            <X size={15} aria-hidden="true" />
          </IconButton>
        </header>
        <div className="modal__body">{children}</div>
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        <ModalFooter submitLabel={submitLabel} canSubmit={canSubmit} onClose={onClose} />
      </form>
    </div>
  );
}
