import { Color, Mesh } from 'three';
import type { Material, Object3D } from 'three';

/**
 * Enables shadows on every mesh and, with a tint, swaps in lightly washed material clones.
 * Returns the clones, which the caller now owns and must dispose.
 */
export function tintMeshes(model: Object3D, tint: string | undefined): Material[] {
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
  return ownedMaterials;
}
