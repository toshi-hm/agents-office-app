import { SkinnedMesh } from 'three';
import type { Object3D } from 'three';

export function disposeSkeletons(root: Object3D): void {
  const disposed = new Set<unknown>();
  root.traverse((object) => {
    if (object instanceof SkinnedMesh && !disposed.has(object.skeleton)) {
      disposed.add(object.skeleton);
      object.skeleton.dispose();
    }
  });
}
