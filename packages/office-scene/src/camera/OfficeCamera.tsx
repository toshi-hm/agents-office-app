import { useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { OfficeLayout, ScenePosition } from '../types.ts';
import {
  CAMERA_AZIMUTH_MAX,
  CAMERA_AZIMUTH_MIN,
  CAMERA_MIN_DISTANCE,
  CAMERA_POLAR_MAX,
  CAMERA_POLAR_MIN,
} from './constants.ts';
import { getMaxDistance } from './overview-framing.ts';
import type { CameraMode } from './plan-goal.ts';
import { useCameraGlide } from './use-camera-glide.ts';
import { useCameraMotion } from './use-camera-motion.ts';
import type { ControlsRef } from './use-camera-motion.ts';
import { useCameraRequests } from './use-camera-requests.ts';
import { useManualOrbit } from './use-manual-orbit.ts';

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

/** Owns camera movement separately from the scene so snapshot updates never reset a manual view. */
export function OfficeCamera({ onManual, ...view }: OfficeCameraProps) {
  const controls = useRef<ControlsRef>(null);
  const size = useThree((state) => state.size);
  const aspect = size.width / Math.max(1, size.height);
  const motion = useCameraMotion(controls);
  useCameraRequests(motion, { ...view, aspect });
  useCameraGlide(motion, controls);
  const orbit = useManualOrbit(motion, onManual);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping={!view.reducedMotion}
      minDistance={CAMERA_MIN_DISTANCE}
      maxDistance={getMaxDistance(view.layout, aspect)}
      minPolarAngle={CAMERA_POLAR_MIN}
      maxPolarAngle={CAMERA_POLAR_MAX}
      minAzimuthAngle={CAMERA_AZIMUTH_MIN}
      maxAzimuthAngle={CAMERA_AZIMUTH_MAX}
      {...orbit}
    />
  );
}
