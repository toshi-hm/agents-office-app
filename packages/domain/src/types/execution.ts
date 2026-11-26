import type { ProviderKind, ReasoningEffort } from './agent.ts';

export type ExecutionStatus =
  | 'reserved'
  | 'starting'
  | 'active'
  | 'waiting_approval'
  | 'stopping'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type ApprovalDecision = 'allow' | 'deny';

export type LogStream = 'stdout' | 'stderr' | 'system';

export type Execution = Readonly<{
  id: string;
  taskId: string;
  agentId: string;
  slotNo: number | null;
  provider: ProviderKind;
  model: string;
  effort: ReasoningEffort;
  pid: number | null;
  status: ExecutionStatus;
  workspacePath: string;
  startedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  summary: string | null;
}>;

export type ApprovalRequest = Readonly<{
  id: string;
  executionId: string;
  taskId: string;
  agentId: string;
  toolName: string;
  summary: string;
  detail: string;
  status: ApprovalStatus;
  decision: ApprovalDecision | null;
  createdAt: string;
  decidedAt: string | null;
}>;

export type ExecutionLog = Readonly<{
  id: number;
  executionId: string;
  taskId: string;
  agentId: string;
  stream: LogStream;
  text: string;
  timestamp: string;
}>;

export type ExternalSession = Readonly<{
  pid: number;
  provider: Exclude<ProviderKind, 'demo'>;
  command: string;
  cwd: string | null;
  observedAt: string;
}>;
