import type { SceneDecor } from '../types.ts';
import { point } from './geometry.ts';

/** Bookcases, plants and lamps, positioned relative to the floor edges. */
export function buildDecor(width: number, depth: number): readonly SceneDecor[] {
  const left = -width / 2;
  const right = width / 2;
  const back = -depth / 2;
  const front = depth / 2;
  const item = (kind: SceneDecor['kind'], x: number, z: number, rotationY = 0): SceneDecor =>
    Object.freeze({ kind, position: point(x, 0, z), rotationY });

  return Object.freeze([
    item('bookcase', left + width * 0.24, back + 0.24),
    item('bookcase', left + width * 0.76, back + 0.24),
    item('bookcase', left + 0.24, back + depth * 0.4, Math.PI / 2),
    item('plant', left + 0.38, back + 0.38),
    item('plant', right - 0.34, front - 0.34),
    item('plant', left + 0.34, front - 0.34),
    item('lamp', right - 0.32, back + 0.34),
    item('lamp', left + 0.32, back + depth * 0.72),
  ]);
}
