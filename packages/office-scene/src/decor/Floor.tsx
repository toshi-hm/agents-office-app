import { useEffect, useMemo } from 'react';
import type { Palette } from './palettes.ts';
import { createPlankTexture } from './plank-texture.ts';

export function Floor({
  width,
  depth,
  palette,
}: {
  width: number;
  depth: number;
  palette: Palette;
}) {
  const texture = useMemo(() => {
    const created = createPlankTexture();
    created?.repeat.set(width / 3.2, depth / 3.2);
    return created;
  }, [width, depth]);
  useEffect(() => () => texture?.dispose(), [texture]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.001, 0]}
      receiveShadow
      name="office-floor"
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        key={texture?.uuid ?? 'plain'}
        map={texture}
        color={texture ? palette.floorTint : '#d6b083'}
        roughness={0.85}
      />
    </mesh>
  );
}
