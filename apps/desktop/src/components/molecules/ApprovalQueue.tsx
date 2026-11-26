import { ShieldAlert } from 'lucide-react';
import type { Agent, ApprovalRequest } from '@agents-office-app/domain';
import type { OfficeActions } from '../actions.ts';
import { ApprovalCard } from './ApprovalCard.tsx';

/** Every pending approval in the office, oldest first. */
export function ApprovalQueue({
  approvals,
  agents,
  actions,
}: {
  approvals: readonly ApprovalRequest[];
  agents: readonly Agent[];
  actions: OfficeActions;
}) {
  const names = new Map(agents.map((agent) => [agent.id, agent.displayName]));
  return (
    <section>
      <h3 className="section-title">
        <ShieldAlert size={13} aria-hidden="true" />
        承認の順番待ち
      </h3>
      {approvals.length === 0 ? (
        <p className="empty">承認待ちはありません</p>
      ) : (
        approvals.map((approval) => (
          <ApprovalCard
            key={approval.id}
            approval={approval}
            agentName={names.get(approval.agentId) ?? '社員'}
            actions={actions}
          />
        ))
      )}
    </section>
  );
}
