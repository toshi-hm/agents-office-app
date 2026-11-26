import { useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { OfficeLayout, ScenePosition } from '../types.ts';
import { getOverviewView } from './overview-framing.ts';
import { planCameraGoal } from './plan-goal.ts';
import type { CameraMode, CameraRequest } from './plan-goal.ts';
import type { CameraMotion } from './use-camera-motion.ts';

/** Turns mode, focus and size changes into camera jumps or glides. */
export function useCameraRequests(
  motion: CameraMotion,
  options: Readonly<{
    layout: OfficeLayout;
    mode: CameraMode;
    focusPoint: ScenePosition | null;
    sequence: number;
    compact: boolean;
    reducedMotion: boolean;
    aspect: number;
  }>,
): void {
  const { layout, mode, focusPoint, sequence, compact, reducedMotion, aspect } = options;
  const { goal, snap, invalidate, current } = motion;
  const size = useThree((state) => state.size);
  const applied = useRef<CameraRequest | null>(null);
  const focusKey = focusPoint?.join(',') ?? '';

  useLayoutEffect(() => {
    const previous = applied.current;
    const request = { mode, sequence, focus: focusPoint };
    applied.current = request;
    if (mode === 'manual') {
      goal.current = null;
      return;
    }
    const next = planCameraGoal({ previous, request, layout, aspect, compact, current });
    // The first frame and reduced motion jump; everything else glides.
    if (!previous || reducedMotion) {
      goal.current = null;
      snap(next);
    } else {
      goal.current = next;
      invalidate();
    }
    // `focusKey` stands in for the focusPoint tuple, whose identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sequence, focusKey, layout, compact, aspect, reducedMotion, snap]);

  // A resize should reframe immediately rather than glide from a stale framing.
  useLayoutEffect(() => {
    if (applied.current?.mode !== 'overview') return;
    goal.current = null;
    snap(getOverviewView(layout, aspect, compact));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);
}
