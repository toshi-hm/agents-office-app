import type { ReactNode, Ref } from 'react';
import type { Mesh } from 'three';

/** A flat ring lying on the floor. The child is its material. */
export function FloorRing({
  ref,
  height,
  radii: [inner, outer],
  segments = 36,
  name,
  children,
}: {
  ref?: Ref<Mesh>;
  height: number;
  radii: readonly [inner: number, outer: number];
  segments?: number;
  name?: string;
  children: ReactNode;
}) {
  return (
    <mesh
      ref={ref ?? null}
      position={[0, height, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      {...(name ? { name } : {})}
    >
      <ringGeometry args={[inner, outer, segments]} />
      {children}
    </mesh>
  );
}
