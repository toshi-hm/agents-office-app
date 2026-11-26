import type { Agent, AgentActivity, Team } from '@agents-office-app/domain';

/** The identity fields the diorama needs. A domain `Agent` satisfies this as-is. */
export type SceneMember = Pick<
  Agent,
  'id' | 'displayName' | 'role' | 'teamId' | 'teamName' | 'provider' | 'avatarColor'
>;

/** A domain `Team` satisfies this as-is. */
export type SceneTeam = Pick<Team, 'id' | 'name' | 'kind' | 'color' | 'sortOrder'>;

/** Same shape as `OfficeSnapshot.agentActivities`. */
export type SceneActivities = Readonly<Record<string, AgentActivity>>;

export type ScenePosition = readonly [x: number, y: number, z: number];

export type ScenePlacement = Readonly<{
  member: SceneMember;
  /** Where the character stands while it has nothing to do. */
  position: ScenePosition;
  deskPosition: ScenePosition;
  chairPosition: ScenePosition;
  /** Extra nameplate height, used to stagger neighbouring labels. */
  labelLift: number;
}>;

export type SceneZone = Readonly<{
  teamId: string;
  teamName: string;
  color: string;
  kind: Team['kind'];
  center: ScenePosition;
  width: number;
  depth: number;
  labelPosition: ScenePosition;
}>;

export type SceneDecor = Readonly<{
  kind: 'bookcase' | 'plant' | 'lamp';
  position: ScenePosition;
  rotationY: number;
}>;

export type OfficeLayout = Readonly<{
  members: readonly ScenePlacement[];
  zones: readonly SceneZone[];
  decor: readonly SceneDecor[];
  floor: Readonly<{
    width: number;
    depth: number;
    center: ScenePosition;
  }>;
  wallHeight: number;
}>;
