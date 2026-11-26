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

export type TaskKind = 'task' | 'consultation' | 'proposal';

export type TaskStatus =
  | 'queued'
  | 'running'
  | 'waiting_approval'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

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

export type OfficeSseEvent =
  | Readonly<{ type: 'snapshot'; snapshot: OfficeSnapshot }>
  | Readonly<{ type: 'log'; log: ExecutionLog }>
  | Readonly<{ type: 'approval_requested'; approval: ApprovalRequest }>
  | Readonly<{ type: 'approval_decided'; approval: ApprovalRequest }>
  | Readonly<{ type: 'task_finished'; task: Task }>
  | Readonly<{ type: 'heartbeat'; timestamp: string }>;

export const PROVIDER_LABELS: Readonly<Record<ProviderKind, string>> = Object.freeze({
  claude: 'Claude Code',
  codex: 'Codex',
  agy: 'Antigravity',
  demo: 'Demo Sim',
});

export const ROLE_LABELS: Readonly<Record<AgentRole, string>> = Object.freeze({
  president: '社長',
  dept_manager: '部長',
  employee: '社員',
});

export const ACTIVITY_LABELS: Readonly<Record<AgentActivity, string>> = Object.freeze({
  idle: '待機中',
  starting: '起動中',
  working: '作業中',
  waiting_approval: '承認待ち',
  error: 'エラー',
  external: '外部稼働中',
});

export const TASK_STATUS_LABELS: Readonly<Record<TaskStatus, string>> = Object.freeze({
  queued: '待機中',
  running: '実行中',
  waiting_approval: '承認待ち',
  succeeded: '完了',
  failed: '失敗',
  cancelled: '停止済み',
});
