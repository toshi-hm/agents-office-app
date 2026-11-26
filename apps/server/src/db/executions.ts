import type { Database } from 'bun:sqlite';
import type { Execution, Task } from '@agents-office-app/domain';
import { now } from './error.ts';
import { expireApprovals } from './expire-approvals.ts';
import { activeStatuses } from './schema.ts';
import type { createTaskQueries } from './tasks.ts';

export function createExecutionQueries(
  sql: Database,
  { setTaskStatus, finishTask }: Pick<ReturnType<typeof createTaskQueries>, 'setTaskStatus' | 'finishTask'>,
) {
  const getExecution = (id: string) => sql.query<Execution, [string]>('SELECT * FROM executions WHERE id = ?').get(id)!;

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

  const finishExecution = sql.transaction((execution: Execution, status: 'succeeded' | 'failed' | 'cancelled',
    summary: string | null, exitCode: number | null) => {
    const timestamp = now();
    sql.run('UPDATE executions SET status = ?, finishedAt = ?, summary = ?, exitCode = ? WHERE id = ?',
      [status, timestamp, summary, exitCode, execution.id]);
    const approvals = expireApprovals(sql, execution.id, timestamp);
    return { task: finishTask(execution.taskId, status, summary), approvals };
  });

  const recover = sql.transaction(() => {
    const stale = sql.query<Execution, []>(`SELECT * FROM executions WHERE status IN (${activeStatuses})`).all();
    for (const execution of stale) finishExecution(execution, 'failed', 'server_restarted', null);
  });

  return { getExecution, beginExecution, setExecutionStatus, finishExecution, recover };
}
