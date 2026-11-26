import type { TextareaHTMLAttributes } from 'react';
import { FieldGroup } from './FieldGroup.tsx';

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'>;

export function TextAreaField({
  label,
  onChange,
  ...textarea
}: TextAreaProps & {
  label: string;
  onChange: (value: string) => void;
  'data-autofocus'?: boolean;
}) {
  return (
    <FieldGroup label={label}>
      <textarea {...textarea} onChange={(event) => onChange(event.currentTarget.value)} />
    </FieldGroup>
  );
}
