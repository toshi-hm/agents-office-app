import { existsSync } from 'node:fs';
import type { Database } from 'bun:sqlite';
import type { Agent, CreateAgentInput, Team, UpdateAgentInput } from '@agents-office-app/domain';
import { OfficeError, now } from './error.ts';
import { publicAgent, type AgentRow } from './mappers.ts';

const resolveDefaultWorkspace = (): string => {
  const home = process.env.HOME;
  if (!home) return '/tmp';
  const workDir = `${home}/work`;
  return existsSync(workDir) ? workDir : home;
};

export const defaultWorkspace = resolveDefaultWorkspace();
export const agentQuery = 'SELECT agents.*, teams.name AS teamName FROM agents JOIN teams ON teams.id = agents.teamId';

export function createAgentQueries(sql: Database) {
  const team = (id: string) => sql.query<Team, [string]>('SELECT * FROM teams WHERE id = ?').get(id);
  const agent = (id: string) => sql.query<AgentRow, [string]>(
    agentQuery + ' WHERE agents.id = ? AND deletedAt IS NULL',
  ).get(id);
  function requireAgent(id: string) {
    const row = agent(id);
    if (!row) throw new OfficeError(404, 'Agent not found');
    return publicAgent(row);
  }

  function createAgent(input: CreateAgentInput, id = crypto.randomUUID() as string): Agent {
    const group = team(input.teamId);
    if (!group) throw new OfficeError(404, 'Team not found');
    const timestamp = now();
    sql.run(`INSERT INTO agents (id, displayName, role, teamId, provider, model, effort, workspacePath,
      avatarColor, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.displayName, input.role, input.teamId, input.provider, input.model ?? '', input.effort ?? 'medium',
      input.workspacePath ?? defaultWorkspace, input.avatarColor ?? group.color, timestamp, timestamp]);
    return requireAgent(id);
  }

  function updateAgent(id: string, input: UpdateAgentInput): Agent {
    const current = requireAgent(id);
    const next = { ...current, ...input };
    if (!team(next.teamId)) throw new OfficeError(404, 'Team not found');
    sql.run(`UPDATE agents SET displayName = ?, role = ?, teamId = ?, provider = ?, model = ?, effort = ?,
      workspacePath = ?, avatarColor = ?, statusNote = ?, updatedAt = ? WHERE id = ?`,
    [next.displayName, next.role, next.teamId, next.provider, next.model, next.effort, next.workspacePath,
      next.avatarColor, next.statusNote, now(), id]);
    return requireAgent(id);
  }

  function deleteAgent(id: string) {
    requireAgent(id);
    if (sql.query(`SELECT 1 FROM tasks WHERE agentId = ? AND status IN ('queued', 'running', 'waiting_approval')`).get(id)) {
      throw new OfficeError(409, 'Agent has unfinished tasks');
    }
    sql.run('UPDATE agents SET deletedAt = ? WHERE id = ?', [now(), id]);
  }

  return { createAgent, updateAgent, deleteAgent, requireAgent };
}
