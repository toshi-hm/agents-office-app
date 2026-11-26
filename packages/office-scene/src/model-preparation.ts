import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { AnimationMixer, Box3, Color, Mesh, SkinnedMesh, Vector3 } from 'three';
import type { AnimationClip, Material, Object3D } from 'three';

export const CHARACTER_HEIGHT = 1.55;

export type PreparedCharacter = Readonly<{
  model: Object3D;
  dispose: () => void;
}>;

/**
 * Creates an independently owned character, samples the idle clip once, grounds it at the requested
 * height and washes it lightly with the agent colour. Geometry and textures stay shared with the
 * cached GLTF; only the cloned skeletons and tinted materials are released by dispose().
 */
export function prepareCharacter(
  source: Object3D,
  idleClip: AnimationClip | undefined,
  tint?: string,
  targetHeight = CHARACTER_HEIGHT,
): PreparedCharacter {
  if (!Number.isFinite(targetHeight) || targetHeight <= 0) {
    throw new RangeError('targetHeight must be a positive finite number');
  }
  const model = SkeletonUtils.clone(source);
  if (idleClip) {
    const mixer = new AnimationMixer(model);
    mixer.clipAction(idleClip).play();
    // One deterministic sample gives a neutral pose without running an animation loop.
    mixer.setTime(Math.min(idleClip.duration, 0.2));
  }

  model.updateMatrixWorld(true);
  const initialBounds = new Box3().setFromObject(model);
  const initialHeight = initialBounds.max.y - initialBounds.min.y;
  if (!Number.isFinite(initialHeight) || initialHeight <= 0) {
    disposeSkeletons(model);
    throw new Error('invalid_character_model');
  }
  model.scale.multiplyScalar(targetHeight / initialHeight);
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  model.position.x -= (bounds.min.x + bounds.max.x) / 2;
  model.position.y -= bounds.min.y;
  model.position.z -= (bounds.min.z + bounds.max.z) / 2;
  model.updateMatrixWorld(true);

  const ownedMaterials: Material[] = [];
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.castShadow = true;
    // Posed bones can leave the bind-pose bounds, which would cull a visible character.
    object.frustumCulled = false;
    if (!tint) return;
    const wash = (material: Material): Material => {
      const clone = material.clone();
      const colored = clone as Material & { color?: Color };
      colored.color?.lerp(new Color(tint), 0.24);
      ownedMaterials.push(clone);
      return clone;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(wash)
      : wash(object.material);
  });

  return {
    model,
    dispose: () => {
      // The sampled mixer owns no timer. Stopping it would restore the bind pose in StrictMode.
      disposeSkeletons(model);
      for (const material of ownedMaterials) material.dispose();
    },
  };
}

function disposeSkeletons(root: Object3D): void {
  const disposed = new Set<unknown>();
  root.traverse((object) => {
    if (object instanceof SkinnedMesh && !disposed.has(object.skeleton)) {
      disposed.add(object.skeleton);
      object.skeleton.dispose();
    }
  });
}

/** Clone of a static prop scaled to `targetWidth`, centred on X/Z with its base at y = 0. */
export function fitClone(source: Object3D, targetWidth: number): Object3D {
  const clone = source.clone(true);
  clone.updateMatrixWorld(true);
  const size = new Box3().setFromObject(clone).getSize(new Vector3());
  if (size.x > 0) clone.scale.multiplyScalar(targetWidth / size.x);
  clone.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(clone);
  const center = bounds.getCenter(new Vector3());
  clone.position.x -= center.x;
  clone.position.y -= bounds.min.y;
  clone.position.z -= center.z;
  clone.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  clone.updateMatrixWorld(true);
  return clone;
}
