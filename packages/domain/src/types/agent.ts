export type ProviderKind = 'claude' | 'codex' | 'agy' | 'demo';

export type AgentRole = 'president' | 'dept_manager' | 'employee';

export type TeamKind = 'executive' | 'department';

export type ReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh';

export type AgentActivity =
  | 'idle'
  | 'starting'
  | 'working'
  | 'waiting_approval'
  | 'error'
  | 'external';

export type WindowMode = 'full' | 'mini';

export type Team = Readonly<{
  id: string;
  name: string;
  kind: TeamKind;
  color: string;
  sortOrder: number;
}>;

export type Agent = Readonly<{
  id: string;
  displayName: string;
  role: AgentRole;
  teamId: string;
  teamName: string;
  provider: ProviderKind;
  model: string;
  effort: ReasoningEffort;
  workspacePath: string;
  avatarColor: string;
  statusNote: string | null;
  createdAt: string;
  updatedAt: string;
}>;
