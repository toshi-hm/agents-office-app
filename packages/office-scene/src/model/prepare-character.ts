import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { AnimationMixer, Box3 } from 'three';
import type { AnimationClip, Object3D } from 'three';
import { disposeSkeletons } from './dispose-skeletons.ts';
import { groundModel } from './ground-model.ts';
import { tintMeshes } from './tint-meshes.ts';

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
  groundModel(model);

  const ownedMaterials = tintMeshes(model, tint);

  return {
    model,
    dispose: () => {
      // The sampled mixer owns no timer. Stopping it would restore the bind pose in StrictMode.
      disposeSkeletons(model);
      for (const material of ownedMaterials) material.dispose();
    },
  };
}
