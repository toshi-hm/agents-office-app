export { OfficeViewport } from './viewport/OfficeViewport.tsx';
export type { OfficeViewportProps } from './viewport/viewport-props.ts';
export type { CameraMode } from './camera/plan-goal.ts';
export type { SceneTheme } from './decor/palettes.ts';
export { buildOfficeLayout, getLayoutSignature, MAX_MEMBERS } from './layout/index.ts';
export { defaultLabelMode, shouldShowMemberLabel } from './scene-labels.ts';
export type { LabelMode } from './scene-labels.ts';
export { PROVIDER_COLORS } from './provider-colors.ts';
export { supportsWebGL2 } from './webgl.ts';
export type {
  OfficeLayout,
  SceneActivities,
  SceneMember,
  ScenePlacement,
  ScenePosition,
  SceneTeam,
  SceneZone,
} from './types.ts';
