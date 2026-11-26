import { Check, ShieldAlert, X } from 'lucide-react';
import type { ApprovalRequest } from '@agents-office-app/domain';
import { formatRelativeTime } from '../../lib/view/format-utils.ts';
import type { OfficeActions } from '../actions.ts';

export function ApprovalCard({
  approval,
  agentName,
  actions,
}: {
  approval: ApprovalRequest;
  /** Shown as a link to the agent when the card is outside that agent's inspector. */
  agentName?: string | undefined;
  actions: OfficeActions;
}) {
  const busy = actions.isBusy(`approval:${approval.id}`);
  return (
    <article className="approval" aria-label={`承認依頼: ${approval.summary}`}>
      <header className="approval__header">
        <ShieldAlert size={15} aria-hidden="true" />
        <span className="approval__tool">{approval.toolName}</span>
        <time dateTime={approval.createdAt}>{formatRelativeTime(approval.createdAt)}</time>
      </header>
      {agentName && (
        <button type="button" className="link" onClick={() => actions.select(approval.agentId)}>
          {agentName}からの依頼
        </button>
      )}
      <p className="approval__summary">{approval.summary}</p>
      {approval.detail && <pre className="approval__detail">{approval.detail}</pre>}
      <div className="approval__actions">
        <button
          type="button"
          className="button button--deny"
          disabled={busy}
          onClick={() => actions.decide(approval.id, 'deny')}
        >
          <X size={14} aria-hidden="true" />
          却下
        </button>
        <button
          type="button"
          className="button button--allow"
          disabled={busy}
          onClick={() => actions.decide(approval.id, 'allow')}
        >
          <Check size={14} aria-hidden="true" />
          許可
        </button>
      </div>
    </article>
  );
}
