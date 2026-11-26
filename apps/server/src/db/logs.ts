import type { Database } from 'bun:sqlite';
import type { Agent, Execution, ExecutionLog, LogStream, Task } from '@agents-office-app/domain';
import { now } from './error.ts';

export function createLogQueries(sql: Database, requireTask: (id: string) => Task, requireAgent: (id: string) => Agent) {
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

  return { appendLog, listLogs };
}
