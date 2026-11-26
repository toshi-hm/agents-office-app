import type { AgentActivity } from '@agents-office-app/domain';
import type { ScenePlacement, ScenePosition } from './types.ts';

/** Fraction of the transition spent walking; the rest is spent sitting down. */
export const WALK_END = 0.76;
export const WALK_DURATION = 1.45;
export const SEAT_DROP = 0.38;

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function isSeatedActivity(activity: AgentActivity): boolean {
  return (
    activity === 'starting' ||
    activity === 'working' ||
    activity === 'waiting_approval' ||
    activity === 'external'
  );
}

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

/** Where the character will end up for this activity (camera follow target). */
export function getDestination(placement: ScenePlacement, activity: AgentActivity): ScenePosition {
  return isSeatedActivity(activity) ? placement.chairPosition : placement.position;
}

export type ActivityEffect = Readonly<{
  /** Vertical bob added to a seated, working character. */
  bob: number;
  /** -1..1 typing phase for the forearms. */
  typing: number;
  beacon: 'approval' | 'error' | 'external' | null;
  /** 0..1 pulse used for beacon scale and ring opacity. */
  pulse: number;
  screenGlow: number;
}>;

const PULSE_SPEED: Readonly<Record<'approval' | 'error' | 'external', number>> = {
  approval: 5.2,
  error: 3.2,
  external: 1.5,
};

/** Pure description of the status effect at `time` seconds. Reduced motion yields a still frame. */
export function sampleActivityEffect(
  activity: AgentActivity,
  time: number,
  reducedMotion: boolean,
  phase = 0,
): ActivityEffect {
  const working = activity === 'working';
  const beacon =
    activity === 'waiting_approval'
      ? 'approval'
      : activity === 'error'
        ? 'error'
        : activity === 'external'
          ? 'external'
          : null;
  const animate = !reducedMotion;
  const pulse =
    beacon === null
      ? 0
      : animate
        ? 0.5 + 0.5 * Math.sin(time * PULSE_SPEED[beacon] + phase)
        : 0.75;
  return {
    bob: working && animate ? Math.sin(time * 4.1 + phase) * 0.012 : 0,
    typing: working && animate ? Math.sin(time * 13 + phase) : 0,
    beacon,
    pulse,
    screenGlow: working ? 1 : activity === 'external' ? 0.7 : activity === 'starting' ? 0.4 : 0,
  };
}

/** Any activity that needs a continuously rendered scene. */
export function isAnimatedActivity(activity: AgentActivity): boolean {
  return activity !== 'idle';
}
