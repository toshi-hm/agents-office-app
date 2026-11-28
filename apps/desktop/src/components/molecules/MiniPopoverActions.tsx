import { Check } from 'lucide-react';
import type { ApprovalRequest, Task } from '@agents-office-app/domain';
import type { OfficeActions } from '../actions.ts';

/** What can be done about the selected agent without leaving the mini office. */
export function MiniPopoverActions({
  approval,
  activeTask,
  actions,
  onExpand,
}: {
  approval: ApprovalRequest | undefined;
  activeTask: Task | null;
  actions: OfficeActions;
  onExpand: () => void;
}) {
  return (
    <div className="mini-popover__actions">
      <button type="button" className="link" onClick={onExpand}>
        詳細を開く
      </button>
      {activeTask && (
        <button
          type="button"
          className="button button--danger-quiet"
          disabled={actions.isBusy(`stop:${activeTask.id}`)}
          onClick={() => actions.stopTask(activeTask.id)}
        >
          停止
        </button>
      )}
      {approval && (
        <>
          <button
            type="button"
            className="button button--deny"
            disabled={actions.isBusy(`approval:${approval.id}`)}
            onClick={() => actions.decide(approval.id, 'deny')}
          >
            却下
          </button>
          <button
            type="button"
            className="button button--allow"
            disabled={actions.isBusy(`approval:${approval.id}`)}
            onClick={() => actions.decide(approval.id, 'allow')}
          >
            <Check size={13} aria-hidden="true" />
            許可
          </button>
        </>
      )}
    </div>
  );
}
