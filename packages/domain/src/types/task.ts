import type { ProviderKind, ReasoningEffort } from './agent.ts';

export type TaskKind = 'task' | 'consultation' | 'proposal';

export type TaskStatus =
  | 'queued'
  | 'running'
  | 'waiting_approval'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type Task = Readonly<{
  id: string;
  title: string;
  prompt: string;
  kind: TaskKind;
  status: TaskStatus;
  agentId: string;
  provider: ProviderKind;
  model: string;
  effort: ReasoningEffort;
  workspacePath: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  resultSummary: string | null;
  errorMessage: string | null;
}>;
