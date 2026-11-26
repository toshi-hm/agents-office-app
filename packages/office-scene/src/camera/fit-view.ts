import type { ScenePosition } from '../types.ts';
import {
  CAMERA_AZIMUTH,
  CAMERA_FOV,
  CAMERA_MIN_DISTANCE,
  CAMERA_POLAR,
  FULL_PADDING,
} from './constants.ts';
import { centreOutline, getBoundsCentre } from './outline.ts';
import { cameraBasis, dot, positionAtSpherical } from './vector-math.ts';
import type { CameraView } from './vector-math.ts';

/**
 * Closest camera distance (and re-centred target) at which every point is inside the frustum.
 * `padding` > 1 leaves a margin around the diorama.
 */
export function fitView(
  points: readonly ScenePosition[],
  aspect: number,
  padding = FULL_PADDING,
  polar = CAMERA_POLAR,
  azimuth = CAMERA_AZIMUTH,
  fovDegrees = CAMERA_FOV,
): CameraView {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const tanVertical = Math.tan((fovDegrees * Math.PI) / 360);
  const tanHorizontal = tanVertical * safeAspect;
  const basis = cameraBasis(polar, azimuth);
  const { back, right, up } = basis;

  const required = (from: ScenePosition) =>
    points.reduce((distance, p) => {
      const relative: ScenePosition = [p[0] - from[0], p[1] - from[1], p[2] - from[2]];
      const towardsCamera = dot(relative, back);
      return Math.max(
        distance,
        (Math.abs(dot(relative, right)) * padding) / tanHorizontal + towardsCamera,
        (Math.abs(dot(relative, up)) * padding) / tanVertical + towardsCamera,
      );
    }, CAMERA_MIN_DISTANCE);

  let target = getBoundsCentre(points);
  // Nudge the target until the projected outline is centred, then re-measure the distance.
  for (let iteration = 0; iteration < 4 && points.length > 0; iteration += 1) {
    const projection = { basis, tanHorizontal, tanVertical };
    target = centreOutline(points, target, required(target), projection);
  }

  const distance = required(target);
  return { target, distance, position: positionAtSpherical(target, distance, polar, azimuth) };
}
