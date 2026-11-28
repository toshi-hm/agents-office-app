import type { SceneMember, ScenePosition } from '../types.ts';

export const MAX_MEMBERS = 100;
export const STATION_PITCH_X = 2.15;
export const STATION_PITCH_Z = 2.05;
/** Chair centre relative to the desk centre. The character faces -Z, towards the desk. */
export const CHAIR_OFFSET: ScenePosition = [0, 0, 0.62];
/** Standing spot relative to the desk centre: beside the chair, never inside furniture. */
export const STAND_OFFSET: ScenePosition = [-0.84, 0, 0.7];
export const WALL_HEIGHT = 1.2;

export const MIN_ZONE_WIDTH = 2.7;
export const ZONE_BACK_PADDING = 0.34;
export const ZONE_GAP = 0.34;
export const SIDE_MARGIN = 0.72;
/** Room behind the back row for bookcases and the team signs. */
export const BACK_MARGIN = 0.82;
export const FRONT_MARGIN = 0.56;
export const MIN_FLOOR_WIDTH = 6.4;
export const MIN_FLOOR_DEPTH = 5.4;
export const FALLBACK_TEAM_COLOR = '#8a9a7b';

export const ROLE_ORDER: Readonly<Record<SceneMember['role'], number>> = {
  president: 0,
  dept_manager: 1,
  employee: 2,
};
