import { Quaternion } from 'three';
import type { JointPose } from './joint-pose.ts';

/** Blends every joint for the current frame without allocating. */
export function createPoseApplier(joints: readonly JointPose[]) {
  const typingRotation = new Quaternion();
  return (seat: number, stride: number, typing = 0) => {
    for (const pose of joints) {
      pose.joint.quaternion.copy(pose.standing);
      if (seat > 0) pose.joint.quaternion.slerp(pose.sitting, seat);
      else if (stride !== 0) {
        pose.joint.quaternion.slerp(
          stride * pose.side > 0 ? pose.stepForward : pose.stepBack,
          Math.abs(stride),
        );
      }
      if (pose.typingAxis && typing !== 0 && seat === 1) {
        typingRotation.setFromAxisAngle(pose.typingAxis, typing * pose.side * 0.09);
        pose.joint.quaternion.premultiply(typingRotation);
      }
    }
  };
}
