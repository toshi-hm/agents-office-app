import type { Database } from 'bun:sqlite';
import type { ApprovalDecision, ApprovalRequest, Execution, Task } from '@agents-office-app/domain';
import { OfficeError, now } from './error.ts';
import type { createExecutionQueries } from './executions.ts';

export function createApprovalQueries(
  sql: Database,
  { getExecution, setExecutionStatus }: Pick<ReturnType<typeof createExecutionQueries>, 'getExecution' | 'setExecutionStatus'>,
  setTaskStatus: (id: string, status: Task['status']) => void,
) {
  const getApproval = (id: string) => sql.query<ApprovalRequest, [string]>('SELECT * FROM approvals WHERE id = ?').get(id);

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

  return { requestApproval, decideApproval };
}
