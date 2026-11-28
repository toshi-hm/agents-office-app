import { Box3, Vector3 } from 'three';
import type { Object3D } from 'three';

/** Centres a model on X/Z and puts its base at y = 0. World matrices must be current. */
export function groundModel(model: Object3D): void {
  const bounds = new Box3().setFromObject(model);
  const center = bounds.getCenter(new Vector3());
  model.position.x -= center.x;
  model.position.y -= bounds.min.y;
  model.position.z -= center.z;
  model.updateMatrixWorld(true);
}
