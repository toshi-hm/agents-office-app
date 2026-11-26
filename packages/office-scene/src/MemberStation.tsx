import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { DoubleSide } from 'three';
import type { Group, Mesh, MeshBasicMaterial } from 'three';
import type { AgentActivity } from '@agents-office-app/domain';
import { FittedAsset } from './FittedAsset.tsx';
import { MemberLabel } from './OfficeLabels.tsx';
import { SCENE_ASSET_URLS } from './asset-manifest.ts';
import {
  advanceMemberMotion,
  getDestination,
  isSeatedActivity,
  sampleActivityEffect,
  sampleMemberMotion,
} from './member-motion.ts';
import { prepareMemberPose } from './member-pose.ts';
import { prepareCharacter } from './model-preparation.ts';
import { PROVIDER_COLORS } from './provider-colors.ts';
import { useSceneGLTF } from './scene-gltf.ts';
import type { ScenePlacement } from './types.ts';

const DESK_WIDTH = 1.38;
const PRESIDENT_DESK_WIDTH = 1.52;
const CHAIR_WIDTH = 0.5;
const SCREEN_WIDTH = 0.52;
const KEYBOARD_WIDTH = 0.43;
const LAPTOP_WIDTH = 0.46;
/** Desk top height for the standard width (source ratio 0.3844 / 0.7345). */
const DESK_HEIGHT_RATIO = 0.3844 / 0.7345;

const EFFECT_COLORS = { approval: '#ff8a00', error: '#e5262c', external: '#1fb6a8' } as const;

export type MemberStationProps = Readonly<{
  placement: ScenePlacement;
  activity: AgentActivity;
  selected: boolean;
  showLabel: boolean;
  compact: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}>;

