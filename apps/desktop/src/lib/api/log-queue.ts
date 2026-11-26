import type { ExecutionLog } from '@agents-office-app/domain';
import { createCoalescedTask } from './timers.ts';
import type { Timers } from './timers.ts';

const LOG_FLUSH_MS = 60;

/** Chatty CLIs emit many lines per second; render them in small batches. */
export function createLogQueue(timers: Timers, onFlush: (batch: ExecutionLog[]) => void) {
  let pending: ExecutionLog[] = [];
  const flush = createCoalescedTask(timers, LOG_FLUSH_MS, () => {
    const batch = pending;
    pending = [];
    onFlush(batch);
  });
  return {
    push(log: ExecutionLog) {
      pending.push(log);
      flush.schedule();
    },
    cancel() {
      flush.cancel();
      pending = [];
    },
  };
}
