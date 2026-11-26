import { Vector3 } from 'three';
import type { JointPose } from './joint-pose.ts';
import type { Rig } from './rig.ts';

/** Shoulder and elbow targets for one side; empty when the rig lacks a bone. */
export function buildArmJoints(rig: Rig, side: string, sign: number): JointPose[] {
  const { model, forward } = rig;
  const shoulder = model.getObjectByName(`${side}Arm`);
  const elbow = model.getObjectByName(`${side}ForeArm`);
  const hand = model.getObjectByName(`${side}Hand`);
  if (!shoulder || !elbow || !hand) return [];

  const down = new Vector3(0, -1, 0);
  const upperArm = forward.clone().multiplyScalar(0.42).addScaledVector(down, 0.9).normalize();
  const foreArm = forward.clone().addScaledVector(down, 0.12).normalize();
  const shoulderStand = shoulder.quaternion.clone();
  const elbowStand = elbow.quaternion.clone();
  const shoulderSit = rig.aim(shoulder, elbow, upperArm);
  shoulder.quaternion.copy(shoulderSit);
  const elbowSit = rig.aim(elbow, hand, foreArm);
  model.updateMatrixWorld(true);
  const typingAxis = rig.localAxis(elbow);
  shoulder.quaternion.copy(shoulderStand);
  return [
    {
      joint: shoulder,
      standing: shoulderStand,
      sitting: shoulderSit,
      side: sign,
      stepForward: shoulderStand,
      stepBack: shoulderStand,
      typingAxis: null,
    },
    {
      joint: elbow,
      standing: elbowStand,
      sitting: elbowSit,
      side: sign,
      stepForward: elbowStand,
      stepBack: elbowStand,
      typingAxis,
    },
  ];
}
