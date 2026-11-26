import type { OfficeSnapshot } from '@agents-office-app/domain';
import { countByActivity } from '../../lib/view/summaries.ts';

export function OfficeStats({
  snapshot,
  pendingApprovals,
}: {
  snapshot: OfficeSnapshot;
  pendingApprovals: number;
}) {
  const counts = countByActivity(snapshot);
  return (
    <dl className="stats">
      <div>
        <dt>作業中</dt>
        <dd>{counts.working}</dd>
      </div>
      <div>
        <dt>順番待ち</dt>
        <dd>{snapshot.health.queuedTasks}</dd>
      </div>
      <div data-alert={pendingApprovals > 0}>
        <dt>承認待ち</dt>
        <dd>{pendingApprovals}</dd>
      </div>
      <div>
        <dt>外部CLI</dt>
        <dd>{snapshot.health.externalSessionsCount}</dd>
      </div>
    </dl>
  );
}
