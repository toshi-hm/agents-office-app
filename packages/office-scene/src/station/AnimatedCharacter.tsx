import type { Ref } from 'react';
import type { Group, Object3D } from 'three';
import type { ScenePosition } from '../types.ts';

/** The member's figure; the station's frame loop moves and poses it through `ref`. */
export function AnimatedCharacter({
  ref,
  memberId,
  position,
  model,
}: {
  ref: Ref<Group>;
  memberId: string;
  position: ScenePosition;
  model: Object3D;
}) {
  return (
    <group ref={ref} position={[...position]} name={`figure-${memberId}`}>
      <primitive object={model} dispose={null} />
    </group>
  );
}
