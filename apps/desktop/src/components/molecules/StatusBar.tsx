import type { OfficeSnapshot } from '@agents-office-app/domain';
import type { ConnectionState } from '../../lib/api/store-state.ts';
import { CONNECTION_LABELS } from '../../lib/view/connection-labels.ts';
import { countByActivity, getPendingApprovals } from '../../lib/view/summaries.ts';

/** Floating summary of the connection and what the office is doing. */
export function StatusBar({
  snapshot,
  connection,
  onRetry,
}: {
  snapshot: OfficeSnapshot | null;
  connection: ConnectionState;
  onRetry: () => void;
}) {
  const counts = snapshot ? countByActivity(snapshot) : null;
  const approvals = snapshot ? getPendingApprovals(snapshot.approvals).length : 0;
  return (
    <div className="status-bar" role="status">
      <span className="status-bar__connection" data-connection={connection}>
        {CONNECTION_LABELS[connection]}
      </span>
      {counts && snapshot && (
        <>
          <span>作業中 {counts.working}</span>
          <span>順番待ち {snapshot.health.queuedTasks}</span>
          {approvals > 0 && <span data-tone="warning">承認待ち {approvals}</span>}
          {counts.error > 0 && <span data-tone="error">エラー {counts.error}</span>}
          {snapshot.health.externalSessionsCount > 0 && (
            <span>外部CLI {snapshot.health.externalSessionsCount}</span>
          )}
        </>
      )}
      {connection !== 'live' && snapshot && (
        <button type="button" className="link" onClick={onRetry}>
          再接続
        </button>
      )}
    </div>
  );
}
