import type { AgentActivity } from '@agents-office-app/domain';
import { MemberLabel } from '../OfficeLabels.tsx';
import { sampleActivityEffect } from '../motion/activity-effect.ts';
import { getDestination, isSeatedActivity } from '../motion/seating-rules.ts';
import type { ScenePlacement } from '../types.ts';
import { ActivityBeacon } from './ActivityBeacon.tsx';
import { AnimatedCharacter } from './AnimatedCharacter.tsx';
import { DeskSetup } from './DeskSetup.tsx';
import { getLabelHeight, isAlert } from './label-height.ts';
import { StatusRing } from './StatusRing.tsx';
import { useCharacter } from './use-character.ts';
import { useStationMotion } from './use-station-motion.ts';
import { useStationPointer } from './use-station-pointer.ts';

export type MemberStationProps = Readonly<{
  placement: ScenePlacement;
  activity: AgentActivity;
  selected: boolean;
  showLabel: boolean;
  compact: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}>;

/** One member's desk, figure, floor markers and nameplate. */
export function MemberStation(props: MemberStationProps) {
  const { placement, activity, selected, onSelect } = props;
  const { member } = placement;
  const { model, pose } = useCharacter(member.avatarColor);
  const refs = useStationMotion({ ...props, pose });
  const pointer = useStationPointer(member.id, onSelect);
  const { beacon, screenGlow } = sampleActivityEffect(activity, 0, true);
  const destination = getDestination(placement, activity);
  const labelHeight = getLabelHeight(
    isSeatedActivity(activity),
    placement.labelLift,
    isAlert(beacon),
  );

  return (
    <group name={`office-member-${member.id}`} {...pointer}>
      <DeskSetup placement={placement} screenGlow={screenGlow} />
      <StatusRing
        ref={refs.footing}
        pulseRef={refs.pulseRing}
        position={destination}
        member={member}
        selected={selected}
        beacon={beacon}
      />
      {isAlert(beacon) && (
        <ActivityBeacon ref={refs.beacon} kind={beacon} destination={destination} />
      )}
      <AnimatedCharacter
        ref={refs.figure}
        memberId={member.id}
        position={destination}
        model={model}
      />
      <MemberLabel
        visible={props.showLabel}
        position={[destination[0], labelHeight, destination[2]]}
        member={member}
        activity={activity}
        selected={selected}
        compact={props.compact}
        onSelect={onSelect}
      />
    </group>
  );
}
