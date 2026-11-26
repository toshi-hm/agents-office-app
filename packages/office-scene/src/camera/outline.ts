/** Helpers that centre a set of points in the camera's view. */
import type { ScenePosition } from '../types.ts';
import { dot } from './vector-math.ts';
import type { cameraBasis } from './vector-math.ts';

export type Projection = Readonly<{
  basis: ReturnType<typeof cameraBasis>;
  tanHorizontal: number;
  tanVertical: number;
}>;

/** Middle of the axis-aligned bounding box; the origin when there are no points. */
export function getBoundsCentre(points: readonly ScenePosition[]): ScenePosition {
  if (points.length === 0) return [0, 0, 0];
  const mean = (axis: 0 | 1 | 2) => {
    const values = points.map((p) => p[axis]);
    return (Math.min(...values) + Math.max(...values)) / 2;
  };
  return [mean(0), mean(1), mean(2)];
}

/** Shifts `target` so the outline seen from `distance` sits in the middle of the screen. */
export function centreOutline(
  points: readonly ScenePosition[],
  target: ScenePosition,
  distance: number,
  { basis: { back, right, up }, tanHorizontal, tanVertical }: Projection,
): ScenePosition {
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
  return [
    target[0] + right[0] * shiftX + up[0] * shiftY,
    target[1] + right[1] * shiftX + up[1] * shiftY,
    target[2] + right[2] * shiftX + up[2] * shiftY,
  ];
}
