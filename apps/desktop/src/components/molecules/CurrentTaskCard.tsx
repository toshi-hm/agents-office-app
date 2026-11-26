import type { ExecutionLog, Task } from '@agents-office-app/domain';
import { getTaskLogs } from '../../lib/view/log-segments.ts';
import { isTaskActive } from '../../lib/view/task-helpers.ts';
import type { OfficeActions } from '../actions.ts';
import { LogView } from './LogView.tsx';
import { TaskSummary } from './TaskSummary.tsx';

/** The agent's live task, or the latest one, with its output. */
export function CurrentTaskCard({
  task,
  queuedCount,
  logs,
  actions,
}: {
  task: Task | null;
  queuedCount: number;
  logs: readonly ExecutionLog[];
  actions: OfficeActions;
}) {
  return (
    <section className="card">
      <h3 className="section-title">
        {task && isTaskActive(task.status) ? '進行中の仕事' : '直近の仕事'}
      </h3>
      {task ? (
        <>
          <TaskSummary task={task} queuedCount={queuedCount} actions={actions} />
          {task.errorMessage && <p className="notice notice--error">{task.errorMessage}</p>}
          {task.resultSummary && <p className="notice">{task.resultSummary}</p>}
          <LogView key={task.id} logs={getTaskLogs(logs, task.id)} />
        </>
      ) : (
        <p className="empty">まだ仕事はありません</p>
      )}
    </section>
  );
}
