import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/** Two-step button instead of a blocking browser dialog. */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  disabled = false,
  className = 'button button--danger-quiet',
}: {
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 3500);
    return () => window.clearTimeout(timer);
  }, [armed]);
  return (
    <button
      type="button"
      className={armed ? 'button button--danger' : className}
      disabled={disabled}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (armed) onConfirm();
        setArmed(!armed);
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
