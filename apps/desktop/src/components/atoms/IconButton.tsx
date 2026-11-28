import type { ButtonHTMLAttributes } from 'react';

/** Square, icon-only button. Pass `aria-label` so it has an accessible name. */
export function IconButton({
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>) {
  return (
    <button
      type="button"
      className={className ? `icon-button ${className}` : 'icon-button'}
      {...props}
    />
  );
}
