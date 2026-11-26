import type { Agent, AgentActivity, Team } from './agent.ts';
import type { ApprovalRequest, Execution, ExternalSession } from './execution.ts';
import type { Task } from './task.ts';

export type OfficeHealth = Readonly<{
  operatingState: 'normal' | 'degraded';
  slotsUsed: number;
  slotsTotal: 4;
  queuedTasks: number;
  runningExecutions: number;
  pendingApprovals: number;
  externalSessionsCount: number;
}>;

export type OfficeSnapshot = Readonly<{
  observedAt: string;
  health: OfficeHealth;
  teams: readonly Team[];
  agents: readonly Agent[];
  tasks: readonly Task[];
  executions: readonly Execution[];
  approvals: readonly ApprovalRequest[];
  externalSessions: readonly ExternalSession[];
  agentActivities: Readonly<Record<string, AgentActivity>>;
}>;
