import { useState } from 'react';
import type { OfficeSnapshot } from '@agents-office-app/domain';
import { filterTasks } from '../../lib/view/task-helpers.ts';
import type { TaskFilter } from '../../lib/view/task-helpers.ts';
import type { OfficeActions } from '../actions.ts';
import { TaskFilterBar } from '../molecules/TaskFilterBar.tsx';
import { TaskListItem } from '../molecules/TaskListItem.tsx';

export function TaskListPanel({
  snapshot,
  selectedId,
  actions,
}: {
  snapshot: OfficeSnapshot;
  selectedId: string | null;
  actions: OfficeActions;
}) {
  const [filter, setFilter] = useState<TaskFilter>('all');
  const tasks = filterTasks(snapshot.tasks, filter);
  const names = new Map(snapshot.agents.map((agent) => [agent.id, agent.displayName]));
  return (
    <>
      <TaskFilterBar filter={filter} onChange={setFilter} />
      {tasks.length === 0 ? (
        <p className="empty">該当する仕事はありません</p>
      ) : (
        <ul className="list">
          {tasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              agentName={names.get(task.agentId) ?? '退職した社員'}
              selected={selectedId === task.agentId}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </>
  );
}
