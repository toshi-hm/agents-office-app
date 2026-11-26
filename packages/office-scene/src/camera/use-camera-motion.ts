import { useCallback, useRef } from 'react';
import type { ComponentRef, RefObject } from 'react';
import type { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { ScenePosition } from '../types.ts';
import type { Goal } from './plan-goal.ts';

export type ControlsRef = ComponentRef<typeof OrbitControls>;

/** The camera, its pending glide target and an immediate jump to a goal. */
export function useCameraMotion(controls: RefObject<ControlsRef | null>) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const goal = useRef<Goal | null>(null);

  const snap = useCallback(
    (next: Goal) => {
      const control = controls.current;
      camera.position.set(...next.position);
      if (control) {
        control.target.set(...next.target);
        control.update();
      } else {
        camera.lookAt(...next.target);
      }
      invalidate();
    },
    [camera, controls, invalidate],
  );

  const current = (): Goal => ({
    target: (controls.current?.target.toArray() ?? [0, 0, 0]) as ScenePosition,
    position: camera.position.toArray() as ScenePosition,
  });

  return { camera, invalidate, goal, snap, current };
}

export type CameraMotion = ReturnType<typeof useCameraMotion>;
