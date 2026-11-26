import type { Agent, AgentRole, Team } from '@agents-office-app/domain';

export type TeamGroup = Readonly<{ team: Team; agents: readonly Agent[] }>;

const ROLE_ORDER: Readonly<Record<AgentRole, number>> = {
  president: 0,
  dept_manager: 1,
  employee: 2,
};

export function groupAgentsByTeam(
  teams: readonly Team[],
  agents: readonly Agent[],
): readonly TeamGroup[] {
  const ordered = [...teams].sort((a, b) => a.sortOrder - b.sortOrder);
  const known = new Set(ordered.map((team) => team.id));
  for (const agent of agents) {
    if (known.has(agent.teamId)) continue;
    known.add(agent.teamId);
    ordered.push({
      id: agent.teamId,
      name: agent.teamName,
      kind: 'department',
      color: agent.avatarColor,
      sortOrder: Number.MAX_SAFE_INTEGER,
    });
  }
  return ordered.map((team) => ({
    team,
    agents: agents
      .filter((agent) => agent.teamId === team.id)
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]),
  }));
}

/** New work goes to the selected agent, otherwise to the president. */
export function getDefaultTargetAgentId(
  agents: readonly Agent[],
  selectedId: string | null,
): string {
  if (selectedId && agents.some((agent) => agent.id === selectedId)) return selectedId;
  return (agents.find((agent) => agent.role === 'president') ?? agents[0])?.id ?? '';
}
