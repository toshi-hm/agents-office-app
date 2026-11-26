import type { ScenePosition } from '../types.ts';

export function point(x: number, y: number, z: number): ScenePosition {
  return Object.freeze([x, y, z]) as ScenePosition;
}

export function add(base: ScenePosition, offset: ScenePosition): ScenePosition {
  return point(base[0] + offset[0], base[1] + offset[1], base[2] + offset[2]);
}

export const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);

export function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
