import { Box3, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { groundModel } from './ground-model.ts';

/** Clone of a static prop scaled to `targetWidth`, centred on X/Z with its base at y = 0. */
export function fitClone(source: Object3D, targetWidth: number): Object3D {
  const clone = source.clone(true);
  clone.updateMatrixWorld(true);
  const size = new Box3().setFromObject(clone).getSize(new Vector3());
  if (size.x > 0) clone.scale.multiplyScalar(targetWidth / size.x);
  clone.updateMatrixWorld(true);
  groundModel(clone);
  clone.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  clone.updateMatrixWorld(true);
  return clone;
}
