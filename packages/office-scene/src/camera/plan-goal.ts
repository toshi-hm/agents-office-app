import type { OfficeLayout, ScenePosition } from '../types.ts';
import { getFocusTarget, getFocusView } from './focus-framing.ts';
import { getOverviewView } from './overview-framing.ts';
import { translateCameraTarget } from './vector-math.ts';

export type CameraMode = 'overview' | 'follow' | 'manual';

export type Goal = { position: ScenePosition; target: ScenePosition };

/** The camera request that was last applied. */
export type CameraRequest = {
  mode: CameraMode;
  sequence: number;
  focus: ScenePosition | null;
};

/** Where the camera should go for a new `overview` or `follow` request. */
export function planCameraGoal(input: {
  previous: CameraRequest | null;
  request: CameraRequest;
  layout: OfficeLayout;
  aspect: number;
  compact: boolean;
  /** Reads the live camera; only needed while following a moving agent. */
  current: () => Goal;
}): Goal {
  const { previous, request, layout, aspect, compact } = input;
  if (request.mode !== 'follow' || !request.focus) {
    return getOverviewView(layout, aspect, compact);
  }
  const sameRequest = previous?.mode === 'follow' && previous.sequence === request.sequence;
  if (!sameRequest || !previous.focus) return getFocusView(request.focus, aspect, compact);
  // The followed agent moved: keep the user's current angle and distance.
  const { position, target } = input.current();
  const nextTarget = getFocusTarget(request.focus);
  return { target: nextTarget, position: translateCameraTarget(position, target, nextTarget) };
}
