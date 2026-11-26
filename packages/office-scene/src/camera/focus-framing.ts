import type { ScenePosition } from '../types.ts';
import {
  CAMERA_AZIMUTH,
  CAMERA_POLAR,
  COMPACT_FOCUS_DISTANCE,
  FOCUS_DISTANCE,
} from './constants.ts';
import { positionAtSpherical } from './vector-math.ts';
import type { CameraView } from './vector-math.ts';

export function getFocusTarget(position: ScenePosition): ScenePosition {
  return [position[0], position[1] + 0.85, position[2]];
}

export function getFocusView(position: ScenePosition, aspect: number, compact = false): CameraView {
  const target = getFocusTarget(position);
  const base = compact ? COMPACT_FOCUS_DISTANCE : FOCUS_DISTANCE;
  // Portrait viewports need to back off so the desk beside the character stays in view.
  const distance = base / Math.min(1, Math.max(0.55, Number.isFinite(aspect) ? aspect : 1));
  return {
    target,
    distance,
    position: positionAtSpherical(target, distance, CAMERA_POLAR, CAMERA_AZIMUTH),
  };
}
