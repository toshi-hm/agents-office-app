import { Pin, PinOff } from 'lucide-react';
import { IconButton } from './IconButton.tsx';

/** Always-on-top toggle shared by the title bar and the mini office. */
export function PinButton({
  pinned,
  iconSize,
  onToggle,
}: {
  pinned: boolean;
  iconSize: number;
  onToggle: () => void;
}) {
  const PinIcon = pinned ? Pin : PinOff;
  return (
    <IconButton
      aria-pressed={pinned}
      aria-label="常に手前に表示"
      title={pinned ? '常に手前に表示: オン' : '常に手前に表示: オフ'}
      onClick={onToggle}
    >
      <PinIcon size={iconSize} aria-hidden="true" />
    </IconButton>
  );
}
