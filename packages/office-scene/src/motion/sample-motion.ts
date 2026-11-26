import type { ScenePlacement } from '../types.ts';
import { clamp } from './clamp.ts';

/** Fraction of the transition spent walking; the rest is spent sitting down. */
export const WALK_END = 0.76;
export const SEAT_DROP = 0.38;

export function sampleMemberMotion(placement: ScenePlacement, progress: number) {
  const [x, , z] = placement.position;
  const [chairX, , chairZ] = placement.chairPosition;
  const travel = clamp(progress / WALK_END);
  const seat = clamp((progress - WALK_END) / (1 - WALK_END));
  const stride = travel > 0 && travel < 1 ? Math.sin(travel * Math.PI * 6) : 0;
  return {
    x: x + (chairX - x) * travel,
    y: Math.abs(stride) * 0.04 - seat * SEAT_DROP,
    z: z + (chairZ - z) * travel,
    /** Null while standing still (face the viewer); the desk is along -Z from the chair. */
    heading: progress === 0 ? null : travel === 1 ? Math.PI : Math.atan2(chairX - x, chairZ - z),
    seat,
    stride,
  };
}
