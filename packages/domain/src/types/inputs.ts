import type { AgentRole, ProviderKind, ReasoningEffort } from './agent.ts';
import type { ApprovalDecision } from './execution.ts';
import type { TaskKind } from './task.ts';

export type CreateAgentInput = Readonly<{
  displayName: string;
  role: AgentRole;
  teamId: string;
  provider: ProviderKind;
  model?: string;
  effort?: ReasoningEffort;
  workspacePath?: string;
  avatarColor?: string;
}>;

export type UpdateAgentInput = Readonly<{
  displayName?: string;
  role?: AgentRole;
  teamId?: string;
  provider?: ProviderKind;
  model?: string;
  effort?: ReasoningEffort;
  workspacePath?: string;
  avatarColor?: string;
  statusNote?: string | null;
}>;

export type CreateTaskInput = Readonly<{
  title: string;
  prompt: string;
  kind?: TaskKind;
  agentId: string;
  provider?: ProviderKind;
  model?: string;
  effort?: ReasoningEffort;
  workspacePath?: string;
}>;

export type DecideApprovalInput = Readonly<{
  decision: ApprovalDecision;
}>;
