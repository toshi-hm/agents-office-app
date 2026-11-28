import { SLOT_COUNT } from '../slots/index.ts';
import type { ApprovalRequest, Execution, ExternalSession, OfficeHealth, Task } from '../types/index.ts';
import { ACTIVE_EXECUTION_STATUSES } from './active-statuses.ts';

export function deriveOfficeHealth(
  tasks: readonly Task[],
  executions: readonly Execution[],
  approvals: readonly ApprovalRequest[],
  externalSessions: readonly ExternalSession[],
): OfficeHealth {
  const runningExecutions = executions.filter((e) =>
    ACTIVE_EXECUTION_STATUSES.has(e.status),
  ).length;

  return Object.freeze({
    operatingState: 'normal',
    slotsUsed: Math.min(SLOT_COUNT, runningExecutions),
    slotsTotal: SLOT_COUNT,
    queuedTasks: tasks.filter((t) => t.status === 'queued').length,
    runningExecutions,
    pendingApprovals: approvals.filter((a) => a.status === 'pending').length,
    externalSessionsCount: externalSessions.length,
  });
}
