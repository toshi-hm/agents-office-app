import type { SceneTheme } from '../decor/palettes.ts';
import type { LabelMode } from '../scene-labels.ts';
import type { SceneActivities, SceneMember, SceneTeam } from '../types.ts';

export const NO_ACTIVITIES: SceneActivities = Object.freeze({});
export const NO_TEAMS: readonly SceneTeam[] = Object.freeze([]);

export type OfficeViewportProps = Readonly<{
  members: readonly SceneMember[];
  teams?: readonly SceneTeam[] | undefined;
  activities?: SceneActivities | undefined;
  selectedId: string | null;
  /** `null` means the selection was cleared by clicking empty floor. */
  onSelect: (id: string | null) => void;
  /** Mini Office: full-bleed diorama with tighter framing and no floating controls. */
  compact?: boolean | undefined;
  theme?: SceneTheme | undefined;
  /** Controlled nameplate mode. Defaults to all (full) or selected/active only (compact). */
  labelMode?: LabelMode | undefined;
  onLabelModeChange?: ((mode: LabelMode) => void) | undefined;
  graphicsEnabled?: boolean | undefined;
}>;
