import type { Database } from 'bun:sqlite';
import type { Agent, CreateTaskInput, Task } from '@agents-office-app/domain';
import { OfficeError, now } from './error.ts';

export function createTaskQueries(sql: Database, requireAgent: (id: string) => Agent) {
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

  function setTaskStatus(id: string, status: Task['status']) {
    sql.run('UPDATE tasks SET status = ?, updatedAt = ? WHERE id = ?', [status, now(), id]);
  }

  function finishTask(id: string, status: 'succeeded' | 'failed' | 'cancelled', summary: string | null) {
    const timestamp = now();
    sql.run(`UPDATE tasks SET status = ?, updatedAt = ?, completedAt = ?, resultSummary = ?, errorMessage = ?
      WHERE id = ?`, [status, timestamp, timestamp, status === 'succeeded' ? summary : null,
      status === 'failed' ? summary : null, id]);
    return requireTask(id);
  }

  return { createTask, requireTask, listQueued, setTaskStatus, finishTask };
}
