import type { SceneMember, SceneTeam } from '../types.ts';

/** Stable key of everything that affects geometry, for memoising across snapshot refreshes. */
export function getLayoutSignature(
  members: readonly SceneMember[],
  teams: readonly SceneTeam[] = [],
): string {
  return JSON.stringify([
    members.map((m) => [
      m.id,
      m.displayName,
      m.role,
      m.teamId,
      m.teamName,
      m.provider,
      m.avatarColor,
    ]),
    teams.map((t) => [t.id, t.name, t.kind, t.color, t.sortOrder]),
  ]);
}
