import { DoubleSide } from 'three';
import { EFFECT_COLORS } from './constants.ts';

/** Teal column around an agent whose CLI runs outside the office. */
export function ExternalGlow() {
  return (
    <mesh position={[0, 0.55, 0]}>
      <cylinderGeometry args={[0.44, 0.52, 1.1, 28, 1, true]} />
      <meshBasicMaterial
        color={EFFECT_COLORS.external}
        transparent
        opacity={0.09}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
