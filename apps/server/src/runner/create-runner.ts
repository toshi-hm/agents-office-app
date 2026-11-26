import { acquireSlot, createSlotLedger, releaseSlot } from '@agents-office-app/domain';
import type { ApprovalDecision, CreateTaskInput, OfficeSseEvent, Task } from '@agents-office-app/domain';
import { OfficeError, type OfficeDb } from '../db.ts';
import { runCliExecution } from './run-cli.ts';
import { runDemoExecution } from './run-demo.ts';
import { stopTask } from './stop-task.ts';
import type { ExecutionResult, Run, RunContext } from './types.ts';

export function createRunner(
  db: OfficeDb,
  publish: (event: OfficeSseEvent) => void,
  changed: () => void,
  demoStepMs = 450,
) {
  let ledger = createSlotLedger();
  const running = new Map<string, Run>();
  let stopAllCalls = 0;
  let closing = false;

  const context: RunContext = {
    db,
    publish,
    changed,
    log(execution, stream, text) {
      if (text) publish({ type: 'log', log: db.appendLog(execution, stream, text) });
    },
  };

  async function execute(run: Run, task: Task) {
    const { execution, abort } = run;
    let result: ExecutionResult;
    try {
      abort.signal.throwIfAborted();
      result = execution.provider === 'demo'
        ? await runDemoExecution(run, task, context, demoStepMs)
        : await runCliExecution(run, task, context);
    } catch (error) {
      const summary = error instanceof Error ? error.message : String(error);
      if (!abort.signal.aborted) context.log(execution, 'system', summary + '\n');
      result = { status: 'failed', summary, exitCode: null };
    }
    if (abort.signal.aborted) result = { ...result, status: 'cancelled', summary: null };
    const finished = db.finishExecution(execution, result.status, result.summary, result.exitCode);
    running.delete(task.id);
    ledger = releaseSlot(ledger, execution.id);
    for (const approval of finished.approvals) publish({ type: 'approval_decided', approval });
    publish({ type: 'task_finished', task: finished.task });
    changed();
    dispatch();
  }

  function dispatch() {
    if (closing || stopAllCalls > 0) return;
    for (const task of db.listQueued()) {
      const executionId = crypto.randomUUID();
      const claimed = acquireSlot(ledger, { executionId, agentId: task.agentId, taskId: task.id });
      if (!claimed.ok) {
        if (claimed.code === 'no_free_slot') break;
        continue;
      }
      const execution = db.beginExecution(executionId, task, claimed.slotNo);
      ledger = claimed.ledger;
      const run: Run = {
        execution,
        abort: new AbortController(),
        done: Promise.resolve().then(() => execute(run, task)),
      };
      running.set(task.id, run);
      changed();
    }
  }

  function enqueue(inputs: readonly CreateTaskInput[]) {
    if (closing) throw new OfficeError(409, 'Server is shutting down');
    const tasks = db.sql.transaction(() => inputs.map(db.createTask))();
    if (tasks.length) changed();
    dispatch();
    return tasks;
  }

  const stop = (id: string) => stopTask(id, running, context, dispatch);

  async function stopAll() {
    stopAllCalls++;
    try {
      const ids = [...db.listQueued().map((task) => task.id), ...running.keys()];
      await Promise.all(ids.map(stop));
    } finally {
      stopAllCalls--;
      dispatch();
    }
  }

  function decide(id: string, decision: ApprovalDecision) {
    const approval = db.decideApproval(id, decision);
    running.get(approval.taskId)?.resolveApproval?.(decision);
    publish({ type: 'approval_decided', approval });
    changed();
    return approval;
  }

  db.recover();
  return {
    dispatch, enqueue, stop, stopAll, decide,
    managedPids: () => new Set(Array.from(running.values()).flatMap(({ child }) => child ? [child.pid] : [])),
    async close() {
      closing = true;
      await Promise.all([...running.keys()].map(stop));
    },
  };
}
