import type { ReactNode } from 'react';
import { FieldGroup } from './FieldGroup.tsx';

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** `<option>` or `<optgroup>` elements. */
  children: ReactNode;
}) {
  return (
    <FieldGroup label={label}>
      <select value={value} onChange={(event) => onChange(event.currentTarget.value)}>
        {children}
      </select>
    </FieldGroup>
  );
}
