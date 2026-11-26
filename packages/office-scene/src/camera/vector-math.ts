import type { ScenePosition } from '../types.ts';

export type CameraView = Readonly<{
  position: ScenePosition;
  target: ScenePosition;
  distance: number;
}>;

export const dot = (a: ScenePosition, b: ScenePosition) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function positionAtSpherical(
  target: ScenePosition,
  distance: number,
  polar: number,
  azimuth: number,
): ScenePosition {
  const horizontal = distance * Math.sin(polar);
  return [
    target[0] + horizontal * Math.sin(azimuth),
    target[1] + distance * Math.cos(polar),
    target[2] + horizontal * Math.cos(azimuth),
  ];
}

/** Orthonormal camera basis for a camera orbiting at (polar, azimuth). */
export function cameraBasis(polar: number, azimuth: number) {
  const back: ScenePosition = [
    Math.sin(polar) * Math.sin(azimuth),
    Math.cos(polar),
    Math.sin(polar) * Math.cos(azimuth),
  ];
  const right: ScenePosition = [Math.cos(azimuth), 0, -Math.sin(azimuth)];
  const up: ScenePosition = [
    -Math.cos(polar) * Math.sin(azimuth),
    Math.sin(polar),
    -Math.cos(polar) * Math.cos(azimuth),
  ];
  return { back, right, up };
}

/** Moves the camera with its target so the user's chosen angle survives while following. */
export function translateCameraTarget(
  position: ScenePosition,
  previousTarget: ScenePosition,
  nextTarget: ScenePosition,
): ScenePosition {
  return [
    position[0] + nextTarget[0] - previousTarget[0],
    position[1] + nextTarget[1] - previousTarget[1],
    position[2] + nextTarget[2] - previousTarget[2],
  ];
}

/** Frame-rate independent smoothing factor in [0, 1]. */
export function dampingAlpha(delta: number, rate = 6): number {
  if (!Number.isFinite(delta) || delta <= 0) return 0;
  return 1 - Math.exp(-rate * delta);
}

export function lerpPosition(from: ScenePosition, to: ScenePosition, alpha: number): ScenePosition {
  return [
    from[0] + (to[0] - from[0]) * alpha,
    from[1] + (to[1] - from[1]) * alpha,
    from[2] + (to[2] - from[2]) * alpha,
  ];
}

export function isSettled(from: ScenePosition, to: ScenePosition, epsilon = 0.004): boolean {
  return Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) <= epsilon;
}
