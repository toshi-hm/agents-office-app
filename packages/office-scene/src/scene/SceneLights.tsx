import type { OfficeLayout } from '../types.ts';
import { SunLight } from './SunLight.tsx';

/** Warm daylight, or a bluish night with one lamp glow. */
export function SceneLights({ floor, dark }: { floor: OfficeLayout['floor']; dark: boolean }) {
  const halfWidth = floor.width / 2;
  const halfDepth = floor.depth / 2;
  return (
    <>
      <ambientLight intensity={dark ? 0.55 : 0.95} color={dark ? '#b9c2ff' : '#fff6e8'} />
      <hemisphereLight
        args={dark ? ['#8f9be0', '#4a3b34', 0.55] : ['#fff1d6', '#8d9a7c', 0.75]}
      />
      <SunLight shadowExtent={Math.hypot(halfWidth, halfDepth) + 0.5} dark={dark} />
      {dark && (
        <pointLight
          position={[halfWidth - 0.6, 1.5, -halfDepth + 0.7]}
          intensity={5}
          color="#ffbd63"
        />
      )}
    </>
  );
}