export function MemberStation({
  placement,
  activity,
  selected,
  showLabel,
  compact,
  reducedMotion,
  onSelect,
}: MemberStationProps) {
  const { member, deskPosition, chairPosition } = placement;
  const { scene, animations } = useSceneGLTF(SCENE_ASSET_URLS.character);
  const prepared = useMemo(
    () =>
      prepareCharacter(
        scene,
        animations.find((clip) => clip.name.toLowerCase() === 'idle'),
        member.avatarColor,
      ),
    [scene, animations, member.avatarColor],
  );
  const pose = useMemo(() => prepareMemberPose(prepared.model), [prepared]);
  useEffect(() => () => prepared.dispose(), [prepared]);

  const seated = isSeatedActivity(activity);
  // Agents already busy when the office opens start at their desk; later changes walk.
  const progress = useRef(seated ? 1 : 0);
  const figure = useRef<Group>(null);
  const footing = useRef<Group>(null);
  const beacon = useRef<Group>(null);
  const pulseRing = useRef<Mesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const phase = useMemo(
    () => [...member.id].reduce((total, char) => total + char.charCodeAt(0), 0) % 7,
    [member.id],
  );

  useLayoutEffect(() => invalidate(), [invalidate, activity, reducedMotion, placement, selected]);

  useFrame(({ clock }, delta) => {
    const character = figure.current;
    if (!character) return;
    const goal = seated ? 1 : 0;
    // A demand-driven canvas can report a long first delta; clamp it so nobody teleports.
    progress.current = advanceMemberMotion(
      progress.current,
      seated,
      reducedMotion,
      Math.min(delta, 0.05),
    );
    const motion = sampleMemberMotion(placement, progress.current);
    const effect = sampleActivityEffect(activity, clock.elapsedTime, reducedMotion, phase);
    const atDesk = progress.current === 1;

    character.position.set(motion.x, motion.y + (atDesk ? effect.bob : 0), motion.z);
    character.rotation.y = motion.heading === null ? 0 : motion.heading - pose.heading;
    pose.apply(motion.seat, motion.stride, atDesk ? effect.typing : 0);
    footing.current?.position.set(motion.x, 0, motion.z);

    if (beacon.current) {
      beacon.current.position.set(motion.x, 1.56 + effect.pulse * 0.05, motion.z);
      beacon.current.scale.setScalar(0.85 + effect.pulse * 0.35);
      if (!reducedMotion) beacon.current.rotation.y = clock.elapsedTime * 1.6;
    }
    if (pulseRing.current) {
      pulseRing.current.scale.setScalar(1 + effect.pulse * 0.28);
      (pulseRing.current.material as MeshBasicMaterial).opacity = 0.75 - effect.pulse * 0.4;
    }
    if (progress.current !== goal) invalidate();
  });

  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    // Ignore the click that ends an orbit drag.
    if (event.delta <= 4) onSelect(member.id);
  };
  const hover = (active: boolean) => () => {
    document.body.style.cursor = active ? 'pointer' : '';
  };
  useEffect(
    () => () => {
      document.body.style.cursor = '';
    },
    [],
  );

  const deskWidth = member.role === 'president' ? PRESIDENT_DESK_WIDTH : DESK_WIDTH;
  const deskTop = deskWidth * DESK_HEIGHT_RATIO;
  const [deskX, , deskZ] = deskPosition;
  const effect = sampleActivityEffect(activity, 0, true);
  const effectColor = effect.beacon ? EFFECT_COLORS[effect.beacon] : null;
  const destination = getDestination(placement, activity);
  // Alerts raise the nameplate so that it never covers the beacon underneath.
  const alerting = effect.beacon === 'approval' || effect.beacon === 'error';
  const labelHeight = (seated ? 1.92 : 2.04) + placement.labelLift + (alerting ? 0.28 : 0);

  return (
    <group
      name={`office-member-${member.id}`}
      onClick={select}
      onPointerOver={hover(true)}
      onPointerOut={hover(false)}
    >
      <FittedAsset url={SCENE_ASSET_URLS.desk} width={deskWidth} position={deskPosition} />
      <FittedAsset
        url={SCENE_ASSET_URLS.chair}
        width={CHAIR_WIDTH}
        position={chairPosition}
        rotationY={Math.PI}
      />
      {member.role === 'president' ? (
        <>
          <FittedAsset
            url={SCENE_ASSET_URLS.laptop}
            width={LAPTOP_WIDTH}
            position={[deskX, deskTop, deskZ + 0.05]}
          />
          {effect.screenGlow > 0 && (
            <ScreenGlow
              position={[deskX, deskTop + 0.17, deskZ + 0.02]}
              size={[0.36, 0.2]}
              strength={effect.screenGlow}
            />
          )}
        </>
      ) : (
        <>
          <FittedAsset
            url={SCENE_ASSET_URLS.screen}
            width={SCREEN_WIDTH}
            position={[deskX, deskTop, deskZ - 0.18]}
          />
          <FittedAsset
            url={SCENE_ASSET_URLS.keyboard}
            width={KEYBOARD_WIDTH}
            position={[deskX, deskTop + 0.004, deskZ + 0.14]}
          />
          {effect.screenGlow > 0 && (
            <ScreenGlow
              position={[deskX, deskTop + 0.23, deskZ - 0.105]}
              size={[0.46, 0.26]}
              strength={effect.screenGlow}
            />
          )}
        </>
      )}

      <group ref={footing} position={[...destination]}>
        <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]} name={`accent-${member.id}`}>
          <ringGeometry args={[0.33, 0.43, 36]} />
          <meshBasicMaterial color={member.avatarColor} />
        </mesh>
        <mesh position={[0, 0.023, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.455, 0.505, 36]} />
          <meshBasicMaterial color={PROVIDER_COLORS[member.provider]} />
        </mesh>
        {selected && (
          <mesh position={[0, 0.019, 0]} rotation={[-Math.PI / 2, 0, 0]} name="selection">
            <circleGeometry args={[0.76, 44]} />
            <meshBasicMaterial color="#ffb627" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        )}
        {effectColor && (
          <mesh ref={pulseRing} position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.55, 0.7, 44]} />
            <meshBasicMaterial color={effectColor} transparent opacity={0.6} depthWrite={false} />
          </mesh>
        )}
        {effect.beacon === 'external' && (
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
        )}
      </group>

      {(effect.beacon === 'approval' || effect.beacon === 'error') && effectColor && (
        <group ref={beacon} position={[destination[0], 1.56, destination[2]]} name="alert-beacon">
          <mesh>
            <octahedronGeometry args={[effect.beacon === 'approval' ? 0.18 : 0.12, 0]} />
            <meshStandardMaterial
              color={effectColor}
              emissive={effectColor}
              emissiveIntensity={0.55}
              flatShading
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[effect.beacon === 'approval' ? 0.24 : 0.17, 16, 12]} />
            <meshBasicMaterial color={effectColor} transparent opacity={0.22} depthWrite={false} />
          </mesh>
        </group>
      )}

      <group ref={figure} position={[...destination]} name={`figure-${member.id}`}>
        <primitive object={prepared.model} dispose={null} />
      </group>

      <MemberLabel
        visible={showLabel}
        position={[destination[0], labelHeight, destination[2]]}
        member={member}
        activity={activity}
        selected={selected}
        compact={compact}
        onSelect={onSelect}
      />
    </group>
  );
}

function ScreenGlow({
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
