import type {
  Agent,
  AgentActivity,
  ApprovalRequest,
  Execution,
  ExternalSession,
  OfficeHealth,
  Task,
} from './types.ts';
import { SLOT_COUNT } from './slot-ledger.ts';

const ACTIVE_EXECUTION_STATUSES = new Set<Execution['status']>([
  'reserved',
  'starting',
  'active',
  'waiting_approval',
  'stopping',
]);

export function deriveAgentActivities(
  agents: readonly Agent[],
  executions: readonly Execution[],
  approvals: readonly ApprovalRequest[],
  tasks: readonly Task[],
  externalSessions: readonly ExternalSession[],
): Readonly<Record<string, AgentActivity>> {
  const result: Record<string, AgentActivity> = {};
  const externalProviders = new Set(externalSessions.map((s) => s.provider));

  for (const agent of agents) {
    const hasPendingApproval = approvals.some(
      (a) => a.agentId === agent.id && a.status === 'pending',
    );
    if (hasPendingApproval) {
      result[agent.id] = 'waiting_approval';
      continue;
    }

    const activeExec = executions.find(
      (e) => e.agentId === agent.id && ACTIVE_EXECUTION_STATUSES.has(e.status),
    );
    if (activeExec) {
      if (activeExec.status === 'waiting_approval') {
        result[agent.id] = 'waiting_approval';
      } else if (activeExec.status === 'reserved' || activeExec.status === 'starting') {
        result[agent.id] = 'starting';
      } else {
        result[agent.id] = 'working';
      }
      continue;
    }

    const latestTask = tasks.find((t) => t.agentId === agent.id);
    if (latestTask && latestTask.status === 'failed') {
      const failedAt = Date.parse(latestTask.updatedAt);
      const recentError = Number.isFinite(failedAt) && Date.now() - failedAt < 5 * 60_000;
      if (recentError) {
        result[agent.id] = 'error';
        continue;
      }
    }

    if (agent.provider !== 'demo' && externalProviders.has(agent.provider)) {
      const matchingWorkspace = externalSessions.some(
        (s) =>
          s.provider === agent.provider &&
          (s.cwd === null || agent.workspacePath === '' || s.cwd.startsWith(agent.workspacePath)),
      );
      if (matchingWorkspace) {
        result[agent.id] = 'external';
        continue;
      }
    }

    result[agent.id] = 'idle';
  }

  return Object.freeze(result);
}

export function deriveOfficeHealth(
  tasks: readonly Task[],
  executions: readonly Execution[],
  approvals: readonly ApprovalRequest[],
  externalSessions: readonly ExternalSession[],
): OfficeHealth {
  const runningExecutions = executions.filter((e) =>
    ACTIVE_EXECUTION_STATUSES.has(e.status),
  ).length;
  const slotsUsed = Math.min(SLOT_COUNT, runningExecutions);
  const queuedTasks = tasks.filter((t) => t.status === 'queued').length;
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;

  return Object.freeze({
    operatingState: 'normal',
    slotsUsed,
    slotsTotal: SLOT_COUNT,
    queuedTasks,
    runningExecutions,
    pendingApprovals,
    externalSessionsCount: externalSessions.length,
  });
}
