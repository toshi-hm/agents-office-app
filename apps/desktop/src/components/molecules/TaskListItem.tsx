import { Square } from 'lucide-react';
import type { Task } from '@agents-office-app/domain';
import { formatRelativeTime } from '../../lib/view/format-utils.ts';
import { isTaskActive } from '../../lib/view/task-helpers.ts';
import type { OfficeActions } from '../actions.ts';
import { IconButton } from '../atoms/IconButton.tsx';
import { TaskStatusBadge } from '../atoms/TaskStatusBadge.tsx';

export function TaskListItem({
  task,
  agentName,
  selected,
  actions,
}: {
  task: Task;
  agentName: string;
  selected: boolean;
  actions: OfficeActions;
}) {
  return (
    <li className="task-item">
      <button
        type="button"
        className="row task-row"
        aria-current={selected}
        onClick={() => actions.select(task.agentId)}
      >
        <span className="row__main">
          <span className="row__title">{task.title}</span>
          <span className="row__meta">
            <TaskStatusBadge status={task.status} />
            {agentName}・{formatRelativeTime(task.createdAt)}
          </span>
        </span>
      </button>
      {isTaskActive(task.status) && (
        <IconButton
          className="task-item__stop"
          aria-label={`「${task.title}」を停止`}
          title="停止"
          disabled={actions.isBusy(`stop:${task.id}`)}
          onClick={() => actions.stopTask(task.id)}
        >
          <Square size={12} aria-hidden="true" />
        </IconButton>
      )}
    </li>
  );
}
