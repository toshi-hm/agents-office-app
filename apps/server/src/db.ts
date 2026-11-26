import { Database } from 'bun:sqlite';
import { deriveAgentActivities, deriveOfficeHealth } from '@agents-office-app/domain';
import type {
  Agent, ApprovalDecision, ApprovalRequest, CreateAgentInput, CreateTaskInput, Execution,
  ExecutionLog, ExternalSession, LogStream, OfficeSnapshot, Task, Team, UpdateAgentInput,
} from '@agents-office-app/domain';

export const defaultWorkspace = process.env.HOME ? `${process.env.HOME}/work` : '/tmp';
export const now = () => new Date().toISOString();
const activeStatuses = "'reserved', 'starting', 'active', 'waiting_approval', 'stopping'";
const agentQuery = 'SELECT agents.*, teams.name AS teamName FROM agents JOIN teams ON teams.id = agents.teamId';

export class OfficeError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export function openOfficeDb(path = ':memory:') {
  const sql = new Database(path, { strict: true });
  sql.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, color TEXT NOT NULL,
      sortOrder INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY, displayName TEXT NOT NULL, role TEXT NOT NULL,
      teamId TEXT NOT NULL REFERENCES teams(id), provider TEXT NOT NULL, model TEXT NOT NULL,
      effort TEXT NOT NULL, workspacePath TEXT NOT NULL, avatarColor TEXT NOT NULL,
      statusNote TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, prompt TEXT NOT NULL, kind TEXT NOT NULL,
      status TEXT NOT NULL, agentId TEXT NOT NULL REFERENCES agents(id), provider TEXT NOT NULL,
      model TEXT NOT NULL, effort TEXT NOT NULL, workspacePath TEXT NOT NULL, createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL, completedAt TEXT, resultSummary TEXT, errorMessage TEXT
    );
    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY, taskId TEXT NOT NULL REFERENCES tasks(id), agentId TEXT NOT NULL REFERENCES agents(id),
      slotNo INTEGER CHECK (slotNo BETWEEN 1 AND 4), provider TEXT NOT NULL, model TEXT NOT NULL,
      effort TEXT NOT NULL, pid INTEGER, status TEXT NOT NULL, workspacePath TEXT NOT NULL,
      startedAt TEXT NOT NULL, finishedAt TEXT, exitCode INTEGER, summary TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS executions_active_slot ON executions(slotNo) WHERE status IN (${activeStatuses});
    CREATE UNIQUE INDEX IF NOT EXISTS executions_active_agent ON executions(agentId) WHERE status IN (${activeStatuses});
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY, executionId TEXT NOT NULL REFERENCES executions(id),
      taskId TEXT NOT NULL REFERENCES tasks(id), agentId TEXT NOT NULL REFERENCES agents(id),
      toolName TEXT NOT NULL, summary TEXT NOT NULL, detail TEXT NOT NULL, status TEXT NOT NULL,
      decision TEXT, createdAt TEXT NOT NULL, decidedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS execution_logs (
      id INTEGER PRIMARY KEY, executionId TEXT NOT NULL REFERENCES executions(id),
      taskId TEXT NOT NULL REFERENCES tasks(id), agentId TEXT NOT NULL REFERENCES agents(id),
      stream TEXT NOT NULL, text TEXT NOT NULL, timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tasks_queue ON tasks(status, createdAt);
    CREATE INDEX IF NOT EXISTS logs_task ON execution_logs(taskId, id);
    CREATE INDEX IF NOT EXISTS logs_agent ON execution_logs(agentId, id);
    CREATE INDEX IF NOT EXISTS approvals_execution ON approvals(executionId, status);
  `);

  const team = (id: string) => sql.query<Team, [string]>('SELECT * FROM teams WHERE id = ?').get(id);
  const agent = (id: string) => sql.query<Agent & { deletedAt?: string }, [string]>(
    agentQuery + ' WHERE agents.id = ? AND deletedAt IS NULL',
  ).get(id);
  function publicAgent(row: NonNullable<ReturnType<typeof agent>>): Agent {
    const { deletedAt, ...result } = row;
    return result;
  }
  function requireAgent(id: string) {
    const row = agent(id);
    if (!row) throw new OfficeError(404, 'Agent not found');
    return publicAgent(row);
  }

  function createAgent(input: CreateAgentInput, id = crypto.randomUUID() as string): Agent {
    const group = team(input.teamId);
    if (!group) throw new OfficeError(404, 'Team not found');
    const timestamp = now();
    sql.run(`INSERT INTO agents (id, displayName, role, teamId, provider, model, effort, workspacePath,
      avatarColor, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.displayName, input.role, input.teamId, input.provider, input.model ?? '', input.effort ?? 'medium',
      input.workspacePath ?? defaultWorkspace, input.avatarColor ?? group.color, timestamp, timestamp]);
    return requireAgent(id);
  }

  sql.transaction(() => {
    if (sql.query('SELECT 1 FROM teams LIMIT 1').get()) return;
    const teams = [
      ['team-exec', '経営', 'executive', '#d97706'],
      ['team-dev', '開発部', 'department', '#2563eb'],
      ['team-note', 'note部', 'department', '#059669'],
      ['team-youtube', 'YouTube部', 'department', '#dc2626'],
    ];
    teams.forEach((group, index) => sql.run('INSERT INTO teams VALUES (?, ?, ?, ?, ?)', [...group, index]));
    const defaults = [
      ['agent-president', 'AI社長', 'team-exec', 'president', 'claude', 'claude-opus-4-6', 'high'],
      ['agent-dev-lead', '開発部長 (Codex)', 'team-dev', 'dept_manager', 'codex', 'gpt-5.4', 'high'],
      ['agent-dev-claude', 'Claude 開発担当', 'team-dev', 'employee', 'claude', 'claude-sonnet-4-6', 'medium'],
      ['agent-dev-agy', 'Agy 設計・検証担当', 'team-dev', 'employee', 'agy', 'gemini-pro', 'high'],
      ['agent-note-lead', 'note 編集長', 'team-note', 'dept_manager', 'claude', 'claude-sonnet-4-6', 'medium'],
      ['agent-yt-analyst', 'YouTube 分析担当', 'team-youtube', 'dept_manager', 'codex', 'gpt-5.4', 'medium'],
      ['agent-demo', 'デモ担当', 'team-dev', 'employee', 'demo', '', 'medium'],
    ] satisfies [string, string, string, Agent['role'], Agent['provider'], string, Agent['effort']][];
    for (const [id, displayName, teamId, role, provider, model, effort] of defaults) {
      createAgent({ displayName, teamId, role, provider, model, effort }, id);
    }
  }).immediate();

  function updateAgent(id: string, input: UpdateAgentInput): Agent {
    const current = requireAgent(id);
    const next = { ...current, ...input };
    if (!team(next.teamId)) throw new OfficeError(404, 'Team not found');
    sql.run(`UPDATE agents SET displayName = ?, role = ?, teamId = ?, provider = ?, model = ?, effort = ?,
      workspacePath = ?, avatarColor = ?, statusNote = ?, updatedAt = ? WHERE id = ?`,
    [next.displayName, next.role, next.teamId, next.provider, next.model, next.effort, next.workspacePath,
      next.avatarColor, next.statusNote, now(), id]);
    return requireAgent(id);
  }

  function deleteAgent(id: string) {
    requireAgent(id);
    if (sql.query(`SELECT 1 FROM tasks WHERE agentId = ? AND status IN ('queued', 'running', 'waiting_approval')`).get(id)) {
      throw new OfficeError(409, 'Agent has unfinished tasks');
    }
    sql.run('UPDATE agents SET deletedAt = ? WHERE id = ?', [now(), id]);
  }

  const getTask = (id: string) => sql.query<Task, [string]>('SELECT * FROM tasks WHERE id = ?').get(id);
  function requireTask(id: string) {
    const row = getTask(id);
    if (!row) throw new OfficeError(404, 'Task not found');
    return row;
  }
  function createTask(input: CreateTaskInput): Task {
    const assigned = requireAgent(input.agentId);
    const id = crypto.randomUUID();
    const timestamp = now();
    const provider = input.provider ?? assigned.provider;
    sql.run(`INSERT INTO tasks (id, title, prompt, kind, status, agentId, provider, model, effort, workspacePath,
      createdAt, updatedAt) VALUES (?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.title, input.prompt, input.kind ?? 'task', assigned.id, provider,
      input.model ?? (provider === assigned.provider ? assigned.model : ''), input.effort ?? assigned.effort,
      input.workspacePath ?? assigned.workspacePath, timestamp, timestamp]);
    return requireTask(id);
  }

  const listQueued = () => sql.query<Task, []>(
    "SELECT * FROM tasks WHERE status = 'queued' ORDER BY createdAt, rowid",
  ).all();
  const getExecution = (id: string) => sql.query<Execution, [string]>('SELECT * FROM executions WHERE id = ?').get(id)!;
  const getApproval = (id: string) => sql.query<ApprovalRequest, [string]>('SELECT * FROM approvals WHERE id = ?').get(id);
  function setTaskStatus(id: string, status: Task['status']) {
    sql.run('UPDATE tasks SET status = ?, updatedAt = ? WHERE id = ?', [status, now(), id]);
  }

  const beginExecution = sql.transaction((id: string, task: Task, slot: number) => {
    sql.run(`INSERT INTO executions (id, taskId, agentId, slotNo, provider, model, effort, status,
      workspacePath, startedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'starting', ?, ?)`,
    [id, task.id, task.agentId, slot, task.provider, task.model, task.effort, task.workspacePath, now()]);
    setTaskStatus(task.id, 'running');
    return getExecution(id);
  });

  function setExecutionStatus(id: string, status: Execution['status'], pid?: number) {
    if (pid !== undefined) sql.run('UPDATE executions SET status = ?, pid = ? WHERE id = ?', [status, pid, id]);
    else sql.run('UPDATE executions SET status = ? WHERE id = ?', [status, id]);
  }

  function finishTask(id: string, status: 'succeeded' | 'failed' | 'cancelled', summary: string | null) {
    const timestamp = now();
    sql.run(`UPDATE tasks SET status = ?, updatedAt = ?, completedAt = ?, resultSummary = ?, errorMessage = ?
      WHERE id = ?`, [status, timestamp, timestamp, status === 'succeeded' ? summary : null,
      status === 'failed' ? summary : null, id]);
    return requireTask(id);
  }

  const finishExecution = sql.transaction((execution: Execution, status: 'succeeded' | 'failed' | 'cancelled',
    summary: string | null, exitCode: number | null) => {
    const timestamp = now();
    sql.run('UPDATE executions SET status = ?, finishedAt = ?, summary = ?, exitCode = ? WHERE id = ?',
      [status, timestamp, summary, exitCode, execution.id]);
    const approvals = sql.query<ApprovalRequest, [string, string]>(`UPDATE approvals SET status = 'expired',
      decidedAt = ? WHERE executionId = ? AND status = 'pending' RETURNING *`).all(timestamp, execution.id);
    return { task: finishTask(execution.taskId, status, summary), approvals };
  });

  const recover = sql.transaction(() => {
    const stale = sql.query<Execution, []>(`SELECT * FROM executions WHERE status IN (${activeStatuses})`).all();
    for (const execution of stale) finishExecution(execution, 'failed', 'server_restarted', null);
  });

  const requestApproval = sql.transaction((execution: Execution) => {
    const id = crypto.randomUUID();
    sql.run(`INSERT INTO approvals (id, executionId, taskId, agentId, toolName, summary, detail, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [id, execution.id, execution.taskId, execution.agentId, 'demo.publish', 'デモ成果物の公開',
      'シミュレーション内で成果物の公開を承認してください。', now()]);
    setExecutionStatus(execution.id, 'waiting_approval');
    setTaskStatus(execution.taskId, 'waiting_approval');
    return getApproval(id)!;
  });

  const decideApproval = sql.transaction((id: string, decision: ApprovalDecision) => {
    const current = getApproval(id);
    if (!current) throw new OfficeError(404, 'Approval not found');
    if (current.status !== 'pending' || getExecution(current.executionId).status !== 'waiting_approval') {
      throw new OfficeError(409, 'Approval is no longer pending');
    }
    sql.run('UPDATE approvals SET status = ?, decision = ?, decidedAt = ? WHERE id = ?',
      [decision === 'allow' ? 'approved' : 'rejected', decision, now(), id]);
    setExecutionStatus(current.executionId, 'active');
    setTaskStatus(current.taskId, 'running');
    return getApproval(id)!;
  });

  function appendLog(execution: Execution, stream: LogStream, value: string) {
    return sql.query<ExecutionLog, [string, string, string, LogStream, string, string]>(
      `INSERT INTO execution_logs (executionId, taskId, agentId, stream, text, timestamp)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
    ).get(execution.id, execution.taskId, execution.agentId, stream, value, now())!;
  }

  function listLogs(scope: 'task' | 'agent', id: string, limit = 200) {
    if (scope === 'task') requireTask(id);
    else requireAgent(id);
    const column = scope === 'task' ? 'taskId' : 'agentId';
    return sql.query<ExecutionLog, [string, number]>(
      `SELECT * FROM execution_logs WHERE ${column} = ? ORDER BY id DESC LIMIT ?`,
    ).all(id, limit).reverse();
  }

  function snapshot(externalSessions: readonly ExternalSession[] = []): OfficeSnapshot {
    const teams = sql.query<Team, []>('SELECT * FROM teams ORDER BY sortOrder').all();
    const agents = sql.query<NonNullable<ReturnType<typeof agent>>, []>(
      agentQuery + ' WHERE deletedAt IS NULL ORDER BY teams.sortOrder, agents.rowid',
    ).all().map(publicAgent);
    const tasks = sql.query<Task, []>('SELECT * FROM tasks ORDER BY createdAt DESC, rowid DESC').all();
    const executions = sql.query<Execution, []>('SELECT * FROM executions ORDER BY startedAt DESC, rowid DESC').all();
    const approvals = sql.query<ApprovalRequest, []>('SELECT * FROM approvals ORDER BY createdAt DESC, rowid DESC').all();
    return {
      observedAt: now(), agents, teams, tasks, executions, approvals, externalSessions,
      health: deriveOfficeHealth(tasks, executions, approvals, externalSessions),
      agentActivities: deriveAgentActivities(agents, executions, approvals, tasks, externalSessions),
    };
  }

  return {
    sql, close: () => sql.close(), createAgent, updateAgent, deleteAgent, requireAgent, createTask,
    requireTask, listQueued, beginExecution, setExecutionStatus, finishExecution, finishTask, recover,
    requestApproval, decideApproval, appendLog, listLogs, snapshot,
  };
}

export type OfficeDb = ReturnType<typeof openOfficeDb>;
