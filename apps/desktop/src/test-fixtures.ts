import type {
  Agent,
  ApprovalRequest,
  ExecutionLog,
  OfficeSnapshot,
  Task,
  Team,
} from '@agents-office-app/domain';

const AT = '2026-11-26T10:00:00.000Z';

export const TEAMS: readonly Team[] = [
  { id: 'dev', name: '開発部', kind: 'department', color: '#5f8f6b', sortOrder: 1 },
  { id: 'exec', name: '経営', kind: 'executive', color: '#c58b4e', sortOrder: 0 },
];

export function agent(id: string, patch: Partial<Agent> = {}): Agent {
  return {
    id,
    displayName: `社員${id}`,
    role: 'employee',
    teamId: 'dev',
    teamName: '開発部',
    provider: 'demo',
    model: '',
    effort: 'medium',
    workspacePath: '/Users/someone/work',
    avatarColor: '#5f8f6b',
    statusNote: null,
    createdAt: AT,
    updatedAt: AT,
    ...patch,
  };
}

export function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    title: `仕事${id}`,
    prompt: 'やること',
    kind: 'task',
    status: 'running',
    agentId: 'a1',
    provider: 'demo',
    model: '',
    effort: 'medium',
    workspacePath: '/tmp/work',
    createdAt: AT,
    updatedAt: AT,
    completedAt: null,
    resultSummary: null,
    errorMessage: null,
    ...patch,
  };
}

export function approval(id: string, patch: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    id,
    executionId: 'e1',
    taskId: 't1',
    agentId: 'a1',
    toolName: 'Bash',
    summary: 'コマンドの実行',
    detail: 'git push',
    status: 'pending',
    decision: null,
    createdAt: AT,
    decidedAt: null,
    ...patch,
  };
}

export function log(id: number, patch: Partial<ExecutionLog> = {}): ExecutionLog {
  return {
    id,
    executionId: 'e1',
    taskId: 't1',
    agentId: 'a1',
    stream: 'stdout',
    text: `line ${id}`,
    timestamp: new Date(Date.parse(AT) + id * 1000).toISOString(),
    ...patch,
  };
}

export function snapshot(patch: Partial<OfficeSnapshot> = {}): OfficeSnapshot {
  return {
    observedAt: AT,
    health: {
      operatingState: 'normal',
      slotsUsed: 2,
      slotsTotal: 4,
      queuedTasks: 1,
      runningExecutions: 2,
      pendingApprovals: 0,
      externalSessionsCount: 0,
    },
    teams: TEAMS,
    agents: [
      agent('a1'),
      agent('p1', { role: 'president', teamId: 'exec', teamName: '経営', displayName: '社長さん' }),
    ],
    tasks: [],
    executions: [],
    approvals: [],
    externalSessions: [],
    agentActivities: { a1: 'working', p1: 'idle' },
    ...patch,
  };
}
