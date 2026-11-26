import type { Ref } from 'react';
import type { Group, Mesh } from 'three';
import type { ActivityEffect } from '../motion/activity-effect.ts';
import { PROVIDER_COLORS } from '../provider-colors.ts';
import type { SceneMember, ScenePosition } from '../types.ts';
import { EFFECT_COLORS } from './constants.ts';
import { ExternalGlow } from './ExternalGlow.tsx';
import { FloorRing } from './FloorRing.tsx';

/** Floor markers under the character: identity rings, selection and status effects. */
export function StatusRing({
  ref,
  pulseRef,
  position,
  member,
  selected,
  beacon,
}: {
  ref: Ref<Group>;
  pulseRef: Ref<Mesh>;
  position: ScenePosition;
  member: SceneMember;
  selected: boolean;
  beacon: ActivityEffect['beacon'];
}) {
  return (
    <group ref={ref} position={[...position]}>
      <FloorRing height={0.022} radii={[0.33, 0.43]} name={`accent-${member.id}`}>
        <meshBasicMaterial color={member.avatarColor} />
      </FloorRing>
      <FloorRing height={0.023} radii={[0.455, 0.505]}>
        <meshBasicMaterial color={PROVIDER_COLORS[member.provider]} />
      </FloorRing>
      {selected && (
        <mesh position={[0, 0.019, 0]} rotation={[-Math.PI / 2, 0, 0]} name="selection">
          <circleGeometry args={[0.76, 44]} />
          <meshBasicMaterial color="#ffb627" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      )}
      {beacon && (
        <FloorRing ref={pulseRef} height={0.026} radii={[0.55, 0.7]} segments={44}>
          <meshBasicMaterial
            color={EFFECT_COLORS[beacon]}
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </FloorRing>
      )}
      {beacon === 'external' && <ExternalGlow />}
    </group>
  );
}
