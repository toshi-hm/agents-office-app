import { useMemo } from 'react';
import { Color } from 'three';
import type { SceneZone } from '../types.ts';
import type { Palette } from './palettes.ts';
import { roundedRect } from './rounded-rect.ts';

/** A two-tone rug in the team colour. */
export function ZoneRug({ zone, palette }: { zone: SceneZone; palette: Palette }) {
  const outer = useMemo(() => roundedRect(zone.width - 0.04, zone.depth - 0.04, 0.34), [zone]);
  const inner = useMemo(() => roundedRect(zone.width - 0.24, zone.depth - 0.24, 0.26), [zone]);
  const colors = useMemo(() => {
    const base = new Color(palette.rugBase);
    return {
      border: `#${base.clone().lerp(new Color(zone.color), 0.62).getHexString()}`,
      fill: `#${base.clone().lerp(new Color(zone.color), 0.24).getHexString()}`,
    };
  }, [palette.rugBase, zone.color]);
  const [x, , z] = zone.center;
  return (
    <group name={`zone-${zone.teamId}`}>
      <mesh position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[outer]} />
        <meshStandardMaterial color={colors.border} roughness={1} />
      </mesh>
      <mesh position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[inner]} />
        <meshStandardMaterial color={colors.fill} roughness={1} />
      </mesh>
    </group>
  );
}
