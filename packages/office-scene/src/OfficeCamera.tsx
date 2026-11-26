import { useCallback, useLayoutEffect, useRef } from 'react';
import type { ComponentRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CAMERA_AZIMUTH_MAX,
  CAMERA_AZIMUTH_MIN,
  CAMERA_MIN_DISTANCE,
  CAMERA_POLAR_MAX,
  CAMERA_POLAR_MIN,
  dampingAlpha,
  getFocusTarget,
  getFocusView,
  getMaxDistance,
  getOverviewView,
  isSettled,
  lerpPosition,
  translateCameraTarget,
} from './camera-math.ts';
import type { OfficeLayout, ScenePosition } from './types.ts';

export type CameraMode = 'overview' | 'follow' | 'manual';

export type OfficeCameraProps = Readonly<{
  layout: OfficeLayout;
  mode: CameraMode;
  /** Where the followed character is heading; required for `follow`. */
  focusPoint: ScenePosition | null;
  /** Bump to re-apply the current mode (re-focus the same agent, reset the overview). */
  sequence: number;
  compact: boolean;
  reducedMotion: boolean;
  onManual: () => void;
}>;

type ControlsRef = ComponentRef<typeof OrbitControls>;
type Goal = { position: ScenePosition; target: ScenePosition };

/** Owns camera movement separately from the scene so snapshot updates never reset a manual view. */
export function OfficeCamera({
  layout,
  mode,
  focusPoint,
  sequence,
  compact,
  reducedMotion,
  onManual,
}: OfficeCameraProps) {
  const controls = useRef<ControlsRef>(null);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const aspect = size.width / Math.max(1, size.height);
  const goal = useRef<Goal | null>(null);
  const applied = useRef<{ mode: CameraMode; sequence: number; focus: ScenePosition | null } | null>(
    null,
  );
  const dragStart = useRef<ScenePosition | null>(null);

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
    [camera, invalidate],
  );

  const focusKey = focusPoint?.join(',') ?? '';

  useLayoutEffect(() => {
    const previous = applied.current;
    applied.current = { mode, sequence, focus: focusPoint };
    if (mode === 'manual') {
      goal.current = null;
      return;
    }
    let next: Goal;
    if (mode === 'follow' && focusPoint) {
      const sameRequest = previous?.mode === 'follow' && previous.sequence === sequence;
      if (sameRequest && previous.focus) {
        // The followed agent moved: keep the user's current angle and distance.
        const control = controls.current;
        const target = (control?.target.toArray() ?? [0, 0, 0]) as ScenePosition;
        const nextTarget = getFocusTarget(focusPoint);
        next = {
          target: nextTarget,
          position: translateCameraTarget(
            camera.position.toArray() as ScenePosition,
            target,
            nextTarget,
          ),
        };
      } else {
        next = getFocusView(focusPoint, aspect, compact);
      }
    } else {
      next = getOverviewView(layout, aspect, compact);
    }
    // The first frame and reduced motion jump; everything else glides.
    if (!previous || reducedMotion) {
      goal.current = null;
      snap(next);
    } else {
      goal.current = next;
      invalidate();
    }
    // `focusKey` stands in for the focusPoint tuple, whose identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sequence, focusKey, layout, compact, aspect, reducedMotion, snap]);

  // A resize should reframe immediately rather than glide from a stale framing.
  useLayoutEffect(() => {
    if (applied.current?.mode !== 'overview') return;
    goal.current = null;
    snap(getOverviewView(layout, aspect, compact));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

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

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping={!reducedMotion}
      minDistance={CAMERA_MIN_DISTANCE}
      maxDistance={getMaxDistance(layout, aspect)}
      minPolarAngle={CAMERA_POLAR_MIN}
      maxPolarAngle={CAMERA_POLAR_MAX}
      minAzimuthAngle={CAMERA_AZIMUTH_MIN}
      maxAzimuthAngle={CAMERA_AZIMUTH_MAX}
      onStart={() => {
        // Touching the camera stops any glide; a real movement then switches to manual.
        goal.current = null;
        dragStart.current = camera.position.toArray() as ScenePosition;
      }}
      onChange={() => {
        // A plain click also fires `start`; only an actual movement takes over the camera.
        const start = dragStart.current;
        if (start && !isSettled(start, camera.position.toArray() as ScenePosition, 0.06)) {
          dragStart.current = null;
          onManual();
        }
        invalidate();
      }}
      onEnd={() => {
        // Wheel zoom reports its change synchronously, so `start` is cleared by then.
        dragStart.current = null;
      }}
    />
  );
}
