import type { ScenePosition } from '../types.ts';

/** A framed picture hanging on the left wall. */
export function WallPicture({
  position,
  frameColor,
  color,
}: {
  position: ScenePosition;
  frameColor: string;
  color: string;
}) {
  return (
    <group position={[...position]} rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <planeGeometry args={[0.56, 0.42]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={[0.46, 0.32]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
