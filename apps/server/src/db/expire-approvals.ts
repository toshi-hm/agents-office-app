import type { Database } from 'bun:sqlite';
import type { ApprovalRequest } from '@agents-office-app/domain';

export function expireApprovals(sql: Database, executionId: string, timestamp: string) {
  return sql.query<ApprovalRequest, [string, string]>(`UPDATE approvals SET status = 'expired',
    decidedAt = ? WHERE executionId = ? AND status = 'pending' RETURNING *`).all(timestamp, executionId);
}
