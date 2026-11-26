import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MemberStation } from './MemberStation.tsx';
import { TeamLabels } from './OfficeLabels.tsx';
import { RoomDecor } from './RoomDecor.tsx';
import type { SceneTheme } from './RoomDecor.tsx';
import { SCENE_ASSET_URLS } from './asset-manifest.ts';
import { isAnimatedActivity } from './member-motion.ts';
import { clearSceneGLTF, preloadSceneGLTF } from './scene-gltf.ts';
import { shouldShowMemberLabel } from './scene-labels.ts';
import type { LabelMode } from './scene-labels.ts';
import type { OfficeLayout, SceneActivities } from './types.ts';

/** Status pulses do not need 60 fps; the office may stay on screen all day. */
const STATUS_FPS = 30;

export type OfficeSceneProps = Readonly<{
  layout: OfficeLayout;
  activities: SceneActivities;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReady?: () => void;
  labelMode: LabelMode;
  compact: boolean;
  reducedMotion: boolean;
  theme: SceneTheme;
}>;

export function OfficeScene({
  layout,
  activities,
  selectedId,
  onSelect,
  onReady,
  labelMode,
  compact,
  reducedMotion,
  theme,
}: OfficeSceneProps) {
  const ready = useRef(false);
  const invalidate = useThree((state) => state.invalidate);
  const animated =
    !reducedMotion &&
    layout.members.some(({ member }) => isAnimatedActivity(activities[member.id] ?? 'idle'));

  useEffect(() => {
    if (!animated) return;
    const timer = window.setInterval(() => invalidate(), 1000 / STATUS_FPS);
    return () => window.clearInterval(timer);
  }, [animated, invalidate]);

  // HTML labels are positioned during a frame, so request one after anything that changes them.
  useEffect(() => {
    invalidate();
    const timer = window.setTimeout(() => invalidate(), 60);
    return () => window.clearTimeout(timer);
  }, [invalidate, labelMode, selectedId, activities, theme, layout]);

  useFrame(() => {
    if (ready.current) return;
    ready.current = true;
    onReady?.();
    invalidate();
  });

  const halfWidth = layout.floor.width / 2;
  const halfDepth = layout.floor.depth / 2;
  const shadowExtent = Math.hypot(halfWidth, halfDepth) + 0.5;
  const dark = theme === 'dark';

  return (
    <group>
      <ambientLight intensity={dark ? 0.55 : 0.95} color={dark ? '#b9c2ff' : '#fff6e8'} />
      <hemisphereLight
        args={dark ? ['#8f9be0', '#4a3b34', 0.55] : ['#fff1d6', '#8d9a7c', 0.75]}
      />
      <directionalLight
        position={[5.5, 10, 6.5]}
        intensity={dark ? 0.85 : 1.75}
        color={dark ? '#cdd6ff' : '#fff0d8'}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={1}
        shadow-camera-far={30 + shadowExtent}
      />
      {dark && (
        <pointLight position={[halfWidth - 0.6, 1.5, -halfDepth + 0.7]} intensity={5} color="#ffbd63" />
      )}
      <RoomDecor layout={layout} theme={theme} />
      {/* The mini office stays uncluttered until every nameplate is asked for. */}
      <TeamLabels
        zones={layout.zones}
        compact={compact}
        visible={!compact || labelMode === 'all'}
      />
      {layout.members.map((placement) => {
        const id = placement.member.id;
        const activity = activities[id] ?? 'idle';
        return (
          <MemberStation
            key={id}
            placement={placement}
            activity={activity}
            selected={id === selectedId}
            showLabel={shouldShowMemberLabel(labelMode, id, selectedId, activity)}
            compact={compact}
            reducedMotion={reducedMotion}
            onSelect={onSelect}
          />
        );
      })}
    </group>
  );
}

export function preloadSceneAssets(): void {
  for (const url of Object.values(SCENE_ASSET_URLS)) preloadSceneGLTF(url);
}

export function clearSceneAssets(): void {
  for (const url of Object.values(SCENE_ASSET_URLS)) clearSceneGLTF(url);
}
