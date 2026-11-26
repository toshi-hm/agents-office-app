import type { SceneMember, SceneTeam } from './types.ts';

export const TEAMS: readonly SceneTeam[] = [
  { id: 'exec', name: '経営', kind: 'executive', color: '#c58b4e', sortOrder: 0 },
  { id: 'dev', name: '開発部', kind: 'department', color: '#5f8f6b', sortOrder: 1 },
  { id: 'note', name: 'note部', kind: 'department', color: '#4f9d9a', sortOrder: 2 },
  { id: 'youtube', name: 'YouTube部', kind: 'department', color: '#c9605a', sortOrder: 3 },
];

export function member(
  id: string,
  teamId: string,
  role: SceneMember['role'] = 'employee',
): SceneMember {
  return {
    id,
    displayName: `社員${id}`,
    role,
    teamId,
    teamName: TEAMS.find((team) => team.id === teamId)?.name ?? teamId,
    provider: 'demo',
    avatarColor: '#88aa77',
  };
}

export const ROSTER: readonly SceneMember[] = [
  member('yt1', 'youtube'),
  member('dev2', 'dev'),
  member('dev1', 'dev', 'dept_manager'),
  member('ceo', 'exec', 'president'),
  member('note1', 'note', 'dept_manager'),
  member('dev3', 'dev'),
];
