import { useEffect, useRef } from 'react';

/** Reports a lost WebGL context so the viewport can fall back to the list. */
export function useContextLoss(canvas: HTMLCanvasElement | null, onLost: () => void): void {
  const lost = useRef(onLost);
  lost.current = onLost;

  useEffect(() => {
    if (!canvas) return;
    const handle = (event: Event) => {
      event.preventDefault();
      lost.current();
    };
    canvas.addEventListener('webglcontextlost', handle);
    return () => canvas.removeEventListener('webglcontextlost', handle);
  }, [canvas]);
}
