import { TASK_STATUS_LABELS } from '@agents-office-app/domain';
import type { TaskStatus } from '@agents-office-app/domain';

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className="chip" data-status={status}>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
