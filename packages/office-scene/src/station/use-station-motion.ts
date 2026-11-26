import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import type { AgentActivity } from '@agents-office-app/domain';
import { sampleActivityEffect } from '../motion/activity-effect.ts';
import { advanceMemberMotion } from '../motion/advance-motion.ts';
import type { MemberPose } from '../motion/prepare-pose.ts';
import { sampleMemberMotion } from '../motion/sample-motion.ts';
import { isSeatedActivity } from '../motion/seating-rules.ts';
import type { ScenePlacement } from '../types.ts';
import { animateBeacon, animatePulseRing } from './animate-effects.ts';

/** Walks, seats and animates one member; returns the refs of the objects it drives. */
export function useStationMotion(options: {
  placement: ScenePlacement;
  activity: AgentActivity;
  selected: boolean;
  reducedMotion: boolean;
  pose: MemberPose;
}) {
  const { placement, activity, selected, reducedMotion, pose } = options;
  const { id } = placement.member;
  const seated = isSeatedActivity(activity);
  // Agents already busy when the office opens start at their desk; later changes walk.
  const progress = useRef(seated ? 1 : 0);
  const figure = useRef<Group>(null);
  const footing = useRef<Group>(null);
  const beacon = useRef<Group>(null);
  const pulseRing = useRef<Mesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const phase = useMemo(
    () => [...id].reduce((total, char) => total + char.charCodeAt(0), 0) % 7,
    [id],
  );

  useLayoutEffect(() => invalidate(), [invalidate, activity, reducedMotion, placement, selected]);

  useFrame(({ clock }, delta) => {
    const character = figure.current;
    if (!character) return;
    const goal = seated ? 1 : 0;
    // A demand-driven canvas can report a long first delta; clamp it so nobody teleports.
    const step = Math.min(delta, 0.05);
    progress.current = advanceMemberMotion(progress.current, seated, reducedMotion, step);
    const motion = sampleMemberMotion(placement, progress.current);
    const effect = sampleActivityEffect(activity, clock.elapsedTime, reducedMotion, phase);
    const atDesk = progress.current === 1;

    character.position.set(motion.x, motion.y + (atDesk ? effect.bob : 0), motion.z);
    character.rotation.y = motion.heading === null ? 0 : motion.heading - pose.heading;
    pose.apply(motion.seat, motion.stride, atDesk ? effect.typing : 0);
    footing.current?.position.set(motion.x, 0, motion.z);

    if (beacon.current) {
      animateBeacon(beacon.current, motion, effect, clock.elapsedTime, reducedMotion);
    }
    if (pulseRing.current) animatePulseRing(pulseRing.current, effect);
    if (progress.current !== goal) invalidate();
  });

  return { figure, footing, beacon, pulseRing };
}
