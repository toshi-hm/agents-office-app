import { Database } from 'bun:sqlite';
import type { ExternalSession } from '@agents-office-app/domain';
import { createAgentQueries } from './agents.ts';
import { createApprovalQueries } from './approvals.ts';
import { createExecutionQueries } from './executions.ts';
import { createLogQueries } from './logs.ts';
import { initializeSchema } from './schema.ts';
import { seedDefaultOffice } from './seed.ts';
import { buildOfficeSnapshot } from './snapshot.ts';
import { createTaskQueries } from './tasks.ts';

export function openOfficeDb(path = ':memory:') {
  const sql = new Database(path, { strict: true });
  initializeSchema(sql);

  const { createAgent, updateAgent, deleteAgent, requireAgent } = createAgentQueries(sql);
  seedDefaultOffice(sql, createAgent);
  const tasks = createTaskQueries(sql, requireAgent);
  const { createTask, requireTask, listQueued, finishTask, setTaskStatus } = tasks;
  const executions = createExecutionQueries(sql, tasks);
  const { beginExecution, setExecutionStatus, finishExecution, recover } = executions;
  const { requestApproval, decideApproval } = createApprovalQueries(sql, executions, setTaskStatus);
  const { appendLog, listLogs } = createLogQueries(sql, requireTask, requireAgent);

  return {
    sql, close: () => sql.close(), createAgent, updateAgent, deleteAgent, requireAgent, createTask,
    requireTask, listQueued, beginExecution, setExecutionStatus, finishExecution, finishTask, recover,
    requestApproval, decideApproval, appendLog, listLogs,
    snapshot: (externalSessions: readonly ExternalSession[] = []) => buildOfficeSnapshot(sql, externalSessions),
  };
}

export type OfficeDb = ReturnType<typeof openOfficeDb>;
