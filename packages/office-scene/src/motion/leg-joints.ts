import { Quaternion, Vector3 } from 'three';
import type { JointPose } from './joint-pose.ts';
import type { Rig } from './rig.ts';

/** Hip and knee targets for one side; empty when the rig lacks a bone. */
export function buildLegJoints(rig: Rig, side: string, sign: number): JointPose[] {
  const { model, forward } = rig;
  const hip = model.getObjectByName(`${side}UpLeg`);
  const knee = model.getObjectByName(`${side}Leg`);
  const ankle = model.getObjectByName(`${side}Foot`);
  if (!hip || !knee || !ankle) return [];

  const down = new Vector3(0, -1, 0);
  const thigh = forward.clone().addScaledVector(down, 0.14).normalize();
  const hipStand = hip.quaternion.clone();
  const kneeStand = knee.quaternion.clone();
  const hipSit = rig.aim(hip, knee, thigh);
  hip.quaternion.copy(hipSit);
  const kneeSit = rig.aim(knee, ankle, down);
  hip.quaternion.copy(hipStand);
  model.updateMatrixWorld(true);
  const hipAxis = rig.localAxis(hip);
  return [
    {
      joint: hip,
      standing: hipStand,
      sitting: hipSit,
      side: sign,
      stepForward: new Quaternion().setFromAxisAngle(hipAxis, -0.55).multiply(hipStand),
      stepBack: new Quaternion().setFromAxisAngle(hipAxis, 0.43).multiply(hipStand),
      typingAxis: null,
    },
    {
      joint: knee,
      standing: kneeStand,
      sitting: kneeSit,
      side: sign,
      stepForward: kneeStand,
      stepBack: new Quaternion().setFromAxisAngle(rig.localAxis(knee), 0.45).multiply(kneeStand),
      typingAxis: null,
    },
  ];
}
