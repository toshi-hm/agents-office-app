import type { OfficeLayout, ScenePosition } from './types.ts';

/** A narrow lens gives the miniature, near-isometric look. */
export const CAMERA_FOV = 30;
export const CAMERA_MIN_DISTANCE = 4;
export const CAMERA_AZIMUTH = Math.PI / 6;
export const CAMERA_POLAR = Math.PI / 3.5;
/** Orbit limits keep the camera in front of the two decorative walls. */
export const CAMERA_AZIMUTH_MIN = -0.12;
export const CAMERA_AZIMUTH_MAX = Math.PI / 2 + 0.12;
export const CAMERA_POLAR_MIN = 0.32;
export const CAMERA_POLAR_MAX = 1.32;

const FULL_PADDING = 1.07;
const COMPACT_PADDING = 1.01;
const LABEL_HEIGHT = 2.25;
const FOCUS_DISTANCE = 8.2;
const COMPACT_FOCUS_DISTANCE = 7.2;

export type CameraView = Readonly<{
  position: ScenePosition;
  target: ScenePosition;
  distance: number;
}>;

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

const dot = (a: ScenePosition, b: ScenePosition) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** The outline that must stay visible: floor slab, wall tops and every nameplate anchor. */
export function getFramingPoints(layout: OfficeLayout): readonly ScenePosition[] {
  const halfWidth = layout.floor.width / 2;
  const halfDepth = layout.floor.depth / 2;
  const [cx, cy, cz] = layout.floor.center;
  const corners: ScenePosition[] = [];
  for (const x of [-halfWidth, halfWidth]) {
    for (const z of [-halfDepth, halfDepth]) corners.push([cx + x, cy - 0.28, cz + z]);
  }
  corners.push(
    [cx - halfWidth, layout.wallHeight, cz - halfDepth],
    [cx + halfWidth, layout.wallHeight, cz - halfDepth],
    [cx - halfWidth, layout.wallHeight, cz + halfDepth],
  );
  for (const { position, chairPosition, labelLift } of layout.members) {
    corners.push(
      [position[0], LABEL_HEIGHT + labelLift, position[2]],
      [chairPosition[0], LABEL_HEIGHT + labelLift, chairPosition[2]],
    );
  }
  return corners;
}

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
  const { back, right, up } = cameraBasis(polar, azimuth);

  let target: ScenePosition = [0, 0, 0];
  if (points.length > 0) {
    const mean = (axis: 0 | 1 | 2) => {
      const values = points.map((p) => p[axis]);
      return (Math.min(...values) + Math.max(...values)) / 2;
    };
    target = [mean(0), mean(1), mean(2)];
  }

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

  // Nudge the target until the projected outline is centred, then re-measure the distance.
  for (let iteration = 0; iteration < 4 && points.length > 0; iteration += 1) {
    const distance = required(target);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      const relative: ScenePosition = [p[0] - target[0], p[1] - target[1], p[2] - target[2]];
      const depth = Math.max(0.1, distance - dot(relative, back));
      const x = dot(relative, right) / (depth * tanHorizontal);
      const y = dot(relative, up) / (depth * tanVertical);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const shiftX = ((minX + maxX) / 2) * distance * tanHorizontal;
    const shiftY = ((minY + maxY) / 2) * distance * tanVertical;
    target = [
      target[0] + right[0] * shiftX + up[0] * shiftY,
      target[1] + right[1] * shiftX + up[1] * shiftY,
      target[2] + right[2] * shiftX + up[2] * shiftY,
    ];
  }

  const distance = required(target);
  return { target, distance, position: positionAtSpherical(target, distance, polar, azimuth) };
}

export function getOverviewView(layout: OfficeLayout, aspect: number, compact = false): CameraView {
  return fitView(getFramingPoints(layout), aspect, compact ? COMPACT_PADDING : FULL_PADDING);
}

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

export function getMaxDistance(layout: OfficeLayout, aspect: number): number {
  return Math.max(20, getOverviewView(layout, aspect).distance * 1.4);
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
