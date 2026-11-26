import { Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';

/** Average heel-to-toe direction on the floor; +Z when the foot bones are missing. */
function findForward(model: Object3D): Vector3 {
  const heel = new Vector3();
  const tip = new Vector3();
  // The feet splay outwards, so average both.
  const forward = new Vector3();
  for (const side of ['Left', 'Right']) {
    const foot = model.getObjectByName(`${side}Foot`);
    const toes = model.getObjectByName(`${side}Toes`);
    if (!foot || !toes) continue;
    forward.add(toes.getWorldPosition(tip).sub(foot.getWorldPosition(heel)));
  }
  forward.setY(0).normalize();
  if (forward.lengthSq() < 0.5) forward.set(0, 0, 1);
  return forward;
}

/** Measures the model and converts world directions into bone-local rotations. */
export function createRig(model: Object3D) {
  model.updateMatrixWorld(true);
  const forward = findForward(model);
  const lateral = new Vector3().crossVectors(new Vector3(0, 1, 0), forward);
  const jointPos = new Vector3();
  const tipPos = new Vector3();
  const parentRotation = new Quaternion();

  const readParentInverse = (joint: Object3D) => {
    parentRotation.identity();
    joint.parent?.getWorldQuaternion(parentRotation).invert();
  };

  return {
    model,
    forward,
    /** Rotation that points the bone from `joint` to `child` along `direction`. */
    aim(joint: Object3D, child: Object3D, direction: Vector3): Quaternion {
      model.updateMatrixWorld(true);
      const current = child
        .getWorldPosition(tipPos)
        .sub(joint.getWorldPosition(jointPos))
        .normalize();
      readParentInverse(joint);
      return new Quaternion()
        .setFromUnitVectors(
          current.applyQuaternion(parentRotation),
          direction.clone().applyQuaternion(parentRotation).normalize(),
        )
        .multiply(joint.quaternion);
    },
    /** The body's left-right axis expressed in the joint's parent space. */
    localAxis(joint: Object3D): Vector3 {
      readParentInverse(joint);
      return lateral.clone().applyQuaternion(parentRotation).normalize();
    },
  };
}

export type Rig = ReturnType<typeof createRig>;
