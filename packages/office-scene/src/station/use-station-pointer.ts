import { useEffect } from 'react';
import type { ThreeEvent } from '@react-three/fiber';

/** Click selects the member; hovering shows a pointer cursor. */
export function useStationPointer(memberId: string, onSelect: (id: string) => void) {
  useEffect(
    () => () => {
      document.body.style.cursor = '';
    },
    [],
  );
  const hover = (active: boolean) => () => {
    document.body.style.cursor = active ? 'pointer' : '';
  };
  return {
    onClick: (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      // Ignore the click that ends an orbit drag.
      if (event.delta <= 4) onSelect(memberId);
    },
    onPointerOver: hover(true),
    onPointerOut: hover(false),
  };
}
