import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ScenePosition } from '../types.ts';
import type { CameraMotion, ControlsRef } from './use-camera-motion.ts';
import { dampingAlpha, isSettled, lerpPosition } from './vector-math.ts';

/** Eases the camera towards the pending goal, one frame at a time. */
export function useCameraGlide(
  { camera, goal, snap, invalidate }: CameraMotion,
  controls: RefObject<ControlsRef | null>,
): void {
  useFrame((_, delta) => {
    const next = goal.current;
    const control = controls.current;
    if (!next || !control) return;
    const alpha = dampingAlpha(Math.min(delta, 0.05), 6.5);
    const position = lerpPosition(camera.position.toArray() as ScenePosition, next.position, alpha);
    const target = lerpPosition(control.target.toArray() as ScenePosition, next.target, alpha);
    if (isSettled(position, next.position) && isSettled(target, next.target)) {
      goal.current = null;
      snap(next);
      return;
    }
    camera.position.set(...position);
    control.target.set(...target);
    control.update();
    invalidate();
  });
}
