import { clamp } from './clamp.ts';

export const WALK_DURATION = 1.45;

/** 0 = standing at the idle spot, 1 = seated. Reduced motion jumps straight to the goal. */
export function advanceMemberMotion(
  current: number,
  seated: boolean,
  reducedMotion: boolean,
  delta: number,
): number {
  if (reducedMotion) return seated ? 1 : 0;
  const step = clamp(delta / WALK_DURATION);
  return clamp(current + (seated ? step : -step));
}
