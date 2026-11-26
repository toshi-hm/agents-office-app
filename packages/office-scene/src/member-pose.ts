import { Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';

type JointPose = Readonly<{
  joint: Object3D;
  standing: Quaternion;
  sitting: Quaternion;
  stepForward: Quaternion;
  stepBack: Quaternion;
  side: number;
  typingAxis: Vector3 | null;
}>;

/**
 * Precomputes bone targets for the bundled Kenney rig (the shipped walk clip is unusable), so the
 * frame loop only blends quaternions. Missing bones are skipped.
 */
export function prepareMemberPose(model: Object3D) {
  model.updateMatrixWorld(true);
  const jointPos = new Vector3();
  const tipPos = new Vector3();
  const parentRotation = new Quaternion();
  // The feet splay outwards, so average both. `forward` must own its storage: `tipPos` is reused.
  const forward = new Vector3();
  for (const side of ['Left', 'Right']) {
    const foot = model.getObjectByName(`${side}Foot`);
    const toes = model.getObjectByName(`${side}Toes`);
    if (!foot || !toes) continue;
    forward.add(toes.getWorldPosition(tipPos).sub(foot.getWorldPosition(jointPos)));
  }
  forward.setY(0).normalize();
  if (forward.lengthSq() < 0.5) forward.set(0, 0, 1);
  const lateral = new Vector3().crossVectors(new Vector3(0, 1, 0), forward);
  const down = new Vector3(0, -1, 0);
  const thigh = forward.clone().addScaledVector(down, 0.14).normalize();
  const upperArm = forward.clone().multiplyScalar(0.42).addScaledVector(down, 0.9).normalize();
  const foreArm = forward.clone().addScaledVector(down, 0.12).normalize();
  const joints: JointPose[] = [];

  function aim(joint: Object3D, child: Object3D, direction: Vector3): Quaternion {
    model.updateMatrixWorld(true);
    const current = child
      .getWorldPosition(tipPos)
      .sub(joint.getWorldPosition(jointPos))
      .normalize();
    parentRotation.identity();
    joint.parent?.getWorldQuaternion(parentRotation).invert();
    return new Quaternion()
      .setFromUnitVectors(
        current.applyQuaternion(parentRotation),
        direction.clone().applyQuaternion(parentRotation).normalize(),
      )
      .multiply(joint.quaternion);
  }

  function localAxis(joint: Object3D): Vector3 {
    parentRotation.identity();
    joint.parent?.getWorldQuaternion(parentRotation).invert();
    return lateral.clone().applyQuaternion(parentRotation).normalize();
  }

  for (const [side, sign] of [
    ['Left', 1],
    ['Right', -1],
  ] as const) {
    const hip = model.getObjectByName(`${side}UpLeg`);
    const knee = model.getObjectByName(`${side}Leg`);
    const ankle = model.getObjectByName(`${side}Foot`);
    if (hip && knee && ankle) {
      const hipStand = hip.quaternion.clone();
      const kneeStand = knee.quaternion.clone();
      const hipSit = aim(hip, knee, thigh);
      hip.quaternion.copy(hipSit);
      const kneeSit = aim(knee, ankle, down);
      hip.quaternion.copy(hipStand);
      model.updateMatrixWorld(true);
      const hipAxis = localAxis(hip);
      joints.push({
        joint: hip,
        standing: hipStand,
        sitting: hipSit,
        side: sign,
        stepForward: new Quaternion().setFromAxisAngle(hipAxis, -0.55).multiply(hipStand),
        stepBack: new Quaternion().setFromAxisAngle(hipAxis, 0.43).multiply(hipStand),
        typingAxis: null,
      });
      joints.push({
        joint: knee,
        standing: kneeStand,
        sitting: kneeSit,
        side: sign,
        stepForward: kneeStand,
        stepBack: new Quaternion().setFromAxisAngle(localAxis(knee), 0.45).multiply(kneeStand),
        typingAxis: null,
      });
    }

    const shoulder = model.getObjectByName(`${side}Arm`);
    const elbow = model.getObjectByName(`${side}ForeArm`);
    const hand = model.getObjectByName(`${side}Hand`);
    if (shoulder && elbow && hand) {
      const shoulderStand = shoulder.quaternion.clone();
      const elbowStand = elbow.quaternion.clone();
      const shoulderSit = aim(shoulder, elbow, upperArm);
      shoulder.quaternion.copy(shoulderSit);
      const elbowSit = aim(elbow, hand, foreArm);
      model.updateMatrixWorld(true);
      const typingAxis = localAxis(elbow);
      shoulder.quaternion.copy(shoulderStand);
      joints.push(
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
      );
    }
  }
  model.updateMatrixWorld(true);

  const typingRotation = new Quaternion();
  return {
    heading: Math.atan2(forward.x, forward.z),
    jointCount: joints.length,
    apply: (seat: number, stride: number, typing = 0) => {
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
    },
  };
}
