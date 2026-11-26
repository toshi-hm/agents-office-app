import type { ReactNode } from 'react';

/** A captioned form control; the wrapping label names it. */
export function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
