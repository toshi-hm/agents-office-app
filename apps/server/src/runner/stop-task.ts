import { terminateChildProcess } from './terminate-child.ts';
import type { Run, RunContext } from './types.ts';

export async function stopTask(
  id: string, running: ReadonlyMap<string, Run>, { db, publish, changed }: RunContext, dispatch: () => void,
) {
  const task = db.requireTask(id);
  const run = running.get(id);
  if (!run) {
    if (task.status !== 'queued') return task;
    const cancelled = db.finishTask(id, 'cancelled', null);
    publish({ type: 'task_finished', task: cancelled });
    changed();
    dispatch();
    return cancelled;
  }
  if (!run.abort.signal.aborted) {
    db.setExecutionStatus(run.execution.id, 'stopping');
    run.abort.abort();
    changed();
    if (run.child && run.child.exitCode === null && run.child.signalCode === null) {
      await terminateChildProcess(run.child);
    }
  }
  await run.done;
  return db.requireTask(id);
}
