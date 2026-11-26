import { useMemo } from 'react';
import type { ScenePosition } from '../types.ts';
import { noise } from './noise.ts';

export function PottedPlant({ position, seed }: { position: ScenePosition; seed: number }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => ({
        x: (noise(seed * 13 + index) - 0.5) * 0.28,
        y: 0.44 + noise(seed * 29 + index) * 0.32,
        z: (noise(seed * 43 + index) - 0.5) * 0.28,
        size: 0.13 + noise(seed * 59 + index) * 0.08,
        color: ['#6f9a5c', '#82ad68', '#5d8a56'][index % 3] ?? '#6f9a5c',
      })),
    [seed],
  );
  return (
    <group position={[...position]} name="office-plant">
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.12, 0.3, 8]} />
        <meshStandardMaterial color="#c9785a" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.24, 5]} />
        <meshStandardMaterial color="#6d5237" />
      </mesh>
      {leaves.map((leaf, index) => (
        <mesh key={index} position={[leaf.x, leaf.y, leaf.z]} castShadow>
          <icosahedronGeometry args={[leaf.size, 0]} />
          <meshStandardMaterial color={leaf.color} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}
