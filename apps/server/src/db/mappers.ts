import type { Agent } from '@agents-office-app/domain';

export type AgentRow = Agent & { deletedAt?: string | null };

export function publicAgent(row: AgentRow): Agent {
  const { deletedAt, ...result } = row;
  return result;
}
