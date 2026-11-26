import type { Ref } from 'react';
import type { Group } from 'three';
import type { ScenePosition } from '../types.ts';
import { EFFECT_COLORS } from './constants.ts';

/** The floating gem that flags a pending approval (larger) or an error. */
export function ActivityBeacon({
  ref,
  kind,
  destination,
}: {
  ref: Ref<Group>;
  kind: 'approval' | 'error';
  destination: ScenePosition;
}) {
  const color = EFFECT_COLORS[kind];
  return (
    <group ref={ref} position={[destination[0], 1.56, destination[2]]} name="alert-beacon">
      <mesh>
        <octahedronGeometry args={[kind === 'approval' ? 0.18 : 0.12, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.55}
          flatShading
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[kind === 'approval' ? 0.24 : 0.17, 16, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}
