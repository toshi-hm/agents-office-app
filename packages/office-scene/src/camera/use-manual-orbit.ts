import { useRef } from 'react';
import type { ScenePosition } from '../types.ts';
import type { CameraMotion } from './use-camera-motion.ts';
import { isSettled } from './vector-math.ts';

/** Orbit control handlers that detect when the user takes over the camera. */
export function useManualOrbit(
  { camera, goal, invalidate }: CameraMotion,
  onManual: () => void,
) {
  const dragStart = useRef<ScenePosition | null>(null);
  const position = () => camera.position.toArray() as ScenePosition;
  return {
    onStart: () => {
      // Touching the camera stops any glide; a real movement then switches to manual.
      goal.current = null;
      dragStart.current = position();
    },
    onChange: () => {
      // A plain click also fires `start`; only an actual movement takes over the camera.
      const start = dragStart.current;
      if (start && !isSettled(start, position(), 0.06)) {
        dragStart.current = null;
        onManual();
      }
      invalidate();
    },
    onEnd: () => {
      // Wheel zoom reports its change synchronously, so `start` is cleared by then.
      dragStart.current = null;
    },
  };
}
