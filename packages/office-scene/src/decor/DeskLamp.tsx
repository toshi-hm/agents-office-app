import type { ScenePosition } from '../types.ts';

export function DeskLamp({ position, glow }: { position: ScenePosition; glow: number }) {
  return (
    <group position={[...position]} name="office-lamp">
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.15, 0.17, 0.05, 12]} />
        <meshStandardMaterial color="#5f6b62" />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 1.1, 6]} />
        <meshStandardMaterial color="#5f6b62" />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.22, 0.24, 10, 1, true]} />
        <meshStandardMaterial
          color="#ffe3ac"
          emissive="#ffc766"
          emissiveIntensity={glow}
          side={2}
          flatShading
        />
      </mesh>
    </group>
  );
}
