import type { InputHTMLAttributes } from 'react';
import { FieldGroup } from './FieldGroup.tsx';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'>;

export function TextField({
  label,
  onChange,
  ...input
}: InputProps & { label: string; onChange: (value: string) => void; 'data-autofocus'?: boolean }) {
  return (
    <FieldGroup label={label}>
      <input
        type="text"
        {...input}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </FieldGroup>
  );
}
