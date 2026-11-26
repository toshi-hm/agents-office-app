import type { Object3D, Quaternion, Vector3 } from 'three';

/** Precomputed bone targets for one joint of the rig. */
export type JointPose = Readonly<{
  joint: Object3D;
  standing: Quaternion;
  sitting: Quaternion;
  stepForward: Quaternion;
  stepBack: Quaternion;
  side: number;
  typingAxis: Vector3 | null;
}>;
