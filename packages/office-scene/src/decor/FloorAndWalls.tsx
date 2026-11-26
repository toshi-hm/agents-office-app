import type { OfficeLayout } from '../types.ts';
import { Floor } from './Floor.tsx';
import type { Palette } from './palettes.ts';
import { Walls } from './Walls.tsx';

/** Plank floor on a thick base with two low walls. */
export function FloorAndWalls({ layout, palette }: { layout: OfficeLayout; palette: Palette }) {
  const { width, depth } = layout.floor;
  return (
    <>
      <mesh position={[-0.08, -0.15, -0.08]}>
        <boxGeometry args={[width + 0.16, 0.28, depth + 0.16]} />
        <meshStandardMaterial color={palette.base} roughness={0.9} />
      </mesh>
      <Floor width={width} depth={depth} palette={palette} />
      <Walls width={width} depth={depth} height={layout.wallHeight} palette={palette} />
    </>
  );
}
