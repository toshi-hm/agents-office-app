import type { SceneTeam } from '../types.ts';
import { compareText } from './geometry.ts';

/** Preferred order of the well-known departments, used when sortOrder ties. */
export function departmentRank(name: string): number {
  const normalized = name.trim().toLowerCase();
  if (normalized === '経営' || normalized === 'executive') return 0;
  if (['開発', '開発部', 'development'].includes(normalized)) return 1;
  if (['note', 'note部'].includes(normalized)) return 2;
  if (['youtube', 'youtube部'].includes(normalized)) return 3;
  return 4;
}

export function compareTeams(left: SceneTeam, right: SceneTeam): number {
  const kind = (team: SceneTeam) => (team.kind === 'executive' ? 0 : 1);
  return (
    kind(left) - kind(right) ||
    left.sortOrder - right.sortOrder ||
    departmentRank(left.name) - departmentRank(right.name) ||
    compareText(left.id, right.id)
  );
}
