import type { SceneMember, SceneTeam } from '../types.ts';
import {
  FALLBACK_TEAM_COLOR,
  MIN_ZONE_WIDTH,
  ROLE_ORDER,
  STATION_PITCH_X,
  STATION_PITCH_Z,
  ZONE_BACK_PADDING,
} from './constants.ts';
import { compareText } from './geometry.ts';
import { compareTeams } from './rank-department.ts';

export type ZoneDraft = {
  team: SceneTeam;
  members: SceneMember[];
  columns: number;
  rows: number;
  width: number;
  depth: number;
};

/** Columns used both for desks inside a zone and for zones inside the room. */
export function gridColumnCount(count: number): number {
  if (count <= 1) return 1;
  return count <= 6 ? 2 : 3;
}

/** Members per team; teams that only members mention are synthesised. */
function groupByTeam(members: readonly SceneMember[], teams: readonly SceneTeam[]) {
  const known = new Map<string, SceneTeam>(teams.map((team) => [team.id, team]));
  const grouped = new Map<string, SceneMember[]>(teams.map((team) => [team.id, []]));
  for (const member of members) {
    if (!known.has(member.teamId)) {
      known.set(member.teamId, {
        id: member.teamId,
        name: member.teamName,
        kind: member.role === 'president' ? 'executive' : 'department',
        color: FALLBACK_TEAM_COLOR,
        sortOrder: Number.MAX_SAFE_INTEGER,
      });
    }
    const group = grouped.get(member.teamId);
    if (group) group.push(member);
    else grouped.set(member.teamId, [member]);
  }
  return { known, grouped };
}

/** One sized, ordered zone per team, before the zones are placed in the room. */
export function draftZones(
  members: readonly SceneMember[],
  teams: readonly SceneTeam[],
): ZoneDraft[] {
  const { known, grouped } = groupByTeam(members, teams);
  return [...known.values()].sort(compareTeams).map((team) => {
    const roster = [...(grouped.get(team.id) ?? [])].sort(
      (left, right) =>
        ROLE_ORDER[left.role] - ROLE_ORDER[right.role] || compareText(left.id, right.id),
    );
    const columns = gridColumnCount(roster.length);
    const rows = Math.max(1, Math.ceil(roster.length / columns));
    return {
      team,
      members: roster,
      columns,
      rows,
      width: Math.max(MIN_ZONE_WIDTH, columns * STATION_PITCH_X + 0.2),
      depth: rows * STATION_PITCH_Z + ZONE_BACK_PADDING,
    };
  });
}
