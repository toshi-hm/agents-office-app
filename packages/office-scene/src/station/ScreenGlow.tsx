export function ScreenGlow({
  position,
  size,
  strength,
}: {
  position: [number, number, number];
  size: [number, number];
  strength: number;
}) {
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial color="#9ff3e6" transparent opacity={0.25 + strength * 0.5} />
    </mesh>
  );
}
