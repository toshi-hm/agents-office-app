import type { AgentActivity } from '@agents-office-app/domain';
import type { ScenePlacement, ScenePosition } from '../types.ts';

export function isSeatedActivity(activity: AgentActivity): boolean {
  return (
    activity === 'starting' ||
    activity === 'working' ||
    activity === 'waiting_approval' ||
    activity === 'external'
  );
}

/** Where the character will end up for this activity (camera follow target). */
export function getDestination(placement: ScenePlacement, activity: AgentActivity): ScenePosition {
  return isSeatedActivity(activity) ? placement.chairPosition : placement.position;
}

/** Any activity that needs a continuously rendered scene. */
export function isAnimatedActivity(activity: AgentActivity): boolean {
  return activity !== 'idle';
}
