import type { Palette } from './palettes.ts';

/** The back and left walls, each capped with a trim. */
export function Walls({
  width,
  depth,
  height,
  palette,
}: {
  width: number;
  depth: number;
  height: number;
  palette: Palette;
}) {
  return (
    <>
      <mesh position={[-0.08, height / 2 - 0.01, -depth / 2 - 0.08]} receiveShadow>
        <boxGeometry args={[width + 0.16, height, 0.16]} />
        <meshStandardMaterial color={palette.wall} roughness={0.95} />
      </mesh>
      <mesh position={[-width / 2 - 0.08, height / 2 - 0.01, 0]} receiveShadow>
        <boxGeometry args={[0.16, height, depth]} />
        <meshStandardMaterial color={palette.wall} roughness={0.95} />
      </mesh>
      <mesh position={[-0.08, height + 0.02, -depth / 2 - 0.08]}>
        <boxGeometry args={[width + 0.22, 0.06, 0.22]} />
        <meshStandardMaterial color={palette.wallTrim} />
      </mesh>
      <mesh position={[-width / 2 - 0.08, height + 0.02, 0.03]}>
        <boxGeometry args={[0.22, 0.06, depth]} />
        <meshStandardMaterial color={palette.wallTrim} />
      </mesh>
    </>
  );
}
