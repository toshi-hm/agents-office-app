import type { ScenePosition } from '../types.ts';
import type { Palette } from './palettes.ts';

export function WallWindow({ position, palette }: { position: ScenePosition; palette: Palette }) {
  return (
    <group position={[...position]}>
      <mesh>
        <planeGeometry args={[1.2, 0.66]} />
        <meshStandardMaterial color={palette.wallTrim} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={[1.08, 0.54]} />
        <meshStandardMaterial color={palette.sky} emissive={palette.sky} emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.008]}>
        <planeGeometry args={[0.04, 0.54]} />
        <meshStandardMaterial color={palette.wallTrim} />
      </mesh>
    </group>
  );
}
