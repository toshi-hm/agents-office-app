import { Square } from 'lucide-react';
import type { Task } from '@agents-office-app/domain';
import { isTaskActive } from '../../lib/view/task-helpers.ts';
import type { OfficeActions } from '../actions.ts';
import { ProviderBadge } from '../atoms/ProviderBadge.tsx';
import { TaskStatusBadge } from '../atoms/TaskStatusBadge.tsx';

export function TaskSummary({
  task,
  queuedCount,
  actions,
}: {
  task: Task;
  queuedCount: number;
  actions: OfficeActions;
}) {
  return (
    <div className="current-task">
      <div>
        <p className="current-task__title">{task.title}</p>
        <p className="row__meta">
          <TaskStatusBadge status={task.status} />
          <ProviderBadge provider={task.provider} />
          {queuedCount > 0 && task.status !== 'queued' && `ほか順番待ち ${queuedCount}`}
        </p>
      </div>
      {isTaskActive(task.status) && (
        <button
          type="button"
          className="button button--danger-quiet"
          disabled={actions.isBusy(`stop:${task.id}`)}
          onClick={() => actions.stopTask(task.id)}
        >
          <Square size={12} aria-hidden="true" />
          停止
        </button>
      )}
    </div>
  );
}
