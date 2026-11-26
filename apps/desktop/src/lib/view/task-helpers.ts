import type { Task, TaskStatus } from '@agents-office-app/domain';

const ACTIVE_TASK_ORDER: Partial<Record<TaskStatus, number>> = {
  running: 0,
  waiting_approval: 1,
  queued: 2,
};

export function isTaskActive(status: TaskStatus): boolean {
  return ACTIVE_TASK_ORDER[status] !== undefined;
}

/** The task the inspector shows: live work first, otherwise the most recently touched one. */
export function getCurrentTask(tasks: readonly Task[], agentId: string): Task | null {
  const mine = tasks.filter((task) => task.agentId === agentId);
  const active = mine
    .filter((task) => isTaskActive(task.status))
    .sort(
      (a, b) =>
        ACTIVE_TASK_ORDER[a.status]! - ACTIVE_TASK_ORDER[b.status]! ||
        a.createdAt.localeCompare(b.createdAt),
    );
  if (active[0]) return active[0];
  return [...mine].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export type TaskFilter = 'all' | 'active' | 'finished';

export function filterTasks(tasks: readonly Task[], filter: TaskFilter): readonly Task[] {
  return tasks
    .filter(
      (task) => filter === 'all' || isTaskActive(task.status) === (filter === 'active'),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
