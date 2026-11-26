import { TeamLabels } from '../OfficeLabels.tsx';
import type { SceneTheme } from '../decor/palettes.ts';
import { RoomDecor } from '../decor/RoomDecor.tsx';
import { isAnimatedActivity } from '../motion/seating-rules.ts';
import { shouldShowMemberLabel } from '../scene-labels.ts';
import type { LabelMode } from '../scene-labels.ts';
import { MemberStation } from '../station/MemberStation.tsx';
import type { OfficeLayout, SceneActivities } from '../types.ts';
import { SceneLights } from './SceneLights.tsx';
import { useSceneFrames } from './use-scene-frames.ts';

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

export function OfficeScene(props: OfficeSceneProps) {
  const { layout, activities, selectedId, labelMode, compact, reducedMotion, theme } = props;
  const animated =
    !reducedMotion &&
    layout.members.some(({ member }) => isAnimatedActivity(activities[member.id] ?? 'idle'));
  useSceneFrames({ ...props, animated, onReady: props.onReady });

  return (
    <group>
      <SceneLights floor={layout.floor} dark={theme === 'dark'} />
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
            onSelect={props.onSelect}
          />
        );
      })}
    </group>
  );
}
