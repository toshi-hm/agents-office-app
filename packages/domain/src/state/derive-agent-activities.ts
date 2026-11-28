import type {
  Agent,
  AgentActivity,
  ApprovalRequest,
  Execution,
  ExternalSession,
  Task,
} from '../types/index.ts';
import { ACTIVE_EXECUTION_STATUSES } from './active-statuses.ts';
import { matchExternalSessions } from './match-external-sessions.ts';

const RECENT_ERROR_WINDOW_MS = 5 * 60_000;

export function deriveAgentActivities(
  agents: readonly Agent[],
  executions: readonly Execution[],
  approvals: readonly ApprovalRequest[],
  tasks: readonly Task[],
  externalSessions: readonly ExternalSession[],
): Readonly<Record<string, AgentActivity>> {
  const result: Record<string, AgentActivity> = {};
  const idleCandidates: Agent[] = [];

  for (const agent of agents) {
    if (approvals.some((a) => a.agentId === agent.id && a.status === 'pending')) {
      result[agent.id] = 'waiting_approval';
      continue;
    }

    const activeExec = executions.find(
      (e) => e.agentId === agent.id && ACTIVE_EXECUTION_STATUSES.has(e.status),
    );
    if (activeExec) {
      result[agent.id] =
        activeExec.status === 'waiting_approval'
          ? 'waiting_approval'
          : activeExec.status === 'reserved' || activeExec.status === 'starting'
            ? 'starting'
            : 'working';
      continue;
    }

    const latestTask = tasks.find((t) => t.agentId === agent.id);
    if (latestTask?.status === 'failed') {
      const failedAt = Date.parse(latestTask.updatedAt);
      if (Number.isFinite(failedAt) && Date.now() - failedAt < RECENT_ERROR_WINDOW_MS) {
        result[agent.id] = 'error';
        continue;
      }
    }

    result[agent.id] = 'idle';
    if (agent.provider !== 'demo') idleCandidates.push(agent);
  }

  for (const agentId of matchExternalSessions(idleCandidates, externalSessions)) {
    result[agentId] = 'external';
  }

  return Object.freeze(result);
}
