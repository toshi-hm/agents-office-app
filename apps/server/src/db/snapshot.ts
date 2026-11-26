import type { Database } from 'bun:sqlite';
import type { ApprovalRequest, Execution, ExternalSession, OfficeSnapshot, Task, Team } from '@agents-office-app/domain';
import { deriveAgentActivities, deriveOfficeHealth } from '@agents-office-app/domain';
import { agentQuery } from './agents.ts';
import { now } from './error.ts';
import { publicAgent, type AgentRow } from './mappers.ts';

export function buildOfficeSnapshot(sql: Database, externalSessions: readonly ExternalSession[]): OfficeSnapshot {
  const teams = sql.query<Team, []>('SELECT * FROM teams ORDER BY sortOrder').all();
  const agents = sql.query<AgentRow, []>(
    agentQuery + ' WHERE deletedAt IS NULL ORDER BY teams.sortOrder, agents.rowid',
  ).all().map(publicAgent);
  const tasks = sql.query<Task, []>('SELECT * FROM tasks ORDER BY createdAt DESC, rowid DESC').all();
  const executions = sql.query<Execution, []>('SELECT * FROM executions ORDER BY startedAt DESC, rowid DESC').all();
  const approvals = sql.query<ApprovalRequest, []>('SELECT * FROM approvals ORDER BY createdAt DESC, rowid DESC').all();
  return {
    observedAt: now(), agents, teams, tasks, executions, approvals, externalSessions,
    health: deriveOfficeHealth(tasks, executions, approvals, externalSessions),
    agentActivities: deriveAgentActivities(agents, executions, approvals, tasks, externalSessions),
  };
}
