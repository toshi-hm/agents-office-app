import type { OfficeSnapshot } from '@agents-office-app/domain';
import { getPendingApprovals } from '../../lib/view/summaries.ts';
import type { OfficeActions } from '../actions.ts';
import { ApprovalQueue } from '../molecules/ApprovalQueue.tsx';
import { DemoCard } from '../molecules/DemoCard.tsx';
import { OfficeStats } from '../molecules/OfficeStats.tsx';

/** Shown in the inspector while no agent is selected. */
export function OfficeOverviewPanel({
  snapshot,
  actions,
}: {
  snapshot: OfficeSnapshot;
  actions: OfficeActions;
}) {
  const approvals = getPendingApprovals(snapshot.approvals);
  return (
    <div className="inspector__scroll">
      <header className="summary">
        <h2>オフィスの様子</h2>
        <p>社員を選ぶと、仕事の依頼やログの確認ができます。</p>
        {snapshot.health.operatingState === 'degraded' && (
          <p className="notice notice--error">バックエンドが縮退運転中です。</p>
        )}
      </header>
      <OfficeStats snapshot={snapshot} pendingApprovals={approvals.length} />
      <ApprovalQueue approvals={approvals} agents={snapshot.agents} actions={actions} />
      <DemoCard actions={actions} />
    </div>
  );
}
