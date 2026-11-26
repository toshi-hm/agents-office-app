import type { Object3D } from 'three';
import { createPoseApplier } from './apply-pose.ts';
import { buildArmJoints } from './arm-joints.ts';
import { buildLegJoints } from './leg-joints.ts';
import { createRig } from './rig.ts';

const SIDES = [
  ['Left', 1],
  ['Right', -1],
] as const;

/**
 * Precomputes bone targets for the bundled Kenney rig (the shipped walk clip is unusable), so the
 * frame loop only blends quaternions. Missing bones are skipped.
 */
export function prepareMemberPose(model: Object3D) {
  const rig = createRig(model);
  const joints = SIDES.flatMap(([side, sign]) => [
    ...buildLegJoints(rig, side, sign),
    ...buildArmJoints(rig, side, sign),
  ]);
  model.updateMatrixWorld(true);

  return {
    heading: Math.atan2(rig.forward.x, rig.forward.z),
    jointCount: joints.length,
    apply: createPoseApplier(joints),
  };
}

export type MemberPose = ReturnType<typeof prepareMemberPose>;
