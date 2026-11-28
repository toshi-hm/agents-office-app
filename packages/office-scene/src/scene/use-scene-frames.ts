import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { SceneTheme } from '../decor/palettes.ts';
import type { LabelMode } from '../scene-labels.ts';
import type { OfficeLayout, SceneActivities } from '../types.ts';

/** Status pulses do not need 60 fps; the office may stay on screen all day. */
const STATUS_FPS = 30;

export type SceneFramesInput = Readonly<{
  animated: boolean;
  onReady: (() => void) | undefined;
  /** A change to any of the following moves or redraws the HTML labels. */
  labelMode: LabelMode;
  selectedId: string | null;
  activities: SceneActivities;
  theme: SceneTheme;
  layout: OfficeLayout;
}>;

/** Decides when the demand-driven canvas renders and reports the first frame. */
export function useSceneFrames(input: SceneFramesInput): void {
  const { animated, onReady, labelMode, selectedId, activities, theme, layout } = input;
  const ready = useRef(false);
  const invalidate = useThree((state) => state.invalidate);

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
}
